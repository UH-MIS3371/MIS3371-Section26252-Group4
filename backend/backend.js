const { randomUUID } = require("crypto");

const ROOMS = {
  "library-201": 6,
  "library-202": 6
};

const DURATIONS = [30, 60, 90, 120];
const reservations = [];

function timeToMinutes(time) {
  if (typeof time !== "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return NaN;
  }

  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(minutes) {
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mins = String(minutes % 60).padStart(2, "0");
  return `${hours}:${mins}`;
}

function validDate(value) {
  if (typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(value + "T00:00:00Z");

  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}

function rejectReservation(reason) {
  return {
    success: false,
    status: "Rejected",
    reason: reason,
    rejection_reason: reason,
    rejected_at: new Date().toISOString(),
    persisted: false
  };
}

function hasConflict(room, date, start, end) {
  return reservations.some(record =>
    record.room_id === room &&
    record.reservation_date === date &&
    record.status === "Confirmed" &&
    start < timeToMinutes(record.end_time) &&
    end > timeToMinutes(record.start_time)
  );
}

function processReservation(data) {
  if (!data ||
      typeof data.studentId !== "string" ||
      !data.studentId.trim() ||
      !data.room ||
      !data.reservationDate ||
      !data.startTime) {
    return rejectReservation("All required fields must be completed.");
  }

  if (!Object.hasOwn(ROOMS, data.room)) {
    return rejectReservation("Selected room is not valid.");
  }

  if (!validDate(data.reservationDate)) {
    return rejectReservation("Invalid reservation date.");
  }

  const partySize = Number(data.partySize);
  const capacity = ROOMS[data.room];

  if (!Number.isInteger(partySize) ||
      partySize < 1 ||
      partySize > capacity ||
      typeof data.partySize === "boolean") {
    return rejectReservation("Reservations require 1 to 6 attendees.");
  }

  const start = timeToMinutes(data.startTime);

  if (!Number.isFinite(start)) {
    return rejectReservation("Invalid start time.");
  }

  let duration;

  if (data.duration !== undefined) {
    duration = Number(data.duration);
  } else {
    duration = timeToMinutes(data.endTime) - start;
  }

  if (duration > 120) {
    return rejectReservation("Reservations cannot exceed two hours.");
  }

  if (!DURATIONS.includes(duration)) {
    return rejectReservation("Duration must be 30, 60, 90, or 120 minutes.");
  }

  const end = start + duration;

  if (end >= 1440) {
    return rejectReservation("Reservation must end before midnight.");
  }

  if (data.endTime !== undefined &&
      timeToMinutes(data.endTime) !== end) {
    return rejectReservation("End time and duration do not match.");
  }

  if (hasConflict(data.room, data.reservationDate, start, end)) {
    return rejectReservation(
      "Selected room is unavailable because the reservation overlaps an existing booking."
    );
  }

  const now = new Date().toISOString();

  const reservation = {
    success: true,
    reservation_id: "RSV-" + randomUUID(),
    student_id: data.studentId.trim(),
    room_id: data.room,
    reservation_date: data.reservationDate,
    start_time: data.startTime,
    end_time: formatTime(end),
    duration_minutes: duration,
    party_size: partySize,
    room_capacity: capacity,
    availability_result: true,
    status: "Confirmed",
    created_at: now,
    updated_at: now,
    confirmed_at: now,
    last_modified_by: "student:" + data.studentId.trim(),
    message: "Reservation confirmed.",
    persisted: false
  };

  reservations.push(reservation);

  return reservation;
}

function resetReservations() {
  reservations.length = 0;
}

module.exports = {
  processReservation,
  resetReservations
};
