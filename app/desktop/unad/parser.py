"""
Parsers for the UNAD Campus profile page and the course agenda pages.
"""

# Standard library
from __future__ import annotations
import re
from typing import Final

# Third-party
from bs4 import BeautifulSoup, Tag

# Project imports
from desktop.unad.schemas import AgendaActivity, CampusProfile, CourseAgenda

AGENDA_URL_PATTERN: Final[re.Pattern[str]] = re.compile(
    r"^https://[a-z0-9.-]+\.unad\.edu\.co/.+/([0-9]+)\.htm$", re.IGNORECASE
)
_ACTIVITY_COLUMNS: Final[int] = 10
_MONTHS: Final[dict[str, int]] = {
    "ENE": 1, "FEB": 2, "MAR": 3, "ABR": 4, "MAY": 5, "JUN": 6,
    "JUL": 7, "AGO": 8, "SEP": 9, "SET": 9, "OCT": 10, "NOV": 11, "DIC": 12,
}
_DATE_PATTERN: Final[re.Pattern[str]] = re.compile(
    r"(\d{1,2})/([A-Za-z]{3}|\d{1,2})/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?"
)
_CREDITS_PATTERN: Final[re.Pattern[str]] = re.compile(
    r"\s+\([^)]+\)\s*-\s*[0-9]+\s+de\s+[0-9]+\s+cr[ée]ditos?$"
)


def extract_agenda_code(url: str) -> str | None:
    """Return the numeric code of an agenda URL hosted by UNAD, or None when it is not one."""
    match: re.Match[str] | None = AGENDA_URL_PATTERN.match(url.strip())
    return match.group(1) if match else None


def parse_agenda_date(text: str) -> str:
    """
    Convert an agenda date such as ``17/AGO/2026 00:00`` to ``YYYY-MM-DDTHH:MM``.

    Returns:
        The normalized date, or an empty string when the text has no date.
    """
    match: re.Match[str] | None = _DATE_PATTERN.search(text or "")
    if match is None:
        return ""
    day, month_text, year, hour, minute = match.groups()
    month: int | None = (
        int(month_text) if month_text.isdigit() else _MONTHS.get(month_text.upper())
    )
    if month is None or not 1 <= month <= 12 or not 1 <= int(day) <= 31:
        return ""
    return f"{int(year):04d}-{month:02d}-{int(day):02d}T{int(hour or 0):02d}:{minute or '00'}"


def _input_value(soup: BeautifulSoup, selector: str) -> str:
    """Return the value attribute of an input, or an empty string when missing."""
    element: Tag | None = soup.select_one(selector)
    if element is None or not element.get("value"):
        return ""
    return str(element["value"]).strip()


def _selected_option(soup: BeautifulSoup, selector: str) -> str:
    """Return the text of the selected option of a select, or an empty string."""
    select: Tag | None = soup.select_one(selector)
    option: Tag | None = select.find("option", selected=True) if select is not None else None
    return option.get_text(strip=True) if option is not None else ""


def parse_profile(html: bytes | str) -> CampusProfile:
    """
    Extract the user data from the profile page.

    Raises:
        ValueError: When the page does not contain the profile form.
    """
    soup: BeautifulSoup = BeautifulSoup(html, "html.parser")
    user_id: str = _input_value(soup, "input#unad11id")
    if not user_id.isdigit() or int(user_id) == 0:
        raise ValueError("profile form not found")
    return CampusProfile(
        campus_user_id=int(user_id),
        document_type=_input_value(soup, "input#unad11tipodoc"),
        document=_input_value(soup, "input#unad11doc"),
        full_name=_input_value(soup, "input#unad11razonsocial"),
        first_name=_input_value(soup, "input#unad11nombre1"),
        second_name=_input_value(soup, "input#unad11nombre2"),
        first_surname=_input_value(soup, "input#unad11apellido1"),
        second_surname=_input_value(soup, "input#unad11apellido2"),
        institutional_email=_input_value(soup, "input#unad11correoinstitucional"),
        notification_email=_input_value(soup, "input#unad11correonotifica"),
        personal_email=_input_value(soup, "input#unad11correo"),
        phone=_input_value(soup, "input#unad11telefono"),
        birth_date=_input_value(soup, "input#unad11fechanace"),
        marital_status=_selected_option(soup, "select#unad11ecivil"),
        blood_type=_selected_option(soup, "select#unad11rh"),
        zone=_selected_option(soup, "select#unad01zonares"),
        stratum=_input_value(soup, "input#unad01estrato"),
        address=_input_value(soup, "input#unad11direccion"),
    )


