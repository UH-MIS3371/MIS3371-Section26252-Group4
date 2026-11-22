import { randomUUID } from "node:crypto";
import {
  DynamoDBClient, GetItemCommand, TransactWriteItemsCommand
} from "@aws-sdk/client-dynamodb";

const db = new DynamoDBClient({});
const table = "StudyRoomReservationsM4";
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const roomAliases = {
  "library-201": "library-201",
  "library-202": "library-202",
  StudyRoom1: "library-201",
  StudyRoom2: "library-202"
};

function respond(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(data)
  };
}

const invalid = message => respond(400, { message });
const key = pk => ({ pk: { S: pk } });
const minutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const validTime = time => typeof time === "string" && timePattern.test(time);
const formatTime = value => [Math.floor(value / 60), value % 60]
  .map(part => String(part).padStart(2, "0")).join(":");

async function read(pk) {
  const result = await db.send(new GetItemCommand({
    TableName: table, Key: key(pk), ConsistentRead: true
  }));
  return result.Item;
}

async function lookup(id) {
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(id ?? "")) {
    return invalid("Enter a reservation ID.");
  }
  const record = await read("reservation#" + id);
  return record
    ? respond(200, JSON.parse(record.data.S))
    : respond(404, { message: "Reservation not found." });
}

async function reserve(input) {
  const { studentId, reservationDate, startTime, partySize } = input;
  const room = input.room ?? input.roomId;
  if (typeof studentId !== "string" || !studentId.trim()) {
    return invalid("Student ID is required.");
  }
  if (!/^TEST-[A-Z0-9-]{1,24}$/i.test(studentId.trim())) {
    return invalid("Use a demo student ID such as TEST-001.");
  }
  if (!Object.hasOwn(roomAliases, room)) return invalid("Choose a listed room.");
  const roomId = roomAliases[room];
  if (!["number", "string"].includes(typeof partySize) || String(partySize).trim() === "") {
    return invalid("Attendee count is required.");
  }
  const attendees = Number(partySize);
  if (!Number.isInteger(attendees) || attendees < 1 || attendees > 6) {
    return invalid("Attendee count must be a whole number from 1 through 6.");
  }
  const date = new Date(reservationDate + "T00:00:00Z");
  if (typeof reservationDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(reservationDate) ||
      Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== reservationDate) {
    return invalid("Enter a valid reservation date.");
  }
  if (!validTime(startTime)) return invalid("Enter a valid start time.");
  const start = minutes(startTime);
  let end;
  if (input.endTime !== undefined) {
    if (!validTime(input.endTime)) return invalid("Enter a valid end time.");
    end = minutes(input.endTime);
  } else {
    if (!["number", "string"].includes(typeof input.duration) || ![30, 60, 90, 120].includes(Number(input.duration))) {
      return invalid("Choose a reservation duration from 30 through 120 minutes.");
    }
    end = start + Number(input.duration);
  }
  if (end <= start) return invalid("End time must be after start time.");
  if (end - start > 120) return invalid("Reservation may not exceed 120 minutes.");
  if (end >= 1440) return invalid("Reservation must end on the same day.");

  const id = randomUUID();
  const record = {
    reservation_id: id, status: "Confirmed", studentId: studentId.trim(),
    roomId, reservationDate, startTime, endTime: formatTime(end),
    partySize: attendees, persisted: true
  };
  const dayKey = "room#" + roomId + "#" + reservationDate;
  for (let attempt = 0; attempt < 5; attempt++) {
    const day = await read(dayKey);
    const slots = day ? JSON.parse(day.slots.S) : [];
    if (slots.some(slot => start < slot.end && end > slot.start)) {
      return respond(409, { status: "Rejected", message: "The room is already reserved for that time." });
    }
    const version = day ? Number(day.version.N) : 0;
    try {
      await db.send(new TransactWriteItemsCommand({
        TransactItems: [
          { Put: {
            TableName: table,
            Item: {
              ...key(dayKey),
              slots: { S: JSON.stringify([...slots, { start, end }]) },
              version: { N: String(version + 1) }
            },
            ConditionExpression: day ? "#version = :expected" : "attribute_not_exists(pk)",
            ...(day && {
              ExpressionAttributeNames: { "#version": "version" },
              ExpressionAttributeValues: { ":expected": { N: String(version) } }
            })
          }},
          { Put: {
            TableName: table,
            Item: { ...key("reservation#" + id), data: { S: JSON.stringify(record) } },
            ConditionExpression: "attribute_not_exists(pk)"
          }}
        ]
      }));
      return respond(201, { ...record, message: "Reservation saved." });
    } catch (error) {
      const retryable = error.name === "TransactionConflictException" ||
        (error.name === "TransactionCanceledException" && error.CancellationReasons?.some(
          reason => ["ConditionalCheckFailed", "TransactionConflict"].includes(reason.Code)
        ));
      if (!retryable) throw error;
    }
  }
  return respond(503, { message: "The room schedule is busy. Please try again." });
}

export async function handler(event) {
  try {
    const method = event.requestContext?.http?.method ?? event.httpMethod;
    if (method === "GET") return await lookup(event.queryStringParameters?.id);
    if (method && method !== "POST") return respond(405, { message: "Use GET or POST." });
    let input;
    try {
      input = typeof event.body === "string" ? JSON.parse(event.body) : event.body ?? event;
    } catch {
      return invalid("Invalid JSON request.");
    }
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return invalid("A reservation request is required.");
    }
    return await reserve(input);
  } catch (error) {
    console.error("Reservation request failed", error.name);
    return respond(503, { message: "Reservation storage is unavailable. Please try again." });
  }
}
