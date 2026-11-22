// Our Milestone 4 AWS endpoint is configured in config.js.
// This frontend preserves the team's existing POST payload and response contract.
const API_URL = (window.STUDY_ROOM_API_URL || "").replace(/\/$/, "");
const STUDY_ROOM_CAPACITY = 6;

function fitsRoomCapacity(partySize) {
  return partySize > 0 && partySize <= STUDY_ROOM_CAPACITY;
}

function apiConfigured() {
  return Boolean(API_URL && !API_URL.includes("PASTE_"));
}

const form = document.querySelector("#reservationForm");
const partySizeInput = document.querySelector("#partySize");
const capacityMessage = document.querySelector("#capacityMessage");
const reservationResult = document.querySelector("#reservationResult");
const submitButton = form.querySelector('button[type="submit"]');

const lookupForm = document.querySelector("#lookupForm");
const reservationIdInput = document.querySelector("#reservationId");
const lookupResult = document.querySelector("#lookupResult");
const lookupButton = lookupForm.querySelector('button[type="submit"]');

partySizeInput.addEventListener("input", () => {
  const raw = partySizeInput.value.trim();
  if (raw === "") {
    capacityMessage.textContent = "";
    capacityMessage.className = "capacity-message";
    return;
  }

  const partySize = Number(raw);
  const roomFits = Number.isInteger(partySize) && fitsRoomCapacity(partySize);
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

  if (!apiConfigured()) {
    reservationResult.className = "reservation-result reservation-result--error";
    reservationResult.textContent = "Our AWS API URL has not been configured yet.";
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

  submitButton.disabled = true;
  reservationResult.className = "reservation-result reservation-result--pending";
  reservationResult.textContent = "Sending reservation to AWS...";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reservation)
    });
    const data = await response.json();

    if (!response.ok) {
      reservationResult.className = "reservation-result reservation-result--error";
      reservationResult.textContent = `Validation error: ${data.message || "The request was not accepted."}`;
    } else if (data.status === "Confirmed") {
      reservationResult.className = "reservation-result reservation-result--success";
      reservationResult.textContent = `Confirmed! Reservation ID: ${data.reservation_id}. ${data.message || "Reservation confirmed."}`;
      reservationIdInput.value = data.reservation_id || "";
    } else if (data.status === "Rejected") {
      reservationResult.className = "reservation-result reservation-result--error";
      const idText = data.reservation_id ? ` Reservation ID: ${data.reservation_id}.` : "";
      reservationResult.textContent = `Rejected: ${data.message || data.rejection_reason || "Reservation not available."}${idText}`;
      if (data.reservation_id) reservationIdInput.value = data.reservation_id;
    } else {
      reservationResult.className = "reservation-result reservation-result--error";
      reservationResult.textContent = data.message || "Unexpected response from the reservation service.";
    }
  } catch (error) {
    console.error("API request failed:", error);
    reservationResult.className = "reservation-result reservation-result--error";
    reservationResult.textContent = "Could not connect to our AWS API. Check the API URL and CORS settings.";
  } finally {
    submitButton.disabled = false;
  }
});

lookupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!apiConfigured()) {
    lookupResult.className = "lookup-result lookup-result--error";
    lookupResult.textContent = "Our AWS API URL has not been configured yet.";
    return;
  }

  const reservationId = reservationIdInput.value.trim();
  if (!reservationId) return;

  lookupButton.disabled = true;
  lookupResult.className = "lookup-result lookup-result--pending";
  lookupResult.textContent = "Retrieving reservation from DynamoDB...";

  try {
    const response = await fetch(`${API_URL}?reservation_id=${encodeURIComponent(reservationId)}`, {
      method: "GET"
    });
    const data = await response.json();

    if (!response.ok) {
      lookupResult.className = "lookup-result lookup-result--error";
      lookupResult.textContent = data.message || "Reservation could not be retrieved.";
      return;
    }

    lookupResult.className = "lookup-result lookup-result--success";
    lookupResult.textContent = [
      `Reservation ID: ${data.reservation_id}`,
      `Status: ${data.status}`,
      `Student ID: ${data.studentId}`,
      `Room: ${data.room}`,
      `Date: ${data.reservationDate}`,
      `Start Time: ${data.startTime}`,
      `Duration: ${data.duration} minutes`,
      `Attendees: ${data.partySize}`,
      data.rejection_reason ? `Rejection Reason: ${data.rejection_reason}` : ""
    ].filter(Boolean).join("\n");
  } catch (error) {
    console.error("Lookup failed:", error);
    lookupResult.className = "lookup-result lookup-result--error";
    lookupResult.textContent = "Could not connect to our AWS API.";
  } finally {
    lookupButton.disabled = false;
  }
});
