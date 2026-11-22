# MIS 3371 — Section-26252-Group-4-Study Room Reservation System

This repository contains design artifacts and the working transaction interface for the MIS 3371 Transaction Processing Systems I capstone project.

## Project
**Study Room Reservation System**

The system models a student reserving a study room for a specific date and time.

## Project Artifacts
The design and checkpoint files are in the `docs` folder:

- [Transaction Workflow](docs/workflow-v1.md)
- [State Transition Model + State Definitions](docs/state-model-v1.md)
- [Data Dictionary](docs/data-dictionary.md)
- [Three-Tier Architecture](docs/architecture-v1.md)
- [Responsibility Notes](docs/responsibility-notes.md)
- [Week 6 JavaScript Checkpoint](docs/week6-javascript-checkpoint.md)

The working reservation interface is in the `src` folder:

- [HTML Transaction Interface](src/index.html)
- [CSS](src/styles.css)
- [JavaScript](src/app.js)

## Repository Structure

```text
/
├── README.md
├── docs/
    ├── workflow-v1.md
    ├── state-model-v1.md
    ├── data-dictionary.md
    ├── architecture-v1.md
    ├── responsibility-notes.md
    └── week6-javascript-checkpoint.md
└── src/
    ├── index.html
    ├── styles.css
    └── app.js
```

## Week 6 JavaScript Behavior

The page listens for changes to the attendee count and displays whether the group fits the six-person study room capacity. The rule is implemented in `fitsRoomCapacity(partySize)` and the visible message is updated with `textContent`.

## Week 3 Requirements Covered
- Clear transaction trigger and outcome
- 5–8 meaningful workflow actions
- At least 2 decision points
- At least 1 exception/failure path
- 4–6 transaction states
- Allowed state transitions
- Data dictionary with meaningful fields
- Stable transaction ID and status
- At least two timestamps
- Three-tier architecture
- Application-tier business rules
- Audit/history responsibility
- Official persistent record in the data tier

## Project Assumptions
The Week 3 activity defines the design requirements but does not specify detailed business rules for this project. The following are team design assumptions:

1. Campus-login integration is outside the project scope; the reservation workflow assumes an authorized student identifier is already available when the transaction begins.
2. A room cannot be double-booked for an overlapping time slot.
3. A reservation request becomes an official transaction when submitted, at which point it receives a stable reservation ID and `Submitted` status.
4. A submitted request becomes either `Confirmed` or `Rejected`; every rejected request preserves a rejection reason.
5. A confirmed reservation may be cancelled before its scheduled start time.
6. Application logic is authoritative for critical validation, business rules, and state transitions.
7. The data tier preserves the official transaction, status, rejection reason, timestamps, and audit record.


## Milestone 4 — Final Technical Milestone

**Current deployed Amplify URL:** https://main.dszcwlgff57mb.amplifyapp.com/

Milestone 4 requires the deployed application to submit, persist, and retrieve a transaction.

Added Milestone 4 implementation files:

- `src/config.js` — API Gateway base URL configuration
- `src/app.js` — frontend submission and retrieval calls
- `aws/lambda/index.js` — Lambda validation, DynamoDB persistence, confirmation-number generation, overlap checking, and retrieval
- `docs/milestone4-aws-completion.md` — AWS deployment/completion instructions
- `docs/milestone4-test-plan.md` — required test scenarios
- `docs/milestone4-demo-checklist.md` — individual recording flow

### Live verification still required

Before the final Canvas submission, the team must:

1. Create/verify the DynamoDB `StudyRoomReservations` table using `reservationId` as the String partition key.
2. Deploy the current Lambda and ensure its role can read/write the table.
3. Configure API Gateway routes:
   - `POST /reservations`
   - `GET /reservations/{reservationId}`
4. Put the deployed API Gateway base URL in `src/config.js`.
5. Redeploy the `src` frontend to Amplify.
6. Run the final test matrix against the live site and record actual results.

Do not describe a test as passed or a transaction as persistent until it has been verified on the deployed AWS application.
