"""
Credential storage backed by the system credential manager through keyring.

Password hashes and the active session live in the Windows Credential
Manager, never in the database.
"""

# Standard library
from __future__ import annotations
import hashlib
import hmac
import secrets

# Third-party
import keyring
from keyring.errors import KeyringError, PasswordDeleteError

# Project imports
from desktop.config import config
from desktop.core.errors import ApiError
from desktop.utills.logger import log, Tags

_ALGORITHM: str = "pbkdf2_sha256"
_ITERATIONS: int = 240_000
_SALT_BYTES: int = 16
_SESSION_ENTRY: str = "session"


def _password_entry(user_id: str) -> str:
    """Return the credential entry name that stores a user's password hash."""
    return f"password:{user_id}"


def hash_password(password: str) -> str:
    """Return a salted PBKDF2 hash encoded as ``algorithm$iterations$salt$hash``."""
    salt: bytes = secrets.token_bytes(_SALT_BYTES)
    digest: bytes = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _ITERATIONS)
    return f"{_ALGORITHM}${_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    """Return whether a password matches a hash produced by ``hash_password``."""
    try:
        algorithm, iterations, salt_hex, digest_hex = encoded.split("$")
        if algorithm != _ALGORITHM:
            return False
        digest: bytes = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(iterations)
        )
    except ValueError:
        return False
    return hmac.compare_digest(digest, bytes.fromhex(digest_hex))


def _write(entry: str, value: str) -> None:
    """Store a value in the credential manager."""
    try:
        keyring.set_password(config.credential_service, entry, value)
    except KeyringError as error:
        log("ERROR", Tags.AUTH, f"Credential store write failed: {error!r}")
        raise ApiError("credential_store") from error


def _read(entry: str) -> str | None:
    """Read a value from the credential manager."""
    try:
        return keyring.get_password(config.credential_service, entry)
    except KeyringError as error:
        log("ERROR", Tags.AUTH, f"Credential store read failed: {error!r}")
        raise ApiError("credential_store") from error


def _delete(entry: str) -> None:
    """Remove a value from the credential manager when it exists."""
    try:
        keyring.delete_password(config.credential_service, entry)
    except PasswordDeleteError:
        return
    except KeyringError as error:
        log("ERROR", Tags.AUTH, f"Credential store delete failed: {error!r}")
        raise ApiError("credential_store") from error


def store_password(user_id: str, password: str) -> None:
    """Hash a password and store it for the given user."""
    _write(_password_entry(user_id), hash_password(password))


def check_password(user_id: str, password: str) -> bool:
    """Return whether the password matches the hash stored for the given user."""
    encoded: str | None = _read(_password_entry(user_id))
    return encoded is not None and verify_password(password, encoded)


def delete_password(user_id: str) -> None:
    """Remove the password hash stored for the given user."""
    _delete(_password_entry(user_id))


def store_session(user_id: str) -> None:
    """Persist the identifier of the signed-in user."""
    _write(_SESSION_ENTRY, user_id)


def read_session() -> str | None:
    """Return the identifier of the signed-in user, when any."""
    return _read(_SESSION_ENTRY)


def clear_session() -> None:
    """Forget the signed-in user."""
    _delete(_SESSION_ENTRY)
