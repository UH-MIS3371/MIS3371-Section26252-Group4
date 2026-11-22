const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME || "StudyRoomReservations";
const ALLOWED_ROOMS = new Set(["StudyRoom1", "StudyRoom2"]);
const MAX_PARTY_SIZE = 6;
const MAX_DURATION_MINUTES = 120;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}

function parseBody(event) {
  if (!event.body) return {};
  if (typeof event.body === "object") return event.body;
  return JSON.parse(event.body);
}

function minutes(time) {
  const match = /^(\d{2}):(\d{2})$/.exec(time || "");
  if (!match) return NaN;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return NaN;
  return hour * 60 + minute;
}

function validateReservation(input) {
  const required = ["studentId", "roomId", "reservationDate", "startTime", "endTime", "partySize"];
  for (const field of required) {
    if (input[field] === undefined || input[field] === null || String(input[field]).trim() === "") {
      return `${field} is required.`;
    }
  }

  if (!ALLOWED_ROOMS.has(String(input.roomId))) {
    return "roomId must be StudyRoom1 or StudyRoom2.";
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.reservationDate))) {
    return "reservationDate must use YYYY-MM-DD.";
  }

  const start = minutes(String(input.startTime));
  const end = minutes(String(input.endTime));
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return "startTime and endTime must use HH:MM.";
  }
  if (end <= start) {
    return "endTime must be after startTime.";
  }
  if (end - start > MAX_DURATION_MINUTES) {
    return "A reservation may not exceed 120 minutes.";
  }

  const partySize = Number(input.partySize);
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > MAX_PARTY_SIZE) {
    return "partySize must be a whole number from 1 through 6.";
  }

  if (!String(input.studentId).trim()) {
    return "studentId is required.";
  }

  return null;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

async function hasRoomConflict(input) {
  const result = await client.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: "#roomId = :roomId AND #reservationDate = :reservationDate AND #status = :status",
    ExpressionAttributeNames: {
      "#roomId": "roomId",
      "#reservationDate": "reservationDate",
      "#status": "status"
    },
    ExpressionAttributeValues: {
      ":roomId": input.roomId,
      ":reservationDate": input.reservationDate,
      ":status": "Confirmed"
    }
  }));

  const requestedStart = minutes(input.startTime);
  const requestedEnd = minutes(input.endTime);

  return (result.Items || []).some((item) =>
    overlaps(requestedStart, requestedEnd, minutes(item.startTime), minutes(item.endTime))
  );
}

function getMethod(event) {
  return event.requestContext?.http?.method || event.httpMethod || "";
}

function getPath(event) {
  return event.rawPath || event.path || "";
}

exports.handler = async (event) => {
  try {
    const method = getMethod(event);
    const path = getPath(event);

    if (method === "OPTIONS") {
      return response(204, {});
    }

    if (method === "POST" && /\/reservations\/?$/.test(path)) {
      const input = parseBody(event);
      const validationError = validateReservation(input);

      if (validationError) {
        return response(400, { message: validationError });
      }

      if (await hasRoomConflict(input)) {
        return response(409, { message: "The selected room is already reserved for an overlapping time." });
      }

      const now = new Date().toISOString();
      const reservationId = `RSV-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      const reservation = {
        reservationId,
        studentId: String(input.studentId).trim(),
        roomId: String(input.roomId),
        reservationDate: String(input.reservationDate),
        startTime: String(input.startTime),
        endTime: String(input.endTime),
        partySize: Number(input.partySize),
        status: "Confirmed",
        createdAt: now,
        updatedAt: now
      };

      await client.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: reservation,
        ConditionExpression: "attribute_not_exists(reservationId)"
      }));

      return response(201, {
        message: "Reservation confirmed and saved.",
        reservation
      });
    }

    if (method === "GET") {
      const reservationId =
        event.pathParameters?.reservationId ||
        decodeURIComponent(path.split("/").filter(Boolean).pop() || "");

      if (!reservationId || reservationId === "reservations") {
        return response(400, { message: "A reservation ID is required." });
      }

      const result = await client.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { reservationId }
      }));

      if (!result.Item) {
        return response(404, { message: "Reservation not found." });
      }

      return response(200, { reservation: result.Item });
    }

    return response(404, { message: "Route not found." });
  } catch (error) {
    console.error(error);

    if (error instanceof SyntaxError) {
      return response(400, { message: "Request body must contain valid JSON." });
    }

    return response(500, { message: "Internal server error." });
  }
};
