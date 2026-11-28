const express = require("express");
const path = require("path");
const { processReservation } = require("./backend");

const app = express();
const PORT = 3000;

app.use(express.json());

app.use(express.static(
  path.join(__dirname, "../src")
));

app.post("/api/reservations", (req, res) => {
  const result = processReservation(req.body);

  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.status(200).json(result);
});

app.use((err, req, res, next) => {
  const status = err.status === 400 ? 400 : 500;

  res.status(status).json({
    success: false,
    status: "Rejected",
    reason: status === 400
      ? "Invalid request."
      : "Internal server error."
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
