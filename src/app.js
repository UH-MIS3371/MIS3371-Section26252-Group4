// Public AWS API Gateway endpoint for the StudyRoomReservation Lambda.
// This is a classroom demonstration. Do not submit real student information.
const API_URL = "https://4ceu81c65b.execute-api.us-east-1.amazonaws.com/default/StudyRoomReservation";
const STUDY_ROOM_CAPACITY = 6;

function fitsRoomCapacity(partySize) {
  return partySize > 0 && partySize <= STUDY_ROOM_CAPACITY;
}

const form = document.querySelector("form");
const partySizeInput = document.querySelector("#partySize");
const capacityMessage = document.querySelector("#capacityMessage");
const reservationResult = document.querySelector("#reservationResult");
const submitButton = form.querySelector('button[type="submit"]');

// Retain the original immediate attendee-capacity feedback.
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
  event.preventDefault(); // Do not reload the page or submit to '#'.

  const reservation = {
    studentId: document.querySelector("#studentId").value.trim(),
    room: document.querySelector("#room").value,
    reservationDate: document.querySelector("#reservationDate").value,
    startTime: document.querySelector("#startTime").value,
    endTime: document.querySelector("#endTime").value,
    partySize: partySizeInput.value
  };

  submitButton.disabled = true;
  reservationResult.className = "reservation-result reservation-result--pending";
  reservationResult.textContent = "Sending reservation to AWS...";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      // A string body uses text/plain, so the demo request needs no CORS preflight.
      body: JSON.stringify(reservation)
    });
    const data = await response.json();

    if (!response.ok) {
      reservationResult.className = "reservation-result reservation-result--error";
      reservationResult.textContent = `Validation error: ${data.message || "The request was not accepted."}`;
    } else if (data.status === "Confirmed") {
      reservationResult.className = "reservation-result reservation-result--success";
      reservationResult.textContent = `Confirmed! Reservation ID: ${data.reservation_id}. ${data.message || "Reservation confirmed."}`;
    } else if (data.status === "Rejected") {
      reservationResult.className = "reservation-result reservation-result--error";
      reservationResult.textContent = `Rejected: ${data.message || data.rejection_reason || "Reservation not available."}`;
    } else {
      reservationResult.className = "reservation-result reservation-result--error";
      reservationResult.textContent = data.message || "Unexpected response from the reservation service.";
    }
  } catch (error) {
    console.error("API request failed:", error);
    reservationResult.className = "reservation-result reservation-result--error";
    reservationResult.textContent = "Could not connect to AWS. Check the API URL, CORS settings, and deployment.";
  } finally {
    submitButton.disabled = false;
  }
});


const lookupForm = document.querySelector("#lookupForm");
const lookupId = document.querySelector("#lookupId");
const lookupResult = document.querySelector("#lookupResult");
const lookupButton = lookupForm.querySelector('button[type="submit"]');
const roomLabels = { "library-201": "Library 201", "library-202": "Library 202" };

lookupForm.addEventListener("submit", async event => {
  event.preventDefault();
  lookupButton.disabled = true;
  lookupResult.className = "reservation-result reservation-result--pending";
  lookupResult.textContent = "Looking up reservation...";

  try {
    const url = new URL(API_URL);
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
