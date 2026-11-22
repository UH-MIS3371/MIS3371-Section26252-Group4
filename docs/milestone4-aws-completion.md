# Milestone 4 AWS Deployment

[Deployed Amplify site](https://main.d2pj03nocmnuea.amplifyapp.com/)

| Component | Deployment configuration |
| --- | --- |
| Amplify | `StudyRoomReservationM4`, branch `main`. Deploy the contents of `src/` at the site root. |
| API Gateway | `StudyRoomReservation-API`, HTTP API, `default` stage, browser CORS enabled. |
| Lambda | `StudyRoomReservation` in `us-east-1`, Node.js 24, handler `index.handler`, source `aws/lambda/index.mjs`. |
| DynamoDB | `StudyRoomReservationsM4` in `us-east-1`, on-demand capacity, String partition key `pk`. |

The frontend in `src/app.js` uses the deployed API endpoint. It sends a plain-text JSON body with `POST /default/StudyRoomReservation` and looks up records with `GET /default/StudyRoomReservation?id=<confirmation-id>`.

Lambda reads the room schedule and uses a conditional DynamoDB transaction to write the schedule and reservation together. The execution role needs read and transactional write access to the table.

## Verify the deployment

1. Open the deployed site and submit a booking with a synthetic ID such as `TEST-DEMO`.
2. Copy the returned confirmation ID and refresh the page.
3. Paste the ID in **Find Reservation** and verify that the saved details match.
4. Submit an overlapping request for the same room and date, then look up `RSV-NOT-FOUND` to check both rejection paths.
