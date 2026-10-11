"""
Data structures parsed from the UNAD Campus portal and its agenda pages.
"""

# Standard library
from __future__ import annotations
from dataclasses import dataclass


@dataclass(frozen=True)
class XajaxCommand:
    """
    Single command of an xajax JSON response.

    Attributes:
        cmd: Command type, such as ``as`` for an assignment.
        command_id: Identifier of the target element.
        prop: Property being assigned.
        data: Payload of the command.
    """

    cmd: str
    command_id: str
    prop: str
    data: str


@dataclass(frozen=True)
class CampusProfile:
    """
    User data read from the profile page of the campus.

    Attributes:
        campus_user_id: Numeric identifier of the user in the campus.
        document_type: Document type code, such as CC or TI.
        document: Document number.
        full_name: Full display name.
        first_name: First name.
        second_name: Second name.
        first_surname: First surname.
        second_surname: Second surname.
        institutional_email: UNAD institutional email.
        notification_email: Email used for notifications.
        personal_email: Personal email.
        phone: Phone number.
        birth_date: Birth date as shown by the portal.
        marital_status: Marital status.
        blood_type: Blood type.
        zone: Residential zone.
        stratum: Socio-economic stratum.
        address: Home address.
    """

    campus_user_id: int
    document_type: str
    document: str
    full_name: str
    first_name: str
    second_name: str
    first_surname: str
    second_surname: str
    institutional_email: str
    notification_email: str
    personal_email: str
    phone: str
    birth_date: str
    marital_status: str
    blood_type: str
    zone: str
    stratum: str
    address: str


@dataclass(frozen=True)
class AgendaActivity:
    """
    Activity of a course agenda.

    Attributes:
        section: Title of the section that groups the activity.
        moment: Evaluation moment, such as Inicial, Intermedio or Final.
        rac: Learning outcome of the course.
        name: Activity name.
        description: Activity description.
        activity_type: Activity type, such as Independiente or Laboratorio.
        weight: Evaluative weight in points.
        start_raw: Start date as written in the agenda.
        end_raw: End date as written in the agenda.
        starts_at: Start as ``YYYY-MM-DDTHH:MM``, or empty when it cannot be read.
        ends_at: End as ``YYYY-MM-DDTHH:MM``, or empty when it cannot be read.
        alert: Closing alert text.
        feedback: Feedback delivery date range.
    """

    section: str
    moment: str
    rac: str
    name: str
    description: str
    activity_type: str
    weight: str
    start_raw: str
    end_raw: str
    starts_at: str
    ends_at: str
    alert: str
    feedback: str


@dataclass(frozen=True)
class CourseAgenda:
    """
    Parsed agenda page of a course.

    Attributes:
        code: Numeric agenda code, such as 212014.
        name: Course name.
        credits: Credits text of the course.
        period: Academic period.
        activities: Activities in page order.
    """

    code: str
    name: str
    credits: str
    period: str
    activities: list[AgendaActivity]
