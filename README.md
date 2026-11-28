# MIS 3371 — Section 26252 — Group 4

## Study Room Reservation System

This project implements a study room reservation transaction processing system using a three-tier architecture consisting of a presentation tier, application logic tier, and data tier.

## Deployed Application

https://main.dszcwlgff57mb.amplifyapp.com/

Use a synthetic student ID such as TEST-001 when testing the application.

## Implemented Features

- Study room reservation interface
- Immediate capacity validation and submission enforcement
- Maximum capacity of six attendees
- Reservation durations of 30, 60, 90, or 120 minutes
- Required field validation
- Reservation conflict detection
- Unique reservation ID generation
- Confirmation and rejection feedback
- Persistent reservation storage through DynamoDB
- Retrieval of saved AWS reservations
- Independent Node.js backend
- Express HTTP endpoint and JSON responses
- Automated backend testing

## Repository Structure

- src/ — HTML, CSS, and frontend JavaScript
- backend/backend.js — Independent business logic
- backend/server.js — Express HTTP server
- backend/test-backend.js — Automated backend tests
- backend/package.json — Dependencies and startup scripts
- aws/lambda/TransactionProcessor/ — Python Lambda source
- aws/lambda/index.mjs — Alternate Node.js Lambda implementation
- docs/ — Design artifacts and project documentation

## Local Installation

Install Node.js and npm before running the application.

From the repository root, execute:

```bash
cd backend
npm install
npm test
npm start
```

Open http://localhost:3000 in a web browser.

## Local API

Endpoint: POST /api/reservations

Content-Type: application/json

Example request:

```json
{
  "studentId": "TEST-001",
  "room": "library-201",
  "reservationDate": "2026-12-21",
  "startTime": "12:00",
  "duration": 120,
  "partySize": 6
}
```

Successful requests return HTTP 200 with confirmation details.

Rejected requests return HTTP 400 with a rejection reason.

Local reservations are temporarily stored in memory and are cleared when the server restarts. Persistent storage and reservation retrieval are available through the deployed AWS application.

## AWS Architecture

- Presentation tier: AWS Amplify
- HTTP communication: Amazon API Gateway
- Application logic: AWS Lambda
- Data tier: Amazon DynamoDB
- Lambda function: TransactionProcessor
- AWS region: us-east-2
- DynamoDB table: StudyRoomReservations
- Partition key: reservation_id

## Testing

On November 28, 2026, all 21 automated backend tests passed.

The tests cover:

- Valid reservations
- Capacity boundaries
- Invalid attendee counts
- Required fields
- Invalid rooms and dates
- Duration restrictions
- Invalid start times
- Overlapping reservations
- Adjacent reservations
- Different rooms and dates
- Data dictionary field verification

Local browser testing also verified successful reservations, overlapping reservation rejection, and adjacent reservation acceptance.

AWS reservation creation and retrieval were separately demonstrated.

## Project Documentation

- [Transaction Workflow](docs/workflow-v1.md)
- [State Transition Model](docs/state-model-v1.md)
- [Data Dictionary](docs/data-dictionary.md)
- [Three-Tier Architecture](docs/architecture-v1.md)
- [Responsibility Matrix](docs/responsibility-notes.md)
- [Week 6 JavaScript Checkpoint](docs/week6-javascript-checkpoint.md)
- [Milestone 4 AWS Deployment](docs/milestone4-aws-completion.md)
- [Milestone 4 Test Plan](docs/milestone4-test-plan.md)
- [Individual Demonstration Checklist](docs/milestone4-demo-checklist.md)

## Scope and Limitations

Campus authentication is outside the project scope.

Cancellation and automatic completion are documented design states but are not currently implemented.

Local storage is temporary and does not replace DynamoDB.

Exact facility operating hours have not been specified.

The Python AWS implementation checks existing reservations before saving but does not currently guarantee atomic overlap prevention for simultaneous requests.

## Project Team

MIS 3371 — Section 26252 — Group 4
University of Houston
