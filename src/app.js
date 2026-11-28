const AWS_API_URL = "https://hqf8dtpys7.execute-api.us-east-2.amazonaws.com/default/TransactionProcessor";
const IS_LOCAL = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const API_URL = IS_LOCAL ? "/api/reservations" : AWS_API_URL;
const STUDY_ROOM_CAPACITY = 6;

const form = document.querySelector("#reservationForm");
const partySizeInput = document.querySelector("#partySize");
const capacityMessage = document.querySelector("#capacityMessage");
const reservationResult = document.querySelector("#reservationResult");
const submitButton = form.querySelector('button[type="submit"]');
const lookupForm = document.querySelector("#lookupForm");
const lookupInput = document.querySelector("#lookupId");
const lookupResult = document.querySelector("#lookupResult");
const lookupDetails = document.querySelector("#lookupDetails");
const lookupButton = lookupForm.querySelector('button[type="submit"]');

partySizeInput.addEventListener("input", () => {
  const raw = partySizeInput.value.trim();
  if (raw === "") {
    capacityMessage.textContent = "";
    capacityMessage.className = "capacity-message";
    return;
  }

  const size = Number(raw);
  const valid = Number.isInteger(size) && size >= 1 && size <= STUDY_ROOM_CAPACITY;
  capacityMessage.textContent = valid
    ? "This group fits the selected study room."
    : size > STUDY_ROOM_CAPACITY
      ? `This group exceeds the study room capacity of ${STUDY_ROOM_CAPACITY}.`
      : "Enter a positive whole number of attendees.";
  capacityMessage.className = valid
    ? "capacity-message capacity-message--success"
    : "capacity-message capacity-message--error";
});

async function sendRequest(payload) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  return { response, data };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const size = Number(partySizeInput.value);
  if (!Number.isInteger(size) || size < 1 || size > STUDY_ROOM_CAPACITY) {
    reservationResult.className = "reservation-result reservation-result--error";
    reservationResult.textContent = "Reservations require between 1 and 6 attendees.";
    return;
  }
  const reservation = {
    studentId: document.querySelector("#studentId").value.trim(),
    room: document.querySelector("#room").value,
    reservationDate: document.querySelector("#reservationDate").value,
    startTime: document.querySelector("#startTime").value,
    duration: document.querySelector("#duration").value,
    partySize: partySizeInput.value
  };

  if (IS_LOCAL) {
    const [hours, minutes] = reservation.startTime.split(":").map(Number);
    const end = hours * 60 + minutes + Number(reservation.duration);
    if (!Number.isInteger(end) || end >= 1440) {
      reservationResult.className = "reservation-result reservation-result--error";
      reservationResult.textContent = "Reservation must end before midnight.";
      return;
    }
    reservation.endTime = `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
  }

  submitButton.disabled = true;
  reservationResult.className = "reservation-result reservation-result--pending";
  reservationResult.textContent = "Submitting reservation...";

  try {
    const { response, data } = await sendRequest(reservation);
    if (!response.ok) {
      reservationResult.className = "reservation-result reservation-result--error";
      reservationResult.textContent = `Validation error: ${data.message || data.reason || "Request could not be processed."}`;
    } else if (data.status === "Confirmed") {
      reservationResult.className = "reservation-result reservation-result--success";
      const id = data.reservation_id || data.reservationId;
      reservationResult.textContent = IS_LOCAL
        ? `Confirmed! Reservation ID: ${id}. Local validation successful. Record not persisted.`
        : `Confirmed! Reservation ID: ${id}. ${data.message || "Reservation confirmed."}`;
      if (!IS_LOCAL) lookupInput.value = id;
    } else if (data.status === "Rejected") {
      reservationResult.className = "reservation-result reservation-result--error";
      reservationResult.textContent = `Rejected${data.reservation_id ? ` (Reservation ID: ${data.reservation_id})` : ""}: ${data.message || data.rejection_reason || "Reservation not available."}`;
      if (data.reservation_id) lookupInput.value = data.reservation_id;
    } else {
      reservationResult.className = "reservation-result reservation-result--error";
      reservationResult.textContent = data.message || "Unexpected response from the reservation service.";
    }
  } catch (error) {
    console.error("Reservation request failed:", error);
    reservationResult.className = "reservation-result reservation-result--error";
    reservationResult.textContent = "Could not connect to the reservation service.";
  } finally {
    submitButton.disabled = false;
  }
});

lookupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (IS_LOCAL) {
    lookupDetails.hidden = true;
    lookupResult.className = "reservation-result reservation-result--error";
    lookupResult.textContent = "Reservation retrieval requires the deployed AWS database.";
    return;
  }
  const reservationId = lookupInput.value.trim();
  lookupDetails.hidden = true;
  lookupDetails.replaceChildren();
  lookupButton.disabled = true;
  lookupResult.className = "reservation-result reservation-result--pending";
  lookupResult.textContent = "Looking up reservation...";

  try {
    const { response, data } = await sendRequest({
      action: "lookup",
      reservation_id: reservationId
    });
    if (!response.ok) {
      lookupResult.className = "reservation-result reservation-result--error";
      lookupResult.textContent = data.message || "Reservation not found.";
      return;
    }

    lookupResult.className = "reservation-result reservation-result--success";
    lookupResult.textContent = `Reservation found: ${data.reservation_id}`;
    const roomNames = { "library-201": "Library 201", "library-202": "Library 202" };
    const entries = [
      ["Reservation ID", data.reservation_id],
      ["Student ID", data.student_id],
      ["Room", roomNames[data.room_id] || data.room_id],
      ["Date", data.reservation_date],
      ["Start time", data.start_time],
      ["End time", data.end_time],
      ["Duration", `${data.duration_minutes} minutes`],
      ["Attendees", data.party_size],
      ["Status", data.status]
    ];
    if (data.rejection_reason) entries.push(["Rejection reason", data.rejection_reason]);

    for (const [label, value] of entries) {
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = value == null ? "—" : String(value);
      lookupDetails.append(dt, dd);
    }
    lookupDetails.hidden = false;
  } catch (error) {
    console.error("Reservation lookup failed:", error);
    lookupResult.className = "reservation-result reservation-result--error";
    lookupResult.textContent = "Could not connect to the reservation service.";
  } finally {
    lookupButton.disabled = false;
  }
});
