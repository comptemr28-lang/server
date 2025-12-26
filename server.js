// const express = require('express');
// const app = express();
// const fs = require('fs');
// const path = require('path');

// app.get('/pixel.png', (req, res) => {
//     // Log the request (IP, user-agent, timestamp)
//     console.log(`Pixel requested from IP: ${req.ip}, UA: ${req.headers['user-agent']}, Time: ${new Date()}`);

//     // Send the image
//     res.sendFile(path.join(__dirname, 'pixel.png'));
// });

// const port = process.env.PORT || 3000;
// app.listen(port, () => console.log(`Server running on port ${port}`));
const express = require("express");
const path = require("path");

const app = express();

// Tracking pixel endpoint
app.get("/pixel.png", (req, res) => {
  const uid = req.query.uid || "none";
  const time = new Date().toISOString();

  // Data visible to an image request
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
  const ua = req.headers["user-agent"] || "unknown";

  console.log("PIXEL HIT:", {
    uid,
    time,
    ip,
    ua
  });

  // Send the pixel
  res.set("Content-Type", "image/png");
  res.sendFile(path.join(__dirname, "pixel.png"));
});

// Required for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Pixel server running on port ${PORT}`);
});

