const assert = require("node:assert/strict");
const {
  processReservation,
  resetReservations
} = require("./backend");

const validReservation = {
  studentId: "TEST-001",
  room: "library-201",
  reservationDate: "2026-12-21",
  startTime: "12:00",
  duration: 60,
  partySize: 3
};

const tests = [
  ["Valid reservation", {}, true],
  ["Single attendee", { partySize: 1 }, true],
  ["Maximum capacity", { partySize: 6 }, true],
  ["Capacity exceeded", { partySize: 7 }, false],
  ["Zero attendees", { partySize: 0 }, false],
  ["Fractional attendees", { partySize: 2.5 }, false],
  ["Missing student ID", { studentId: "" }, false],
  ["Invalid room", { room: "invalid-room" }, false],
  ["Invalid date", { reservationDate: "2026-02-30" }, false],
  ["Invalid start time", { startTime: "25:00" }, false],
  ["Minimum duration", { duration: 30 }, true],
  ["Maximum duration", { duration: 120 }, true],
  ["Duration exceeded", { duration: 180 }, false],
  ["Unsupported duration", { duration: 45 }, false],
  ["Reservation crosses midnight", {
    startTime: "23:30",
    duration: 60
  }, false],
  ["Inconsistent end time", {
    endTime: "15:00"
  }, false]
];

let passed = 0;

for (const [name, changes, expected] of tests) {
  resetReservations();

  const result = processReservation({
    ...validReservation,
    ...changes
  });

  assert.equal(result.success, expected, name);

  console.log(`PASS: ${name} | ${result.status}`);
  passed++;
}

resetReservations();

const first = processReservation(validReservation);
assert.equal(first.success, true);

const overlapping = processReservation({
  ...validReservation,
  studentId: "TEST-002",
  startTime: "12:30"
});

assert.equal(overlapping.success, false);
console.log("PASS: Overlapping reservation rejected");
passed++;

const adjacent = processReservation({
  ...validReservation,
  startTime: "13:00"
});

assert.equal(adjacent.success, true);
console.log("PASS: Adjacent reservation accepted");
passed++;

const differentRoom = processReservation({
  ...validReservation,
  room: "library-202"
});

assert.equal(differentRoom.success, true);
console.log("PASS: Different room accepted");
passed++;

const differentDate = processReservation({
  ...validReservation,
  reservationDate: "2026-12-22"
});

assert.equal(differentDate.success, true);
console.log("PASS: Different date accepted");
passed++;

assert.ok(first.reservation_id);
assert.equal(first.duration_minutes, 60);
assert.equal(first.end_time, "13:00");
assert.equal(first.room_capacity, 6);
assert.equal(first.availability_result, true);
assert.ok(first.created_at);
assert.ok(first.confirmed_at);

console.log("PASS: Data dictionary field verification");
passed++;

console.log(`All ${passed} backend tests passed.`);
