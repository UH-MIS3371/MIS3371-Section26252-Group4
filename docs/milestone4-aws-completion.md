# Milestone 4 AWS Completion Guide

Milestone 4 requires a live deployed application that can submit a transaction, return a confirmation number, save it persistently, and retrieve it by that confirmation number.

## Required AWS resources

### 1. DynamoDB
Create a table:

- **Table name:** `StudyRoomReservations`
- **Partition key:** `reservationId` (String)
- On-demand capacity is sufficient for the class project.

### 2. Lambda
Use the existing **StudyRoomReservation** Lambda or deploy `aws/lambda/index.js`.

Set environment variable:

```text
TABLE_NAME=StudyRoomReservations
```

The Lambda execution role must permit:
- `dynamodb:GetItem`
- `dynamodb:PutItem`
- `dynamodb:Scan`

The project previously used the existing Academy `LabRole`; verify that the role still has DynamoDB access.

### 3. API Gateway
The frontend expects these routes:

- `POST /reservations`
- `GET /reservations/{reservationId}`
- `OPTIONS` support / CORS for browser requests

Both routes should integrate with the same Lambda.

### 4. Frontend configuration
Edit `src/config.js` and paste the API Gateway base URL:

```js
window.STUDY_ROOM_API_BASE_URL = "https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com";
```

Do not add `/reservations` to the configured value; `app.js` adds the route.

### 5. Amplify
Deploy the `src` folder contents as the frontend.

Verify the final public URL:
1. Page loads.
2. Valid reservation returns a confirmation number.
3. Copy that number into **Retrieve Saved Transaction**.
4. Retrieval displays the same saved reservation.
5. Reload the browser and retrieve again to prove persistent storage.

## Milestone 4 live verification
Do not mark a test as Passed until the live Amplify site and AWS backend actually produce the expected result.
