const STUDY_ROOM_CAPACITY = 6;
const API_BASE_URL = (window.STUDY_ROOM_API_BASE_URL || "").replace(/\/$/, "");

function fitsRoomCapacity(partySize) {
  return Number.isInteger(partySize) && partySize >= 1 && partySize <= STUDY_ROOM_CAPACITY;
}

function setResult(element, message, kind = "info") {
  element.hidden = false;
  element.className = `result-panel result-panel--${kind}`;
  element.textContent = message;
}

function formatReservation(record) {
  return [
    `Reservation ID: ${record.reservationId || record.reservation_id || "N/A"}`,
    `Status: ${record.status || "N/A"}`,
    `Student ID: ${record.studentId || "N/A"}`,
    `Room: ${record.roomId || "N/A"}`,
    `Date: ${record.reservationDate || "N/A"}`,
    `Time: ${record.startTime || "N/A"} - ${record.endTime || "N/A"}`,
    `Attendees: ${record.partySize ?? "N/A"}`
  ].join("\n");
}

const partySizeInput = document.querySelector("#partySize");
const capacityMessage = document.querySelector("#capacityMessage");
const reservationForm = document.querySelector("#reservationForm");
const submissionResult = document.querySelector("#submissionResult");
const submitButton = document.querySelector("#submitButton");
const lookupForm = document.querySelector("#lookupForm");
const lookupResult = document.querySelector("#lookupResult");
const lookupButton = document.querySelector("#lookupButton");

partySizeInput.addEventListener("input", () => {
  const rawPartySize = partySizeInput.value.trim();

  if (rawPartySize === "") {
    capacityMessage.textContent = "";
    capacityMessage.className = "capacity-message";
    return;
  }

  const partySize = Number(rawPartySize);
  const roomFits = fitsRoomCapacity(partySize);

  capacityMessage.textContent = roomFits
    ? "This group fits the study room."
    : "Attendees must be a whole number from 1 through 6.";
  capacityMessage.className = roomFits
    ? "capacity-message capacity-message--success"
    : "capacity-message capacity-message--error";
});

reservationForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!API_BASE_URL) {
    setResult(submissionResult, "API endpoint is not configured. Set STUDY_ROOM_API_BASE_URL in config.js.", "error");
    return;
  }

  const formData = new FormData(reservationForm);
  const payload = {
    studentId: String(formData.get("studentId") || "").trim(),
    roomId: String(formData.get("roomId") || "").trim(),
    reservationDate: String(formData.get("reservationDate") || "").trim(),
    startTime: String(formData.get("startTime") || "").trim(),
    endTime: String(formData.get("endTime") || "").trim(),
    partySize: Number(formData.get("partySize"))
  };

  if (!fitsRoomCapacity(payload.partySize)) {
    setResult(submissionResult, "Attendees must be a whole number from 1 through 6.", "error");
    return;
  }

  submitButton.disabled = true;
  setResult(submissionResult, "Submitting reservation...", "info");

  try {
    const response = await fetch(`${API_BASE_URL}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setResult(submissionResult, body.message || `Request failed with status ${response.status}.`, "error");
      return;
    }

    const reservation = body.reservation || body;
    const reservationId = reservation.reservationId || body.reservationId;
    setResult(
      submissionResult,
      `Reservation submitted successfully.\nConfirmation number: ${reservationId}\n\n${formatReservation(reservation)}`,
      "success"
    );

    if (reservationId) {
      document.querySelector("#lookupId").value = reservationId;
    }
  } catch (error) {
    setResult(submissionResult, "Could not reach the backend. Verify the deployed API URL and CORS configuration.", "error");
  } finally {
    submitButton.disabled = false;
  }
});

lookupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!API_BASE_URL) {
    setResult(lookupResult, "API endpoint is not configured. Set STUDY_ROOM_API_BASE_URL in config.js.", "error");
    return;
  }

  const reservationId = document.querySelector("#lookupId").value.trim();
  if (!reservationId) {
    setResult(lookupResult, "Enter a confirmation number.", "error");
    return;
  }

  lookupButton.disabled = true;
  setResult(lookupResult, "Retrieving saved transaction...", "info");

  try {
    const response = await fetch(`${API_BASE_URL}/reservations/${encodeURIComponent(reservationId)}`);
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setResult(lookupResult, body.message || `Lookup failed with status ${response.status}.`, "error");
      return;
    }

    const reservation = body.reservation || body;
    setResult(lookupResult, `Saved transaction retrieved from the backend.\n\n${formatReservation(reservation)}`, "success");
  } catch (error) {
    setResult(lookupResult, "Could not reach the backend. Verify the deployed API URL and CORS configuration.", "error");
  } finally {
    lookupButton.disabled = false;
  }
});
