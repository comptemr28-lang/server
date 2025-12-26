const express = require("express");
const path = require("path");
const fs = require("fs");
const geoip = require("geoip-lite"); // npm install geoip-lite
const useragent = require("express-useragent"); // npm install express-useragent

const app = express();
app.use(useragent.express());

// Store data (in production, use a database)
const trackingData = [];

// 1. PIXEL TRACKING ENDPOINT
app.get("/pixel.png", (req, res) => {
  const uid = req.query.uid || "unknown";
  const time = new Date().toISOString();
  
  // Extract data from headers
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
  const ua = req.headers["user-agent"] || "unknown";
  const referer = req.headers["referer"] || "direct";
  
  // Parse user agent
  const parsedUA = req.useragent;
  
  // Get geolocation
  const geo = geoip.lookup(ip);
  
  // Collect headers for fingerprinting
  const headers = {
    'accept': req.headers["accept"],
    'accept-language': req.headers["accept-language"],
    'accept-encoding': req.headers["accept-encoding"],
    'connection': req.headers["connection"],
    'dnt': req.headers["dnt"], // Do Not Track header
    'sec-ch-ua': req.headers["sec-ch-ua"], // Client hints
    'sec-ch-ua-mobile': req.headers["sec-ch-ua-mobile"],
    'sec-ch-ua-platform': req.headers["sec-ch-ua-platform"]
  };
  
  // Construct fingerprint
  const fingerprint = {
    uid,
    timestamp: time,
    ip,
    geolocation: geo || {},
    userAgent: {
      browser: parsedUA.browser,
      version: parsedUA.version,
      os: parsedUA.os,
      platform: parsedUA.platform,
      source: ua
    },
    headers,
    referer,
    // Additional inferred data
    inferred: {
      language: (headers['accept-language'] || '').split(',')[0] || 'unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenSize: req.query.screen || 'unknown', // Would need JS to get this
      colorDepth: req.query.colors || 'unknown' // Would need JS
    }
  };
  
  // Log to console
  console.log("🚨 FINGERPRINT COLLECTED:", JSON.stringify(fingerprint, null, 2));
  
  // Store in array (in production, use database)
  trackingData.push(fingerprint);
  
  // Log to file
  fs.appendFileSync('tracking.log', JSON.stringify(fingerprint) + '\n');
  
  // Send 1x1 transparent pixel
  res.set({
    'Content-Type': 'image/png',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  // Create a 1x1 transparent PNG
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  res.send(pixel);
});

// 2. FINGERPRINT.JS ENDPOINT (Would need browser JavaScript to call)
app.get("/fingerprint.js", (req, res) => {
  const fingerprintScript = `
  // Fingerprinting script (would run in browser if JS was allowed in email)
  // This is BLOCKED by all major email clients
  
  (function() {
    // Collect browser data
    const fingerprint = {
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth,
        pixelDepth: window.screen.pixelDepth
      },
      navigator: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        languages: navigator.languages,
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
        maxTouchPoints: navigator.maxTouchPoints || 'unknown',
        deviceMemory: navigator.deviceMemory || 'unknown'
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      fonts: (function() {
        // Font detection would go here
        return 'Font detection disabled';
      })(),
      canvas: (function() {
        // Canvas fingerprinting would go here
        return 'Canvas fingerprinting disabled';
      })(),
      webgl: (function() {
        // WebGL fingerprinting would go here
        return 'WebGL fingerprinting disabled';
      })(),
      audio: (function() {
        // Audio fingerprinting would go here
        return 'Audio fingerprinting disabled';
      })()
    };
    
    // Send to server
    const uid = new URLSearchParams(window.location.search).get('uid') || 'unknown';
    fetch('/collect-fingerprint', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        uid: uid,
        fingerprint: fingerprint,
        timestamp: new Date().toISOString(),
        url: window.location.href
      })
    });
  })();
  `;
  
  res.set('Content-Type', 'application/javascript');
  res.send(fingerprintScript);
});

// 3. ENDPOINT TO RECEIVE FINGERPRINT DATA (would be called by the JS above)
app.post("/collect-fingerprint", express.json(), (req, res) => {
  const data = req.body;
  console.log("🎯 ADVANCED FINGERPRINT RECEIVED:", data);
  
  // Store advanced fingerprint
  trackingData.push({
    type: 'advanced_fingerprint',
    ...data,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  res.status(200).send('OK');
});

// 4. DATA VIEWING ENDPOINT (for testing only)
app.get("/view-data", (req, res) => {
  res.json({
    message: "Educational purposes only - Do not use in production",
    total_tracks: trackingData.length,
    data: trackingData
  });
});

// 5. DELETE ALL DATA
app.get("/clear-data", (req, res) => {
  trackingData.length = 0;
  res.send("All tracking data cleared");
});

// Root endpoint
app.get("/", (req, res) => {
  res.send(`
  <html>
    <head><title>Educational Fingerprinting Demo</title></head>
    <body>
      <h1>🚨 FOR EDUCATIONAL PURPOSES ONLY</h1>
      <p>This demonstrates why email clients block JavaScript.</p>
      <h2>Endpoints:</h2>
      <ul>
        <li><a href="/pixel.png?uid=test123">Tracking Pixel</a></li>
        <li><a href="/fingerprint.js">Fingerprint JS Script</a></li>
        <li><a href="/view-data">View Collected Data</a></li>
        <li><a href="/clear-data">Clear All Data</a></li>
      </ul>
      <h2>Legal & Ethical Notice:</h2>
      <p>Using this in production emails would:</p>
      <ol>
        <li>Violate privacy laws (GDPR, CCPA, etc.)</li>
        <li>Break email client terms of service</li>
        <li>Potentially expose you to legal liability</li>
        <li>Damage user trust</li>
      </ol>
    </body>
  </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚨 Educational server running on port ${PORT}`);
  console.log(`⚠️  WARNING: This is for demonstration only`);
});
// const express = require("express");
// const path = require("path");

// const app = express();

// // Tracking pixel endpoint
// app.get("/pixel.png", (req, res) => {
//   const uid = req.query.uid || "none";
//   const time = new Date().toISOString();

//   // Data visible to an image request
//   const ip =
//     req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
//   const ua = req.headers["user-agent"] || "unknown";

//   console.log("PIXEL HIT:", {
//     uid,
//     time,
//     ip,
//     ua
//   });

//   // Send the pixel
//   res.set("Content-Type", "image/png");
//   res.sendFile(path.join(__dirname, "pixel.png"));
// });

// // Required for Render
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Pixel server running on port ${PORT}`);
// });

