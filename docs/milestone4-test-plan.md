# Milestone 4 Test Matrix Plan

The Canvas submission requires the final matrix to include valid, invalid, boundary, and important business-rule cases with expected and actual results.

The Excel deliverable created for Milestone 4 uses these core cases:

1. Valid reservation with 4 attendees.
2. Boundary reservation with 6 attendees.
3. Invalid reservation with 7 attendees.
4. Missing/blank attendee count.
5. End time equal to start time.
6. End time before start time.
7. Duration greater than 120 minutes.
8. Missing student ID.
9. Missing room.
10. Overlapping reservation for the same room/date/time.
11. Retrieve a known saved confirmation number.
12. Retrieve a nonexistent confirmation number.

## Live verification on November 22, 2026

All 12 cases passed on the [deployed Amplify site](https://main.d2pj03nocmnuea.amplifyapp.com/). The final test matrix records the actual results and evidence for each case. Separate API checks returned HTTP 201 for a saved reservation, 409 for an overlap, 200 for a saved ID, and 404 for an unknown ID.
