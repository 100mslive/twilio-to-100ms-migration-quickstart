'use strict';

/**
 * Load Twilio configuration from .env config file - the following environment
 * variables should be set:
 * process.env.TWILIO_ACCOUNT_SID
 * process.env.TWILIO_API_KEY
 * process.env.TWILIO_API_SECRET
 */
require('dotenv').load();

const express = require('express');
const http = require('http');
const path = require('path');
const HMS = require('@100mslive/server-sdk');

// Max. period that a Participant is allowed to be in a Room (currently 14400 seconds or 4 hours)
const MAX_ALLOWED_SESSION_DURATION = 14400;

// Create Express webapp.
const app = express();

// Set up the path for the quickstart.
const quickstartPath = path.join(__dirname, '../quickstart/public');
app.use('/quickstart', express.static(quickstartPath));

/**
 * Default to the Quick Start application.
 */
app.get('/', (request, response) => {
  response.redirect('/quickstart');
});

/**
 * Generate an Access Token for a chat application user - it generates a random
 * username for the client requesting a token, and takes a device ID as a query
 * parameter.
 */
app.get('/token', async function(request, response) {
  const { roomId, role} = request.query;

  const hms = new HMS.SDK(process.env.HMS_ACCESS_KEY, process.env.HMS_SECRET);

  const authToken = await hms.auth.getAuthToken({
    roomId,
    role: role,
    userId: "test_user",
  });

  response.send(authToken.token);
});

// Create http server and run it.
const server = http.createServer(app);
const port = process.env.PORT || 3000;
server.listen(port, function() {
  console.log('Express server running on *:' + port);
});
