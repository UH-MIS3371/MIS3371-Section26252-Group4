const AWS_API_URL = "https://4ceu81c65b.execute-api.us-east-1.amazonaws.com/default/StudyRoomReservation";

const IS_LOCAL = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const API_URL = IS_LOCAL ? "/api/reservations" : AWS_API_URL;

const STUDY_ROOM_CAPACITY = 6;

function fitsRoomCapacity(partySize) {
  return Number.isInteger(partySize) &&
    partySize > 0 &&
    partySize <= STUDY_ROOM_CAPACITY;
}

const form = document.querySelector("form");
const partySizeInput = document.querySelector("#partySize");
const capacityMessage = document.querySelector("#capacityMessage");
const reservationResult = document.querySelector("#reservationResult");
const submitButton = form.querySelector('button[type="submit"]');

partySizeInput.addEventListener("input", () => {
  const raw = partySizeInput.value.trim();

  if (raw === "") {
    capacityMessage.textContent = "";
    capacityMessage.className = "capacity-message";
    return;
  }

  const partySize = Number(raw);
  const roomFits = fitsRoomCapacity(partySize);

  capacityMessage.textContent = roomFits
    ? "This group fits the selected study room."
    : partySize > STUDY_ROOM_CAPACITY
      ? `This group exceeds the study room capacity of ${STUDY_ROOM_CAPACITY}.`
      : "Enter a positive whole number of attendees.";

  capacityMessage.className = roomFits
    ? "capacity-message capacity-message--success"
    : "capacity-message capacity-message--error";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const partySize = Number(partySizeInput.value);

  if (!fitsRoomCapacity(partySize)) {
    reservationResult.className = "reservation-result reservation-result--error";
    reservationResult.textContent = `Reservations require between 1 and ${STUDY_ROOM_CAPACITY} attendees.`;
    return;
  }

  const reservation = {
    studentId: document.querySelector("#studentId").value.trim(),
    room: document.querySelector("#room").value,
    reservationDate: document.querySelector("#reservationDate").value,
    startTime: document.querySelector("#startTime").value,
    endTime: document.querySelector("#endTime").value,
    partySize: IS_LOCAL ? partySize : partySizeInput.value
  };

  submitButton.disabled = true;
  reservationResult.className = "reservation-result reservation-result--pending";
  reservationResult.textContent = "Sending reservation...";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: IS_LOCAL
        ? { "Content-Type": "application/json" }
        : {},
      body: JSON.stringify(reservation)
    });

    const data = await response.json();

    if (!response.ok) {
      reservationResult.className = "reservation-result reservation-result--error";
      reservationResult.textContent = `Validation error: ${data.message || data.reason || "The request was not accepted."}`;
    } else if (data.status === "Confirmed") {
      const reservationId = data.reservation_id || data.reservationId;

      reservationResult.className = "reservation-result reservation-result--success";
      reservationResult.textContent = IS_LOCAL
        ? `Confirmed! Reservation ID: ${reservationId}. Local validation successful. Record not persisted.`
        : `Confirmed! Reservation ID: ${reservationId}. ${data.message || "Reservation confirmed."}`;
    } else if (data.status === "Rejected") {
      reservationResult.className = "reservation-result reservation-result--error";
      reservationResult.textContent = `Rejected: ${data.message || data.reason || data.rejection_reason || "Reservation not available."}`;
    } else {
      reservationResult.className = "reservation-result reservation-result--error";
      reservationResult.textContent = data.message || "Unexpected response from the reservation service.";
    }
  } catch (error) {
    console.error("API request failed:", error);
    reservationResult.className = "reservation-result reservation-result--error";
    reservationResult.textContent = "Could not connect to the reservation service.";
  } finally {
    submitButton.disabled = false;
  }
});

const lookupForm = document.querySelector("#lookupForm");
const lookupId = document.querySelector("#lookupId");
const lookupResult = document.querySelector("#lookupResult");
const lookupButton = lookupForm.querySelector('button[type="submit"]');

const roomLabels = {
  "library-201": "Library 201",
  "library-202": "Library 202"
};

lookupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (IS_LOCAL) {
    lookupResult.className = "reservation-result reservation-result--error";
    lookupResult.textContent = "Reservation retrieval requires the deployed AWS database.";
    return;
  }

  lookupButton.disabled = true;
  lookupResult.className = "reservation-result reservation-result--pending";
  lookupResult.textContent = "Looking up reservation...";

  try {
    const url = new URL(AWS_API_URL);
    url.searchParams.set("id", lookupId.value.trim());

    const response = await fetch(url);
    const reservation = await response.json();

    if (!response.ok) {
      lookupResult.className = "reservation-result reservation-result--error";
      lookupResult.textContent = reservation.message || "Could not find the reservation.";
      return;
    }

    const room = roomLabels[reservation.roomId] || reservation.roomId;

    lookupResult.className = "reservation-result reservation-result--success";
    lookupResult.textContent = [
      reservation.status,
      "Reservation ID: " + reservation.reservation_id,
      "Student ID: " + reservation.studentId,
      room,
      reservation.reservationDate,
      reservation.startTime + "–" + reservation.endTime,
      reservation.partySize + " attendee(s)"
    ].join(" · ");
  } catch {
    lookupResult.className = "reservation-result reservation-result--error";
    lookupResult.textContent = "Could not connect to the reservation service.";
  } finally {
    lookupButton.disabled = false;
  }
});
