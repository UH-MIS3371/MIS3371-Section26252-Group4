import json
import uuid
from decimal import Decimal
from datetime import date, datetime, timezone

import boto3
from boto3.dynamodb.conditions import Attr

TABLE = boto3.resource("dynamodb").Table("StudyRoomReservations")
ROOMS = {"library-201": 6, "library-202": 6}
DURATIONS = {30, 60, 90, 120}


def json_number(value):
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    raise TypeError(f"Unsupported value: {type(value).__name__}")


def reply(code, data):
    return {
        "statusCode": code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(data, default=json_number),
    }


def minutes(value):
    if not isinstance(value, str):
        raise ValueError("Start time must use HH:MM format.")
    try:
        parsed = datetime.strptime(value, "%H:%M")
    except ValueError:
        raise ValueError("Start time must use HH:MM format.")
    if parsed.strftime("%H:%M") != value:
        raise ValueError("Start time must use HH:MM format.")
    return parsed.hour * 60 + parsed.minute


def saved_conflict(room_id, day, start, end):
    filters = (Attr("room_id").eq(room_id) &
               Attr("reservation_date").eq(day) &
               Attr("status").eq("Confirmed"))
    options = {"FilterExpression": filters, "ConsistentRead": True}
    while True:
        page = TABLE.scan(**options)
        for old in page.get("Items", []):
            if start < minutes(old["end_time"]) and end > minutes(old["start_time"]):
                return True
        if "LastEvaluatedKey" not in page:
            break
        options["ExclusiveStartKey"] = page["LastEvaluatedKey"]
    return False


def lambda_handler(event, context):
    try:
        method = (event.get("requestContext", {}).get("http", {}).get("method")
                  or event.get("httpMethod") or "POST").upper()

        if method == "GET":
            params = event.get("queryStringParameters") or {}
            reservation_id = (params.get("reservation_id") or "").strip()
            if not reservation_id:
                return reply(400, {"message": "reservation_id is required."})
            item = TABLE.get_item(Key={"reservation_id": reservation_id}).get("Item")
            if not item:
                return reply(404, {"message": "Reservation not found."})
            return reply(200, item)

        if method != "POST":
            return reply(405, {"message": "Method not allowed."})

        data = event.get("body", event)
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except json.JSONDecodeError:
                return reply(400, {"status": "ValidationError", "message": "Invalid JSON."})
        if not isinstance(data, dict):
            return reply(400, {"status": "ValidationError", "message": "Request must be an object."})

        if data.get("action") == "lookup":
            reservation_id = str(data.get("reservation_id") or "").strip()
            if not reservation_id:
                return reply(400, {"message": "reservation_id is required."})
            item = TABLE.get_item(Key={"reservation_id": reservation_id}).get("Item")
            if not item:
                return reply(404, {"message": "Reservation not found."})
            return reply(200, item)

        student_id = data.get("studentId")
        room_id = data.get("room")
        day = data.get("reservationDate")
        start_time = data.get("startTime")
        duration = data.get("duration")
        party_size = data.get("partySize")

        try:
            if not isinstance(student_id, str) or not student_id.strip():
                raise ValueError("Student ID is required.")
            if not isinstance(room_id, str) or not room_id.strip():
                raise ValueError("Room selection is required.")
            if not isinstance(day, str) or not day:
                raise ValueError("Reservation date is required.")
            if date.fromisoformat(day).isoformat() != day:
                raise ValueError("Invalid reservation date.")
            start = minutes(start_time)
            if isinstance(duration, bool) or not str(duration).isdigit():
                raise ValueError("Duration must be a positive whole number.")
            if isinstance(party_size, bool) or not str(party_size).isdigit():
                raise ValueError("Attendees must be a positive whole number.")
            duration, party_size = int(duration), int(party_size)
            if duration not in DURATIONS:
                raise ValueError("Duration must be 30, 60, 90, or 120 minutes.")
            if party_size < 1:
                raise ValueError("At least one attendee is required.")
        except (ValueError, TypeError) as exc:
            return reply(400, {"status": "ValidationError", "message": str(exc)})

        end = start + duration
        now = datetime.now(timezone.utc).isoformat()
        item = {
            "reservation_id": "RSV-" + uuid.uuid4().hex[:10].upper(),
            "student_id": student_id.strip(),
            "room_id": room_id,
            "reservation_date": day,
            "start_time": start_time,
            "end_time": f"{end // 60:02d}:{end % 60:02d}" if end < 1440 else "",
            "duration_minutes": duration,
            "party_size": party_size,
            "created_at": now,
            "updated_at": now,
            "last_modified_by": "student:" + student_id.strip(),
            "status": "Submitted",
        }

        reason = None
        if room_id not in ROOMS:
            reason = "Selected room is not valid."
        else:
            item["room_capacity"] = ROOMS[room_id]
            if party_size > ROOMS[room_id]:
                reason = f"This group exceeds the study room capacity of {ROOMS[room_id]}."
            elif end >= 1440:
                reason = "Reservation must end before midnight."
            elif saved_conflict(room_id, day, start, end):
                reason = "Selected room is unavailable: the requested time overlaps an existing reservation."

        decided_at = datetime.now(timezone.utc).isoformat()
        item["updated_at"] = decided_at
        if reason:
            item.update({
                "status": "Rejected", "availability_result": False,
                "rejection_reason": reason, "rejected_at": decided_at,
                "message": reason,
            })
        else:
            item.update({
                "status": "Confirmed", "availability_result": True,
                "confirmed_at": decided_at, "message": "Reservation confirmed.",
            })

        TABLE.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(reservation_id)",
        )
        return reply(200, item)

    except Exception as exc:
        print("Reservation processing error:", repr(exc))
        return reply(500, {"message": "Could not save or retrieve the reservation."})
