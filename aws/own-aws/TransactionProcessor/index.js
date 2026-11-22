const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand
} = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME || "StudyRoomReservations";

const MAX_PARTY_SIZE = 6;
const ALLOWED_ROOMS = new Set(["library-201", "library-202"]);
const ALLOWED_DURATIONS = new Set([30, 60, 90, 120]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
  "Content-Type": "application/json"
};

function reply(statusCode, payload) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(payload)
  };
}

function requestMethod(event) {
  return event.requestContext?.http?.method || event.httpMethod || "";
}

function parseBody(event) {
  if (!event.body) return {};
  if (typeof event.body === "object") return event.body;
  return JSON.parse(event.body);
}

function timeToMinutes(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
  if (!match) return NaN;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) return NaN;
  return hours * 60 + minutes;
}

function endTimeFrom(startTime, duration) {
  const start = timeToMinutes(startTime);
  const end = start + duration;

  if (!Number.isFinite(start) || end > 24 * 60) return null;

  const hours = Math.floor(end / 60);
  const minutes = end % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function validate(input) {
  const required = [
    "studentId",
    "room",
    "reservationDate",
    "startTime",
    "duration",
    "partySize"
  ];

  for (const field of required) {
    if (
      input[field] === undefined ||
      input[field] === null ||
      String(input[field]).trim() === ""
    ) {
      return `${field} is required.`;
    }
  }

  if (!ALLOWED_ROOMS.has(String(input.room))) {
    return "Select a valid study room.";
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.reservationDate))) {
    return "Reservation date must use YYYY-MM-DD.";
  }

  const start = timeToMinutes(input.startTime);
  if (!Number.isFinite(start)) {
    return "Start time must use HH:MM.";
  }

  const duration = Number(input.duration);
  if (!ALLOWED_DURATIONS.has(duration)) {
    return "Duration must be 30, 60, 90, or 120 minutes.";
  }

  if (start + duration > 24 * 60) {
    return "The reservation cannot extend past midnight.";
  }

  const partySize = Number(input.partySize);
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > MAX_PARTY_SIZE) {
    return "Number of attendees must be a whole number from 1 through 6.";
  }

  return null;
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

async function findConflict(input) {
  const scan = await ddb.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression:
        "#room = :room AND #reservationDate = :reservationDate AND #status = :confirmed",
      ExpressionAttributeNames: {
        "#room": "room",
        "#reservationDate": "reservationDate",
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":room": input.room,
        ":reservationDate": input.reservationDate,
        ":confirmed": "Confirmed"
      }
    })
  );

  const requestedStart = timeToMinutes(input.startTime);
  const requestedEnd = requestedStart + Number(input.duration);

  return (scan.Items || []).find((item) => {
    const existingStart = timeToMinutes(item.startTime);
    const existingEnd = existingStart + Number(item.duration);
    return overlaps(requestedStart, requestedEnd, existingStart, existingEnd);
  });
}

async function saveTransaction(item) {
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression: "attribute_not_exists(reservation_id)"
    })
  );
}

async function handlePost(event) {
  const input = parseBody(event);
  const validationError = validate(input);

  if (validationError) {
    return reply(400, { message: validationError });
  }

  const now = new Date().toISOString();
  const reservationId =
    "RSV-" +
    Date.now() +
    "-" +
    crypto.randomBytes(3).toString("hex").toUpperCase();

  const baseRecord = {
    reservation_id: reservationId,
    studentId: String(input.studentId).trim(),
    room: String(input.room),
    reservationDate: String(input.reservationDate),
    startTime: String(input.startTime),
    duration: Number(input.duration),
    endTime: endTimeFrom(input.startTime, Number(input.duration)),
    partySize: Number(input.partySize),
    created_at: now,
    updated_at: now
  };

  const conflict = await findConflict(baseRecord);

  if (conflict) {
    const rejected = {
      ...baseRecord,
      status: "Rejected",
      rejection_reason: "The selected room is already reserved for an overlapping time."
    };

    await saveTransaction(rejected);

    return reply(200, {
      status: "Rejected",
      reservation_id: reservationId,
      message: rejected.rejection_reason,
      rejection_reason: rejected.rejection_reason
    });
  }

  const confirmed = {
    ...baseRecord,
    status: "Confirmed"
  };

  await saveTransaction(confirmed);

  return reply(200, {
    status: "Confirmed",
    reservation_id: reservationId,
    message: "Reservation confirmed and saved."
  });
}

async function handleGet(event) {
  const reservationId =
    event.queryStringParameters?.reservation_id ||
    event.queryStringParameters?.reservationId ||
    "";

  if (!reservationId) {
    return reply(400, {
      message: "Provide reservation_id in the query string."
    });
  }

  const result = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { reservation_id: reservationId }
    })
  );

  if (!result.Item) {
    return reply(404, { message: "Reservation not found." });
  }

  return reply(200, result.Item);
}

exports.handler = async (event) => {
  try {
    const method = requestMethod(event);

    if (method === "OPTIONS") {
      return reply(200, { ok: true });
    }

    if (method === "POST") {
      return await handlePost(event);
    }

    if (method === "GET") {
      return await handleGet(event);
    }

    return reply(405, { message: "Method not allowed." });
  } catch (error) {
    console.error(error);

    if (error instanceof SyntaxError) {
      return reply(400, { message: "Request body must contain valid JSON." });
    }

    return reply(500, { message: "Internal server error." });
  }
};
