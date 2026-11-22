# Milestone 4 Individual Demonstration Checklist

Canvas requires every student to record their own real-time demonstration.

## Recommended 5–8 minute flow

1. **Introduction (about 20 seconds)**
   - State your name.
   - Identify the project as the Study Room Reservation System.
   - Explain that the frontend communicates through API Gateway to Lambda and persistent DynamoDB storage.

2. **Open the deployed application**
   - Show the browser URL bar so the deployed public URL is visible.
   - Briefly identify the reservation fields.

3. **Valid transaction**
   - Submit a valid reservation, for example:
     - Student ID: `2145678`
     - Room: `StudyRoom1`
     - Date: use a future date
     - Start: `14:00`
     - End: `15:00`
     - Attendees: `4`
   - Show the success response.
   - Read the returned confirmation/reservation number.

4. **Retrieve the saved transaction**
   - Paste the returned confirmation number into the retrieval box.
   - Retrieve it.
   - Point out that the saved values match the submitted transaction.
   - Optional strong evidence: refresh the page and retrieve the same ID again.

5. **Boundary case**
   - Submit **6 attendees**.
   - Explain that 6 is the maximum allowed and should be accepted.

6. **Invalid / business-rule cases**
   - Try **7 attendees** and show the rejection.
   - Try an end time that is before the start time and show the rejection.
   - Try a duration over 120 minutes and show the rejection.
   - Try an overlapping reservation for the same room/date/time after one has already been confirmed and show the conflict response.

7. **Invalid retrieval**
   - Search for an obviously nonexistent ID such as `RSV-NOT-FOUND`.
   - Show the not-found response.

8. **Close**
   - State that the demonstration showed frontend input, backend validation, confirmation number generation, persistent storage, and retrieval.

## Recording reminders
- The professor requires your own recording.
- Show the actual deployed application, not slides or screenshots.
- Keep your face visible and explain what is happening.
- Use the same scenarios recorded in the final test matrix.
