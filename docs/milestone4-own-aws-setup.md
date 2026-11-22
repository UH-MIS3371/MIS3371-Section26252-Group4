# Milestone 4 — Our Own AWS Deployment

This branch intentionally leaves the team's current `main` deployment untouched.

## Architecture

```text
Amplify static website
        |
        v
API Gateway HTTP API
  ANY /TransactionProcessor
        |
        v
Lambda: TransactionProcessor
        |
        v
DynamoDB: StudyRoomReservations
```

The frontend keeps the same reservation fields and POST payload used by the team-provided deployment bundle:

```json
{
  "studentId": "2145678",
  "room": "library-201",
  "reservationDate": "2026-11-30",
  "startTime": "14:00",
  "duration": "60",
  "partySize": "4"
}
```

A successful POST returns the same core response shape:

```json
{
  "status": "Confirmed",
  "reservation_id": "RSV-...",
  "message": "Reservation confirmed and saved."
}
```

Our addition for Milestone 4 is retrieval:

```text
GET /default/TransactionProcessor?reservation_id=RSV-...
```

## Step 1 — DynamoDB

Create a DynamoDB table:

- Table name: `StudyRoomReservations`
- Partition key: `reservation_id`
- Partition key type: String
- Capacity mode: On-demand

## Step 2 — Lambda

Create a Lambda function:

- Function name: `TransactionProcessor`
- Runtime: Node.js
- Execution role: use the AWS Academy/Learner Lab role that has DynamoDB access (commonly `LabRole`).

Paste the code from:

```text
aws/own-aws/TransactionProcessor/index.js
```

Add this environment variable:

```text
TABLE_NAME=StudyRoomReservations
```

The role must allow DynamoDB `GetItem`, `PutItem`, and `Scan` on the table.

## Step 3 — API Gateway

From the Lambda function, add an **API Gateway** trigger.

Recommended setup:

- API type: HTTP API
- Create a new API
- Security: Open for this classroom demo
- Route/method: `ANY`
- Path: `/TransactionProcessor`
- Stage: `default`
- Enable CORS for GET, POST, OPTIONS and Content-Type.

The invoke URL should look similar to:

```text
https://YOUR_API_ID.execute-api.us-east-2.amazonaws.com/default/TransactionProcessor
```

## Step 4 — Configure our frontend

Edit:

```text
src/config.js
```

Replace:

```text
PASTE_OUR_API_GATEWAY_URL_HERE
```

with the exact invoke URL from API Gateway.

## Step 5 — Amplify

Create a new Amplify app connected to this GitHub repository and select branch:

```text
milestone4-own-aws
```

This branch includes `amplify.yml`, which publishes the `src` directory.

After deployment, verify:

1. The site loads.
2. A valid reservation returns a reservation ID.
3. The reservation ID is automatically placed in the retrieval field.
4. Retrieve the reservation and verify all submitted values.
5. Reload the site and retrieve the same ID again to demonstrate persistent DynamoDB storage.
6. Test 6 attendees (boundary), 7 attendees (invalid), and overlapping reservations.
