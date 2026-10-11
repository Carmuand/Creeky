"""
HTTP client for the UNAD Campus portal.

Keeps a persistent session, performs the xajax login flow and downloads
the profile page and the agenda pages.
"""

# Standard library
from __future__ import annotations
import base64
import json
import time
from typing import Any, Final

# Third-party
import requests
from bs4 import BeautifulSoup, Tag

# Project imports
from desktop.unad.schemas import XajaxCommand
from desktop.utills.logger import log, Tags

BASE_URL: Final[str] = "https://campus0a.unad.edu.co/campus/"
PROFILE_PATH: Final[str] = "perfilusuario.php"
SESSION_COOKIE: Final[str] = "PHPSESSID"
REQUEST_TIMEOUT: Final[int] = 30
LOGIN_FUNCTION: Final[str] = "f17_Login_RevisaDoc"
DOCUMENT_TYPES: Final[tuple[str, ...]] = ("CC", "TI", "CE", "PA")
DEFAULT_HEADERS: Final[dict[str, str]] = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
}
_MAX_SALTOS: Final[int] = 10


class CampusUnreachable(Exception):
    """The campus could not be reached or answered with an error."""


def _xajax_body(function_name: str, args: list[Any]) -> dict[str, str]:
    """Build the form-encoded body of an xajax request."""
    return {
        "xjxfun": function_name,
        "xjxr": str(int(time.time() * 1000)),
        "xjxargs[]": json.dumps(args),
    }


def _xajax_commands(text: str) -> list[XajaxCommand]:
    """
    Parse an xajax JSON response into its commands.

    Raises:
        ValueError: When the response body is not valid JSON.
    """
    payload: Any = json.loads(text)
    items: list[Any] = payload.get("xjxobj", []) if isinstance(payload, dict) else []
    return [
        XajaxCommand(
            cmd=str(item.get("cmd", "")),
            command_id=str(item.get("id", "")),
            prop=str(item.get("prop", "")),
            data=str(item.get("data", "")),
        )
        for item in items
        if isinstance(item, dict)
    ]


def _assigned_value(commands: list[XajaxCommand], element_id: str) -> str | None:
    """Return the value an xajax response assigns to an element, when present."""
    for command in commands:
        if command.cmd == "as" and command.command_id == element_id and command.prop == "value":
            return command.data
    return None


def _input_value(soup: BeautifulSoup, selector: str) -> str:
    """Return the value attribute of an input, or an empty string when missing."""
    element: Tag | None = soup.select_one(selector)
    if element is None or not element.get("value"):
        return ""
    return str(element["value"])


class CampusClient:
    """Persistent HTTP client against the UNAD Campus portal."""

    def __init__(self) -> None:
        self._session: requests.Session = requests.Session()
        self._session.headers.update(DEFAULT_HEADERS)
        self._landing_html: str | None = None
        self.campus_user_id: int | None = None

    def close(self) -> None:
        """Release the HTTP session."""
        self._session.close()

    def _request(self, method: str, url: str, data: dict[str, str] | None = None) -> requests.Response:
        """
        Send a request, turning network failures into ``CampusUnreachable``.

        Args:
            method: HTTP method.
            url: Absolute URL.
            data: Form fields of a POST request.
        """
        try:
            response: requests.Response = self._session.request(
                method, url, data=data, timeout=REQUEST_TIMEOUT
            )
        except requests.RequestException as error:
            raise CampusUnreachable(str(error)) from error
        if response.status_code >= 500:
            raise CampusUnreachable(f"status {response.status_code}")
        return response

    def _follow_saltos(self) -> None:
        """
        Follow the intermediate pages until the login form is served.

        The landing page posts a ``base`` value with an incrementing
        ``saltos`` counter; repeating the post eventually serves the form.
        """
        if self._landing_html is None:
            return
        soup: BeautifulSoup = BeautifulSoup(self._landing_html, "html.parser")
        base: str = _input_value(soup, "input#base")
        saltos: str = _input_value(soup, "input#saltos") or "1"
        for index in range(_MAX_SALTOS):
            data: dict[str, str] = (
                {"base": base, "saltos": saltos} if index == 0 else {"saltos": saltos}
            )
            response: requests.Response = self._request("POST", BASE_URL, data)
            if "frmedita" in response.text:
                return
            saltos = _input_value(BeautifulSoup(response.text, "html.parser"), "input#saltos")
            if not saltos:
                return

    def login(self, document_type: str, document: str, password: str) -> bool:
        """
        Authenticate the session with the portal credentials.

        Args:
            document_type: Document type code.
            document: Document number.
            password: Plain password; the portal expects it base64-encoded.

        Returns:
            Whether the portal accepted the credentials.

        Raises:
            CampusUnreachable: When the portal cannot be reached.
        """
        landing: requests.Response = self._request("GET", BASE_URL)
        self._landing_html = landing.text
        if self._session.cookies.get(SESSION_COOKIE) is None:
            raise CampusUnreachable("the campus did not open a session")
        self._follow_saltos()
        encoded: str = base64.b64encode(password.encode("utf-8")).decode("ascii")
        response: requests.Response = self._request(
            "POST", BASE_URL, _xajax_body(LOGIN_FUNCTION, [document_type, document, encoded, "0"])
        )
        try:
            commands: list[XajaxCommand] = _xajax_commands(response.text)
        except ValueError as error:
            raise CampusUnreachable("unexpected login response") from error
        user_id: str | None = _assigned_value(commands, "id11")
        if not user_id or not user_id.isdigit() or int(user_id) <= 0:
            log("WARNING", Tags.UNAD, "Campus rejected the credentials")
            return False
        self.campus_user_id = int(user_id)
        log("SUCCESS", Tags.UNAD, f"Campus login accepted for user {self.campus_user_id}")
        return True

    def fetch_profile_html(self) -> bytes:
        """Return the raw profile page of the authenticated user."""
        return self._request("GET", BASE_URL + PROFILE_PATH).content

    def fetch_agenda_html(self, url: str) -> bytes:
        """
        Return the raw HTML of an agenda page.

        Raises:
            CampusUnreachable: When the page is missing or cannot be reached.
        """
        response: requests.Response = self._request("GET", url)
        if response.status_code != 200:
            raise CampusUnreachable(f"agenda status {response.status_code}")
        return response.content
