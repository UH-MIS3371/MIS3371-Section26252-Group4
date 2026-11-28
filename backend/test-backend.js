const assert = require("node:assert/strict");
const { processReservation } = require("./backend");

const validReservation = {
  studentId: "2145678",
  room: "library-201",
  reservationDate: "2026-12-15",
  startTime: "12:00",
  endTime: "13:00",
  partySize: 3
};

const tests = [
  {
    name: "Valid reservation",
    data: {},
    expected: true
  },
  {
    name: "Valid single attendee",
    data: { partySize: 1 },
    expected: true
  },
  {
    name: "Capacity exceeded",
    data: { partySize: 7 },
    expected: false
  },
  {
    name: "Missing student ID",
    data: { studentId: "" },
    expected: false
  },
  {
    name: "Maximum capacity boundary",
    data: { partySize: 6 },
    expected: true
  },
  {
    name: "Maximum duration boundary",
    data: { endTime: "14:00" },
    expected: true
  },
  {
    name: "Duration exceeds two hours",
    data: { endTime: "14:01" },
    expected: false
  },
  {
    name: "End time before start time",
    data: { endTime: "11:00" },
    expected: false
  },
  {
    name: "Zero attendees",
    data: { partySize: 0 },
    expected: false
  }
];

for (const test of tests) {
  const result = processReservation({
    ...validReservation,
    ...test.data
  });

  assert.equal(result.success, test.expected, test.name);

  console.log(
    `PASS: ${test.name} | ${result.status}`
  );
}

console.log("All 9 backend tests passed.");
