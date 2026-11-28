const STUDY_ROOM_CAPACITY = 6;
const MAX_DURATION_MINUTES = 120;

function timeToMinutes(time) {
  if (typeof time !== "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return NaN;
  }

  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function rejectReservation(reason) {
  return {
    success: false,
    status: "Rejected",
    reason: reason
  };
}

function processReservation(data) {
  if (!data || !data.studentId || !data.room ||
      !data.reservationDate || !data.startTime ||
      !data.endTime) {
    return rejectReservation("All required fields must be completed.");
  }

  const partySize = Number(data.partySize);

  if (!Number.isInteger(partySize) ||
      partySize < 1 ||
      partySize > STUDY_ROOM_CAPACITY) {
    return rejectReservation("Reservations require 1 to 6 attendees.");
  }

  const start = timeToMinutes(data.startTime);
  const end = timeToMinutes(data.endTime);

  if (!Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end <= start) {
    return rejectReservation("End time must be after start time.");
  }

  const duration = end - start;

  if (duration > MAX_DURATION_MINUTES) {
    return rejectReservation("Reservations cannot exceed two hours.");
  }

  return {
    success: true,
    status: "Confirmed",
    reservationId: "RSV-" + require("crypto").randomUUID(),
    studentId: data.studentId,
    room: data.room,
    reservationDate: data.reservationDate,
    startTime: data.startTime,
    endTime: data.endTime,
    partySize: partySize,
    duration: duration,
    createdAt: new Date().toISOString(),
    persisted: false
  };
}

module.exports = { processReservation };