def _parse_header(soup: BeautifulSoup, code: str) -> tuple[str, str, str]:
    """
    Extract the course name, credits text and period from the agenda header.

    Raises:
        ValueError: When the header is missing.
    """
    name: str = ""
    credits: str = ""
    period: str = ""
    paragraphs: list[Tag] = soup.select("div.agenda__nombre p")
    if paragraphs:
        header: str = paragraphs[0].get_text(strip=True)
        match: re.Match[str] | None = _CREDITS_PATTERN.search(header)
        name = header[: match.start()].strip() if match else header
        credits = match.group(0).strip() if match else ""
        if len(paragraphs) > 1:
            period = paragraphs[1].get_text(strip=True)
    if not name:
        title: Tag | None = soup.select_one("title")
        if title is not None:
            name = title.get_text(strip=True).replace("Agenda - ", "").replace(f"{code} - ", "")
    if not name and not period:
        raise ValueError("agenda header not found")
    return name, credits, period


def _section_header(row: Tag) -> Tag | None:
    """Return the header cell that opens a section, identified by its colspan."""
    for header in row.find_all("th", recursive=False):
        if header.get("colspan"):
            return header
    return None


def _row_values(cells: list[Tag], pending: dict[int, list[str | int]]) -> list[str]:
    """
    Collect the values of a row, repeating cells that span several rows.

    Args:
        cells: Data cells of the row.
        pending: Values still spanning from previous rows, keyed by column.
    """
    values: list[str] = []
    column: int = 0
    cell_index: int = 0
    while cell_index < len(cells) or column in pending:
        if column in pending:
            values.append(str(pending[column][0]))
            remaining: int = int(pending[column][1]) - 1
            if remaining <= 0:
                del pending[column]
            else:
                pending[column][1] = remaining
        else:
            cell: Tag = cells[cell_index]
            cell_index += 1
            value: str = cell.get_text(" ", strip=True)
            values.append(value)
            rowspan: str = str(cell.get("rowspan") or "")
            if rowspan.isdigit() and int(rowspan) > 1:
                pending[column] = [value, int(rowspan) - 1]
        column += 1
    return values


def parse_agenda(html: bytes | str, code: str) -> CourseAgenda:
    """
    Parse an agenda page into its course data and activities.

    Args:
        html: Raw page; bytes let the parser honor the page's own encoding.
        code: Agenda code.

    Raises:
        ValueError: When the page is not an agenda.
    """
    soup: BeautifulSoup = BeautifulSoup(html, "html.parser")
    name, credits, period = _parse_header(soup, code)
    activities: list[AgendaActivity] = []
    section: str = ""
    pending: dict[int, list[str | int]] = {}
    for row in soup.select("table tr"):
        header: Tag | None = _section_header(row)
        if header is not None:
            section = header.get_text(strip=True)
            pending = {}
            continue
        cells: list[Tag] = row.find_all("td", recursive=False)
        if not cells:
            continue
        values: list[str] = (_row_values(cells, pending) + [""] * _ACTIVITY_COLUMNS)[
            :_ACTIVITY_COLUMNS
        ]
        if not values[2]:
            continue
        activities.append(
            AgendaActivity(
                section=section,
                moment=values[0],
                rac=values[1],
                name=values[2],
                description=values[3],
                activity_type=values[4],
                weight=values[5],
                start_raw=values[6],
                end_raw=values[7],
                starts_at=parse_agenda_date(values[6]),
                ends_at=parse_agenda_date(values[7]),
                alert=values[8],
                feedback=values[9],
            )
        )
    return CourseAgenda(code=code, name=name, credits=credits, period=period, activities=activities)
