"""
Encryption of backup files.

A backup is a JSON document encrypted with AES-256-GCM. The encryption key
is derived with scrypt from a recovery key generated for that backup and
shown only to the user, so the file is useless without it.
"""

# Standard library
from __future__ import annotations
import hashlib
import json
import secrets
from typing import Any

# Third-party
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# Project imports
from desktop.core.errors import ApiError

_MAGIC: bytes = b"CREEKYBK1"
_SALT_BYTES: int = 16
_NONCE_BYTES: int = 12
_KEY_ALPHABET: str = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
_KEY_GROUPS: int = 6
_KEY_GROUP_LENGTH: int = 5
_SCRYPT_N: int = 2**15
_SCRYPT_R: int = 8
_SCRYPT_P: int = 1


def generate_recovery_key() -> str:
    """Return a random recovery key such as ``ABCDE-FGHJK-...`` with about 150 bits of entropy."""
    groups: list[str] = [
        "".join(secrets.choice(_KEY_ALPHABET) for _ in range(_KEY_GROUP_LENGTH))
        for _ in range(_KEY_GROUPS)
    ]
    return "-".join(groups)


def _normalize_key(recovery_key: str) -> bytes:
    """Return the recovery key without separators, spaces or case differences."""
    return "".join(ch for ch in recovery_key.upper() if ch in _KEY_ALPHABET).encode("ascii")


def _derive_key(recovery_key: str, salt: bytes) -> bytes:
    """Derive the 256-bit encryption key from a recovery key."""
    return hashlib.scrypt(
        _normalize_key(recovery_key),
        salt=salt,
        n=_SCRYPT_N,
        r=_SCRYPT_R,
        p=_SCRYPT_P,
        maxmem=64 * 1024 * 1024,
        dklen=32,
    )


def encrypt_backup(data: dict[str, Any], recovery_key: str) -> bytes:
    """
    Encrypt a backup document.

    Args:
        data: JSON-serializable backup.
        recovery_key: Key generated for this backup.

    Returns:
        The file contents: magic, salt, nonce and ciphertext.
    """
    salt: bytes = secrets.token_bytes(_SALT_BYTES)
    nonce: bytes = secrets.token_bytes(_NONCE_BYTES)
    plaintext: bytes = json.dumps(data, ensure_ascii=False).encode("utf-8")
    ciphertext: bytes = AESGCM(_derive_key(recovery_key, salt)).encrypt(nonce, plaintext, _MAGIC)
    return _MAGIC + salt + nonce + ciphertext


def decrypt_backup(blob: bytes, recovery_key: str) -> dict[str, Any]:
    """
    Decrypt a backup file.

    Args:
        blob: File contents produced by ``encrypt_backup``.
        recovery_key: Key the user received when the backup was exported.

    Returns:
        The backup document.
    """
    header: int = len(_MAGIC) + _SALT_BYTES + _NONCE_BYTES
    if len(blob) <= header or not blob.startswith(_MAGIC):
        raise ApiError("invalid_backup")
    if not _normalize_key(recovery_key):
        raise ApiError("invalid_backup_key")
    salt: bytes = blob[len(_MAGIC) : len(_MAGIC) + _SALT_BYTES]
    nonce: bytes = blob[len(_MAGIC) + _SALT_BYTES : header]
    try:
        plaintext: bytes = AESGCM(_derive_key(recovery_key, salt)).decrypt(
            nonce, blob[header:], _MAGIC
        )
    except InvalidTag as error:
        raise ApiError("invalid_backup_key") from error
    try:
        data: Any = json.loads(plaintext.decode("utf-8"))
    except ValueError as error:
        raise ApiError("invalid_backup") from error
    if not isinstance(data, dict):
        raise ApiError("invalid_backup")
    return data
