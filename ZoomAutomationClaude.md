# Zoom Meeting Automation - Complete Implementation Guide

This guide covers the complete process of setting up Zoom integration from marketplace dashboard configuration to code implementation with webhooks.

---

## Table of Contents
1. [Sign In to Zoom Marketplace](#1-sign-in-to-zoom-marketplace)
2. [Create App](#2-create-app)
3. [Generate API Credentials](#3-generate-api-credentials)
4. [Configure App Scopes](#4-configure-app-scopes)
5. [Activate App](#5-activate-app)
6. [Create Meeting in Code](#6-create-meeting-in-code)
7. [Add Registration Process](#7-add-registration-process)
8. [Store Meeting Link in Database](#8-store-meeting-link-in-database)
9. [Create Webhook in Dashboard](#9-create-webhook-in-dashboard)
10. [Generate Webhook Secret Token](#10-generate-webhook-secret-token)
11. [Configure Webhook Events in Dashboard](#11-configure-webhook-events-in-dashboard)
12. [Implement Webhook Handler in Code](#12-implement-webhook-handler-in-code)
13. [Test Webhook Integration](#13-test-webhook-integration)

---

## 1. Sign In to Zoom Marketplace

### Steps:
1. Go to [Zoom Marketplace](https://marketplace.zoom.us/)
2. Click on **"Sign In"** in the top right corner
3. Use your Zoom account credentials to log in
4. If you don't have an account, click **"Sign Up, It's Free"**

### Important Notes:
- Use a Zoom account with appropriate permissions (preferably admin)
- Ensure your account has API access enabled
- Verify your email address if required

---

## 2. Create App

### Steps:
1. After signing in, click on **"Develop"** in the top menu
2. Select **"Build App"** from the dropdown
3. Choose app type: **"Server-to-Server OAuth"**
   - This is recommended for backend automation
   - No user interaction required for authentication
4. Click **"Create"**
5. Enter App Details:
   - **App Name**: Your application name (e.g., "Meeting Automation System")
   - **Short Description**: Brief description of your app
   - **Company Name**: Your company/organization name
   - **Developer Contact**: Your email address
6. Click **"Continue"**

### Why Server-to-Server OAuth?
- Best for backend services
- No redirect URLs needed
- Automatic token refresh
- Secure credential management

---

## 3. Generate API Credentials

### Steps:
1. Navigate to the **"App Credentials"** tab in your app dashboard
2. You'll find three important credentials:

#### ZOOM_ACCOUNT_ID
- Located at the top of the credentials section
- Format: `abc123def456`
- Copy and store securely

#### ZOOM_CLIENT_ID
- Found in the "Client Credentials" section
- Format: `aBcDeFgHiJkLmNoPqRsTuVwXyZ`
- Copy and store securely

#### ZOOM_CLIENT_SECRET
- Found below the Client ID
- Click **"View"** to reveal the secret
- Format: `1a2B3c4D5e6F7g8H9i0JkLmNoPqRsTuVwXyZ`
- **IMPORTANT**: Copy immediately and store securely
- You cannot retrieve this again without regenerating

### Store Credentials:
```env
# .env file
ZOOM_ACCOUNT_ID=your_account_id_here
ZOOM_CLIENT_ID=your_client_id_here
ZOOM_CLIENT_SECRET=your_client_secret_here
```

### Security Best Practices:
- Never commit credentials to version control
- Use environment variables
- Rotate credentials periodically
- Limit access to credentials

---

## 4. Configure App Scopes

### Steps:
1. Go to the **"Scopes"** tab in your app dashboard
2. Click **"Add Scopes"**
3. Add the following required scopes:

#### Required Scopes:
```
meeting:write:admin          # Create meetings
meeting:read:admin           # Read meeting details
meeting:update:admin         # Update meetings
meeting:delete:admin         # Delete meetings
user:read:admin              # Read user information
recording:read:admin         # Access recordings
recording:write:admin        # Manage recordings
```

4. Click **"Done"** and then **"Continue"**

---

## 5. Activate App

### Steps:
1. Complete all required information sections
2. Go to the **"Activation"** tab
3. Click **"Activate your app"**
4. Your app is now ready to use

---

## 6. Create Meeting in Code

### Implementation:

```javascript
// zoom-service.js
const axios = require('axios');

class ZoomService {
  constructor() {
    this.accountId = process.env.ZOOM_ACCOUNT_ID;
    this.clientId = process.env.ZOOM_CLIENT_ID;
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Get OAuth Access Token
  async getAccessToken() {
    // Check if token is still valid
    if (this.accessToken && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(
        `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${this.accountId}`,
        {},
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      // Token expires in 1 hour, refresh 5 minutes early
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
      
      return this.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error.response?.data || error.message);
      throw new Error('Failed to get Zoom access token');
    }
  }

  // Create Zoom Meeting
  async createMeeting(meetingData) {
    try {
      const token = await this.getAccessToken();
      
      const meetingConfig = {
        topic: meetingData.topic || 'New Meeting',
        type: 2, // Scheduled meeting
        start_time: meetingData.startTime, // Format: 2024-12-31T10:00:00Z
        duration: meetingData.duration || 60, // in minutes
        timezone: meetingData.timezone || 'UTC',
        agenda: meetingData.agenda || '',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          watermark: false,
          use_pmi: false,
          approval_type: 0, // Automatically approve
          registration_type: 1, // Attendees register once
          audio: 'both', // Both telephony and VoIP
          auto_recording: 'cloud', // Automatic cloud recording
          waiting_room: true,
          meeting_authentication: false
        }
      };

      const response = await axios.post(
        'https://api.zoom.us/v2/users/me/meetings',
        meetingConfig,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        meetingId: response.data.id,
        meetingNumber: response.data.id,
        joinUrl: response.data.join_url,
        startUrl: response.data.start_url,
        password: response.data.password,
        registrationUrl: response.data.registration_url,
        topic: response.data.topic,
        startTime: response.data.start_time,
        duration: response.data.duration
      };
    } catch (error) {
      console.error('Error creating meeting:', error.response?.data || error.message);
      throw new Error('Failed to create Zoom meeting');
    }
  }
}

module.exports = new ZoomService();
```

---

## 7. Add Registration Process

### Implementation:

```javascript
// registration-service.js
const axios = require('axios');
const zoomService = require('./zoom-service');

class RegistrationService {
  // Add registrant to meeting
  async addRegistrant(meetingId, registrantData) {
    try {
      const token = await zoomService.getAccessToken();
      
      const registrantInfo = {
        email: registrantData.email,
        first_name: registrantData.firstName,
        last_name: registrantData.lastName,
        phone: registrantData.phone || '',
        address: registrantData.address || '',
        city: registrantData.city || '',
        country: registrantData.country || '',
        zip: registrantData.zip || '',
        state: registrantData.state || '',
        industry: registrantData.industry || '',
        org: registrantData.organization || '',
        job_title: registrantData.jobTitle || '',
        custom_questions: registrantData.customQuestions || []
      };

      const response = await axios.post(
        `https://api.zoom.us/v2/meetings/${meetingId}/registrants`,
        registrantInfo,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        registrantId: response.data.id,
        email: response.data.email,
        joinUrl: response.data.join_url,
        registrantToken: response.data.registrant_id,
        topic: response.data.topic,
        startTime: response.data.start_time
      };
    } catch (error) {
      console.error('Error adding registrant:', error.response?.data || error.message);
      throw new Error('Failed to add registrant to meeting');
    }
  }

  // Get all registrants for a meeting
  async getRegistrants(meetingId) {
    try {
      const token = await zoomService.getAccessToken();
      
      const response = await axios.get(
        `https://api.zoom.us/v2/meetings/${meetingId}/registrants`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return response.data.registrants;
    } catch (error) {
      console.error('Error getting registrants:', error.response?.data || error.message);
      throw new Error('Failed to get meeting registrants');
    }
  }
}

module.exports = new RegistrationService();
```

---

## 8. Store Meeting Link in Database

### Database Schema:

```sql
-- meetings table
CREATE TABLE meetings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zoom_meeting_id BIGINT NOT NULL UNIQUE,
    zoom_meeting_number BIGINT NOT NULL,
    topic VARCHAR(255) NOT NULL,
    join_url TEXT NOT NULL,
    start_url TEXT NOT NULL,
    password VARCHAR(50),
    registration_url TEXT,
    start_time DATETIME NOT NULL,
    duration INT NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    status ENUM('scheduled', 'started', 'ended', 'cancelled') DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_meeting_id (zoom_meeting_id),
    INDEX idx_start_time (start_time)
);

-- registrants table
CREATE TABLE registrants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id INT NOT NULL,
    zoom_registrant_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    join_url TEXT,
    registrant_token VARCHAR(255),
    status ENUM('pending', 'approved', 'denied', 'cancelled') DEFAULT 'approved',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    INDEX idx_email (email),
    INDEX idx_meeting (meeting_id)
);
```

### Database Service:

```javascript
// database-service.js
const mysql = require('mysql2/promise');

class DatabaseService {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  // Store meeting in database
  async storeMeeting(meetingData) {
    const connection = await this.pool.getConnection();
    try {
      const [result] = await connection.execute(
        `INSERT INTO meetings 
         (zoom_meeting_id, zoom_meeting_number, topic, join_url, start_url, 
          password, registration_url, start_time, duration, timezone, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          meetingData.meetingId,
          meetingData.meetingNumber,
          meetingData.topic,
          meetingData.joinUrl,
          meetingData.startUrl,
          meetingData.password,
          meetingData.registrationUrl,
          meetingData.startTime,
          meetingData.duration,
          meetingData.timezone || 'UTC',
          'scheduled'
        ]
      );

      return result.insertId;
    } catch (error) {
      console.error('Error storing meeting:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Store registrant in database
  async storeRegistrant(registrantData) {
    const connection = await this.pool.getConnection();
    try {
      const [result] = await connection.execute(
        `INSERT INTO registrants 
         (meeting_id, zoom_registrant_id, email, first_name, last_name, 
          phone, join_url, registrant_token, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          registrantData.meetingId,
          registrantData.registrantId,
          registrantData.email,
          registrantData.firstName,
          registrantData.lastName,
          registrantData.phone,
          registrantData.joinUrl,
          registrantData.registrantToken,
          'approved'
        ]
      );

      return result.insertId;
    } catch (error) {
      console.error('Error storing registrant:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Get meeting by Zoom meeting ID
  async getMeetingByZoomId(zoomMeetingId) {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM meetings WHERE zoom_meeting_id = ?',
        [zoomMeetingId]
      );
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }

  // Update meeting status
  async updateMeetingStatus(zoomMeetingId, status) {
    const connection = await this.pool.getConnection();
    try {
      await connection.execute(
        'UPDATE meetings SET status = ? WHERE zoom_meeting_id = ?',
        [status, zoomMeetingId]
      );
    } finally {
      connection.release();
    }
  }
}

module.exports = new DatabaseService();
```

---

## 9. Create Webhook in Dashboard

### Steps:
1. Go back to your app in [Zoom Marketplace Dashboard](https://marketplace.zoom.us/)
2. Navigate to your app settings
3. Click on the **"Feature"** tab in the left sidebar
4. Find and click on **"Event Subscriptions"**
5. Toggle **"Event Subscriptions"** to **ON**
6. You'll see a field for **"Event notification endpoint URL"**

### Webhook URL Format:
```
https://yourdomain.com/api/zoom/webhook
```

### Important Notes:
- URL must be HTTPS (required by Zoom)
- URL must be publicly accessible
- Zoom will send a validation request when you add the URL
- For local development, use ngrok or similar tunneling service

---

## 10. Generate Webhook Secret Token

### Steps:
1. In the **"Event Subscriptions"** section, scroll down
2. Find **"Secret Token"** field
3. Click **"Generate"** or note the existing token
4. Copy the secret token immediately

#### ZOOM_WEBHOOK_SECRET_TOKEN
- Format: `a1B2c3D4e5F6g7H8i9J0kLmNoPqRsTuVwXyZ`
- Used to verify webhook authenticity
- Store securely in environment variables

```env
# .env file
ZOOM_WEBHOOK_SECRET_TOKEN=your_webhook_secret_token_here
```

### Webhook Validation:
Zoom will send a POST request to verify your endpoint:
```json
{
  "event": "endpoint.url_validation",
  "payload": {
    "plainToken": "random_string"
  }
}
```

You must respond with:
```json
{
  "plainToken": "random_string",
  "encryptedToken": "hashed_value"
}
```

---

## 11. Configure Webhook Events in Dashboard

### Steps:
1. In the **"Event Subscriptions"** section, click **"Add Event Subscription"**
2. Give it a name (e.g., "Meeting Events")
3. Select the following event types:

### Required Events:

#### Meeting Events:
- ✅ **Start Meeting** - `meeting.started`
- ✅ **End Meeting** - `meeting.ended`
- ✅ **Meeting Registration Created** - `meeting.registration_created`
- ✅ **Meeting Registration Cancelled** - `meeting.registration_cancelled`

#### Participant Events:
- ✅ **Participant Joined Meeting** - `meeting.participant_joined`
- ✅ **Participant Left Meeting** - `meeting.participant_left`

#### Recording Events:
- ✅ **Recording Completed** - `recording.completed`
- ✅ **Recording Transcript Completed** - `recording.transcript_completed`

#### Chat Events:
- ✅ **Chat Message Sent** - `meeting.chat_message_sent`

4. Click **"Save"**
5. Click **"Continue"** and activate the webhook

---

## 12. Implement Webhook Handler in Code

### Complete Webhook Implementation:

```javascript
// webhook-controller.js
const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const databaseService = require('./database-service');

class WebhookController {
  // Verify webhook signature
  verifyWebhookSignature(req) {
    const message = `v0:${req.headers['x-zm-request-timestamp']}:${JSON.stringify(req.body)}`;
    const hashForVerify = crypto
      .createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET_TOKEN)
      .update(message)
      .digest('hex');
    
    const signature = `v0=${hashForVerify}`;
    return signature === req.headers['x-zm-signature'];
  }

  // Handle endpoint validation
  handleValidation(req, res) {
    const { plainToken } = req.body.payload;
    
    const encryptedToken = crypto
      .createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET_TOKEN)
      .update(plainToken)
      .digest('hex');

    res.json({
      plainToken: plainToken,
      encryptedToken: encryptedToken
    });
  }

  // Handle meeting started event
  async handleMeetingStarted(payload) {
    console.log('Meeting Started:', payload.object.id);
    
    await databaseService.updateMeetingStatus(
      payload.object.id,
      'started'
    );

    // Store meeting start details
    await databaseService.storeMeetingEvent({
      meetingId: payload.object.id,
      eventType: 'started',
      eventTime: payload.object.start_time,
      hostId: payload.object.host_id,
      topic: payload.object.topic
    });

    // Additional logic: Send notifications, update analytics, etc.
  }

  // Handle meeting ended event
  async handleMeetingEnded(payload) {
    console.log('Meeting Ended:', payload.object.id);
    
    await databaseService.updateMeetingStatus(
      payload.object.id,
      'ended'
    );

    await databaseService.storeMeetingEvent({
      meetingId: payload.object.id,
      eventType: 'ended',
      eventTime: payload.object.end_time,
      duration: payload.object.duration,
      participantCount: payload.object.participant_count
    });

    // Additional logic: Generate reports, send follow-up emails, etc.
  }

  // Handle participant joined event
  async handleParticipantJoined(payload) {
    console.log('Participant Joined:', payload.object.participant.user_name);
    
    await databaseService.storeParticipantEvent({
      meetingId: payload.object.id,
      participantId: payload.object.participant.id,
      participantUserId: payload.object.participant.user_id,
      participantName: payload.object.participant.user_name,
      participantEmail: payload.object.participant.email || '',
      eventType: 'joined',
      joinTime: payload.object.participant.join_time
    });

    // Additional logic: Track attendance, send welcome message, etc.
  }

  // Handle participant left event
  async handleParticipantLeft(payload) {
    console.log('Participant Left:', payload.object.participant.user_name);
    
    await databaseService.storeParticipantEvent({
      meetingId: payload.object.id,
      participantId: payload.object.participant.id,
      participantUserId: payload.object.participant.user_id,
      participantName: payload.object.participant.user_name,
      eventType: 'left',
      leaveTime: payload.object.participant.leave_time,
      duration: payload.object.participant.duration
    });

    // Additional logic: Calculate participation time, update records, etc.
  }

  // Handle chat message sent event
  async handleChatMessage(payload) {
    console.log('Chat Message:', payload.object.message);
    
    await databaseService.storeChatMessage({
      meetingId: payload.object.meeting_id,
      messageId: payload.object.id,
      senderName: payload.object.sender,
      message: payload.object.message,
      timestamp: payload.object.date_time,
      recipientType: payload.object.receiver // 'all' or specific participant
    });

    // Additional logic: Content moderation, keyword alerts, sentiment analysis, etc.
  }

  // Handle recording completed event
  async handleRecordingCompleted(payload) {
    console.log('Recording Completed:', payload.object.id);
    
    const recordingFiles = payload.object.recording_files;
    
    for (const file of recordingFiles) {
      await databaseService.storeRecording({
        meetingId: payload.object.id,
        meetingUuid: payload.object.uuid,
        recordingId: file.id,
        recordingType: file.recording_type, // 'shared_screen_with_speaker_view', 'audio_only', etc.
        fileType: file.file_type, // 'MP4', 'M4A', 'CHAT', 'TRANSCRIPT'
        fileSize: file.file_size,
        downloadUrl: file.download_url,
        playUrl: file.play_url,
        recordingStart: file.recording_start,
        recordingEnd: file.recording_end,
        status: file.status
      });
    }

    // Additional logic: Process video, generate highlights, send download links, etc.
  }

  // Handle recording transcript completed event
  async handleTranscriptCompleted(payload) {
    console.log('Transcript Completed:', payload.object.id);
    
    const transcriptFiles = payload.object.recording_files.filter(
      file => file.file_type === 'TRANSCRIPT'
    );
    
    for (const transcript of transcriptFiles) {
      await databaseService.storeTranscript({
        meetingId: payload.object.id,
        transcriptId: transcript.id,
        downloadUrl: transcript.download_url,
        fileSize: transcript.file_size,
        recordingStart: transcript.recording_start,
        recordingEnd: transcript.recording_end,
        status: transcript.status
      });

      // Download and process transcript
      await this.processTranscript(transcript.download_url, payload.object.id);
    }

    // Additional logic: Index transcript, extract action items, generate summary, etc.
  }

  // Process transcript file
  async processTranscript(downloadUrl, meetingId) {
    try {
      const zoomService = require('./zoom-service');
      const token = await zoomService.getAccessToken();
      
      const response = await axios.get(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const transcriptText = response.data;
      
      await databaseService.storeTranscriptText({
        meetingId: meetingId,
        transcriptText: transcriptText,
        processedAt: new Date()
      });

      // Parse VTT format if needed
      // Extract speakers and timestamps
      // Perform NLP analysis
      
    } catch (error) {
      console.error('Error processing transcript:', error);
    }
  }

  // Main webhook handler
  async handleWebhook(req, res) {
    try {
      // Handle endpoint validation
      if (req.body.event === 'endpoint.url_validation') {
        return this.handleValidation(req, res);
      }

      // Verify webhook signature
      if (!this.verifyWebhookSignature(req)) {
        console.error('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const { event, payload } = req.body;

      // Route to appropriate handler
      switch (event) {
        case 'meeting.started':
          await this.handleMeetingStarted(payload);
          break;

        case 'meeting.ended':
          await this.handleMeetingEnded(payload);
          break;

        case 'meeting.participant_joined':
          await this.handleParticipantJoined(payload);
          break;

        case 'meeting.participant_left':
          await this.handleParticipantLeft(payload);
          break;

        case 'meeting.chat_message_sent':
          await this.handleChatMessage(payload);
          break;

        case 'recording.completed':
          await this.handleRecordingCompleted(payload);
          break;

        case 'recording.transcript_completed':
          await this.handleTranscriptCompleted(payload);
          break;

        default:
          console.log('Unhandled event:', event);
      }

      res.status(200).json({ message: 'Webhook received' });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

// Express route setup
const webhookController = new WebhookController();

router.post('/webhook', express.json(), (req, res) => {
  webhookController.handleWebhook(req, res);
});

module.exports = router;
```

### Additional Database Tables for Webhook Data:

```sql
-- meeting_events table
CREATE TABLE meeting_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id BIGINT NOT NULL,
    event_type ENUM('started', 'ended', 'paused', 'resumed') NOT NULL,
    event_time DATETIME NOT NULL,
    host_id VARCHAR(100),
    topic VARCHAR(255),
    duration INT,
    participant_count INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_meeting_id (meeting_id),
    INDEX idx_event_type (event_type)
);

-- participant_events table
CREATE TABLE participant_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id BIGINT NOT NULL,
    participant_id VARCHAR(100) NOT NULL,
    participant_user_id VARCHAR(100),
    participant_name VARCHAR(255),
    participant_email VARCHAR(255),
    event_type ENUM('joined', 'left') NOT NULL,
    join_time DATETIME,
    leave_time DATETIME,
    duration INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_meeting_id (meeting_id),
    INDEX idx_participant_id (participant_id)
);

-- chat_messages table
CREATE TABLE chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id BIGINT NOT NULL,
    message_id VARCHAR(100) NOT NULL,
    sender_name VARCHAR(255),
    message TEXT,
    timestamp DATETIME,
    recipient_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_meeting_id (meeting_id)
);

-- recordings table
CREATE TABLE recordings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id BIGINT NOT NULL,
    meeting_uuid VARCHAR(255),
    recording_id VARCHAR(100) NOT NULL UNIQUE,
    recording_type VARCHAR(100),
    file_type VARCHAR(50),
    file_size BIGINT,
    download_url TEXT,
    play_url TEXT,
    recording_start DATETIME,
    recording_end DATETIME,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_meeting_id (meeting_id),
    INDEX idx_recording_id (recording_id)
);

-- transcripts table
CREATE TABLE transcripts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id BIGINT NOT NULL,
    transcript_id VARCHAR(100) NOT NULL,
    download_url TEXT,
    file_size BIGINT,
    transcript_text LONGTEXT,
    recording_start DATETIME,
    recording_end DATETIME,
    status VARCHAR(50),
    processed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_meeting_id (meeting_id)
);
```

---

## 13. Test Webhook Integration

### Testing Steps:

1. **Verify Endpoint URL:**
   - Ensure your webhook URL is accessible
   - Check HTTPS certificate is valid
   - Verify firewall/security group settings

2. **Test Endpoint Validation:**
   ```bash
   # Zoom will automatically send validation request
   # Check your server logs for validation success
   ```

3. **Trigger Test Events:**
   - Create a test meeting
   - Join the meeting
   - Send chat messages
   - Leave the meeting
   - End the meeting

4. **Monitor Webhook Logs:**
   ```javascript
   // Add comprehensive logging
   console.log('Webhook received:', {
     event: req.body.event,
     meetingId: req.body.payload?.object?.id,
     timestamp: new Date().toISOString()
   });
   ```

5. **Verify Database Records:**
   ```sql
   -- Check meeting events
   SELECT * FROM meeting_events ORDER BY created_at DESC LIMIT 10;
   
   -- Check participant events
   SELECT * FROM participant_events ORDER BY created_at DESC LIMIT 10;
   
   -- Check chat messages
   SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT 10;
   
   -- Check recordings
   SELECT * FROM recordings ORDER BY created_at DESC LIMIT 10;
   
   -- Check transcripts
   SELECT * FROM transcripts ORDER BY created_at DESC LIMIT 10;
   ```

6. **Check Webhook Delivery Status:**
   - Go to Zoom Marketplace Dashboard
   - Navigate to your app → Feature → Event Subscriptions
   - View delivery logs and status codes

---

## API Reference - cURL Examples

### 1. Get OAuth Access Token

```bash
curl --location --request POST 'https://zoom.us/oauth/token?grant_type=account_credentials&account_id=06ZPcuahRVqp7ccvwZesZQ' \
--header 'Authorization: Basic WG10SUxBQV9TamVQUWpGdW0zMjhVdzpBdzFLcjdDT0Uwa2pKZDQ0R0dMOHh3N2FRT3lVRVlIVQ==' \
--header 'Content-Type: application/json' \
--header 'Cookie: _zm_currency=INR; _zm_lang=en-US; _zm_mtk_guid=5ba7626f7c4048569abba58c72e8ea21; _zm_visitor_guid=d549f5a1af18487f9e4fa0ea3dc3d214'
```

**Response:**
```json
{
  "access_token": "eyJzdiI6IjAwMDAwMiIsImFsZyI6...",
  "token_type": "bearer",
  "expires_in": 3600,
  "scope": "meeting:write:admin meeting:read:admin..."
}
```

**Notes:**
- Replace `account_id` with your `ZOOM_ACCOUNT_ID`
- The `Authorization: Basic` header is Base64 encoded `CLIENT_ID:CLIENT_SECRET`
- Token expires in 3600 seconds (1 hour)
- Store and reuse token until expiry

---

### 2. Get Meeting Recordings

```bash
curl --location 'https://api.zoom.us/v2/meetings/83933845921/recordings' \
--header 'Authorization: Bearer eyJzdiI6IjAwMDAwMiIsImFsZyI6IkhTNTEyIiwidiI6IjIuMCIsImtpZCI6IjFmNjBlMTBjLWIyZWItNGIzMC1hNjBiLWQ0MzNiMmNlZmZjZiJ9.eyJhdWQiOiJodHRwczovL29hdXRoLnpvb20udXMiLCJ1aWQiOiJteEgtTnh2T1JxU0tqYURPTU1DTUtRIiwidmVyIjoxMCwiYXVpZCI6ImQ4OTRjMWJkN2JkNjViNDA2M2RhNmZhN2ZlMmFhYzQwMWU0ODZhNDRjMjkxOWYwNThlZjllM2EwMThmMjMzY2YiLCJuYmYiOjE3NjUyODY5ODEsImNvZGUiOiI4S29pUGVOZ1JZbUNCNVdEV1NSLWJnUVppWjRSSDdUbVEiLCJpc3MiOiJ6bTpjaWQ6WG10SUxBQV9TamVQUWpGdW0zMjhVdyIsImdubyI6MCwiZXhwIjoxNzY1MjkwNTgxLCJ0eXBlIjozLCJpYXQiOjE3NjUyODY5ODEsImFpZCI6IjA2WlBjdWFoUlZxcDdjY3Z3WmVzWlEifQ.ZEEU2swF_9v4j0OeEVl-dDqk4JAbKooPW1koDPimSkuI9_RwPzGPt_u5u1xFdRqzsSBkM6lWYaZucC7Bg6MK7w' \
--header 'Content-Type: application/json' \
--header 'Cookie: _zm_currency=INR; _zm_lang=en-US; _zm_mtk_guid=5ba7626f7c4048569abba58c72e8ea21; _zm_visitor_guid=d549f5a1af18487f9e4fa0ea3dc3d214'
```

**Response:**
```json
{
  "uuid": "abc123xyz",
  "id": 83933845921,
  "account_id": "06ZPcuahRVqp7ccvwZesZQ",
  "host_id": "mxH-NxvORqSKjaDOM-CMKQ",
  "topic": "My Meeting",
  "start_time": "2024-12-09T10:00:00Z",
  "duration": 60,
  "total_size": 123456789,
  "recording_count": 3,
  "recording_files": [
    {
      "id": "rec123",
      "meeting_id": "83933845921",
      "recording_start": "2024-12-09T10:00:00Z",
      "recording_end": "2024-12-09T11:00:00Z",
      "file_type": "MP4",
      "file_extension": "MP4",
      "file_size": 98765432,
      "play_url": "https://zoom.us/rec/play/...",
      "download_url": "https://zoom.us/rec/download/...",
      "status": "completed",
      "recording_type": "shared_screen_with_speaker_view"
    },
    {
      "id": "rec124",
      "meeting_id": "83933845921",
      "recording_start": "2024-12-09T10:00:00Z",
      "recording_end": "2024-12-09T11:00:00Z",
      "file_type": "TRANSCRIPT",
      "file_extension": "VTT",
      "file_size": 12345,
      "download_url": "https://zoom.us/rec/download/...",
      "status": "completed",
      "recording_type": "audio_transcript"
    }
  ]
}
```

**Notes:**
- Replace `83933845921` with your meeting ID
- Replace the Bearer token with your valid access token
- Returns all recordings and transcripts for the meeting
- Check `status` field - should be "completed" before downloading

---

### 3. Download Recording Transcript

```bash
curl --location 'https://us06web.zoom.us/rec/download/m3B2j8yyikZjtxWShShgAbDTGE5_3cKk3VutHGkcKG0BjKxxyyWh1kBQCasatToN__ariZAizzuOhsA_.23nFOzlQJNVYk2qE?type=cc' \
--header 'Authorization: Bearer eyJzdiI6IjAwMDAwMiIsImFsZyI6IkhTNTEyIiwidiI6IjIuMCIsImtpZCI6IjFmNjBlMTBjLWIyZWItNGIzMC1hNjBiLWQ0MzNiMmNlZmZjZiJ9.eyJhdWQiOiJodHRwczovL29hdXRoLnpvb20udXMiLCJ1aWQiOiJteEgtTnh2T1JxU0tqYURPTU1DTUtRIiwidmVyIjoxMCwiYXVpZCI6ImQ4OTRjMWJkN2JkNjViNDA2M2RhNmZhN2ZlMmFhYzQwMWU0ODZhNDRjMjkxOWYwNThlZjllM2EwMThmMjMzY2YiLCJuYmYiOjE3NjUyODY5ODEsImNvZGUiOiI4S29pUGVOZ1JZbUNCNVdEV1NSLWJnUVppWjRSSDdUbVEiLCJpc3MiOiJ6bTpjaWQ6WG10SUxBQV9TamVQUWpGdW0zMjhVdyIsImdubyI6MCwiZXhwIjoxNzY1MjkwNTgxLCJ0eXBlIjozLCJpYXQiOjE3NjUyODY5ODEsImFpZCI6IjA2WlBjdWFoUlZxcDdjY3Z3WmVzWlEifQ.ZEEU2swF_9v4j0OeEVl-dDqk4JAbKooPW1koDPimSkuI9_RwPzGPt_u5u1xFdRqzsSBkM6lWYaZucC7Bg6MK7w' \
--header 'Cookie: _zm_currency=INR; _zm_lang=en-US; _zm_mtk_guid=5ba7626f7c4048569abba58c72e8ea21; _zm_visitor_guid=d549f5a1af18487f9e4fa0ea3dc3d214' \
--output transcript.vtt
```

**Response:** VTT Format Transcript File
```
WEBVTT

1
00:00:00.000 --> 00:00:03.500
<v Speaker 1>Hello everyone, welcome to the meeting.</v>

2
00:00:03.500 --> 00:00:07.200
<v Speaker 2>Thanks for having me, excited to be here.</v>

3
00:00:07.200 --> 00:00:11.800
<v Speaker 1>Let's start with the agenda for today.</v>
```

**Notes:**
- Use the `download_url` from the recordings API response
- The `type=cc` parameter specifies closed caption/transcript
- Replace the Bearer token with your valid access token
- Add `--output filename.vtt` to save the file locally
- VTT format includes timestamps and speaker identification

---

## Complete Implementation with cURL Examples

### Node.js Implementation for All Three Operations:

```javascript
// zoom-api-client.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ZoomAPIClient {
  constructor() {
    this.accountId = process.env.ZOOM_ACCOUNT_ID;
    this.clientId = process.env.ZOOM_CLIENT_ID;
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // 1. Get Access Token (First cURL)
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(
        `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${this.accountId}`,
        {},
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
      
      console.log('Access token obtained successfully');
      return this.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error.response?.data || error.message);
      throw error;
    }
  }

  // 2. Get Meeting Recordings (Second cURL)
  async getMeetingRecordings(meetingId) {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.get(
        `https://api.zoom.us/v2/meetings/${meetingId}/recordings`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Recording data retrieved successfully');
      return response.data;
    } catch (error) {
      console.error('Error getting recordings:', error.response?.data || error.message);
      throw error;
    }
  }

  // 3. Download Recording Transcript (Third cURL)
  async downloadTranscript(downloadUrl, outputPath) {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.get(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'stream'
      });

      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log('Transcript downloaded successfully:', outputPath);
          resolve(outputPath);
        });
        writer.on('error', reject);
      });
    } catch (error) {
      console.error('Error downloading transcript:', error.response?.data || error.message);
      throw error;
    }
  }

  // Helper: Download all recordings and transcripts for a meeting
  async downloadAllMeetingContent(meetingId, outputDir) {
    try {
      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Get recording data
      const recordingData = await this.getMeetingRecordings(meetingId);
      
      console.log(`Found ${recordingData.recording_files.length} recording files`);

      const downloads = [];

      for (const file of recordingData.recording_files) {
        const fileName = `${meetingId}_${file.recording_type}_${file.id}.${file.file_extension.toLowerCase()}`;
        const filePath = path.join(outputDir, fileName);

        console.log(`Downloading ${file.file_type}: ${fileName}`);
        
        if (file.file_type === 'TRANSCRIPT') {
          // Download transcript
          const downloadPromise = this.downloadTranscript(file.download_url, filePath);
          downloads.push(downloadPromise);
        } else if (file.file_type === 'MP4' || file.file_type === 'M4A') {
          // Download video/audio recording
          const downloadPromise = this.downloadRecordingFile(file.download_url, filePath);
          downloads.push(downloadPromise);
        }
      }

      await Promise.all(downloads);
      console.log('All files downloaded successfully');
      
      return {
        meetingId: recordingData.id,
        topic: recordingData.topic,
        filesDownloaded: downloads.length,
        outputDir: outputDir
      };
    } catch (error) {
      console.error('Error downloading meeting content:', error);
      throw error;
    }
  }

  // Download any recording file
  async downloadRecordingFile(downloadUrl, outputPath) {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.get(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'stream'
      });

      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log('File downloaded successfully:', outputPath);
          resolve(outputPath);
        });
        writer.on('error', reject);
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }
}

module.exports = new ZoomAPIClient();
```

### Usage Example:

```javascript
// example-usage.js
const zoomClient = require('./zoom-api-client');

async function main() {
  try {
    // Example 1: Get access token
    const token = await zoomClient.getAccessToken();
    console.log('Token obtained');

    // Example 2: Get meeting recordings
    const meetingId = '83933845921';
    const recordings = await zoomClient.getMeetingRecordings(meetingId);
    console.log('Recordings:', recordings);

    // Example 3: Download specific transcript
    const transcriptUrl = recordings.recording_files.find(
      f => f.file_type === 'TRANSCRIPT'
    )?.download_url;
    
    if (transcriptUrl) {
      await zoomClient.downloadTranscript(
        transcriptUrl,
        './downloads/transcript.vtt'
      );
    }

    // Example 4: Download all content for a meeting
    await zoomClient.downloadAllMeetingContent(
      meetingId,
      './downloads/meeting_' + meetingId
    );

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
```

---

## Troubleshooting Common Issues

### Issue 1: Invalid Token / 401 Unauthorized
**Solution:**
- Verify CLIENT_ID and CLIENT_SECRET are correct
- Ensure account_id is correct
- Check if app is activated in Zoom Marketplace
- Verify scopes are properly configured

### Issue 2: Recording Not Found / 404
**Solution:**
- Ensure recording is completed (check status)
- Cloud recording must be enabled for the meeting
- Recording may take time to process after meeting ends
- Verify meeting ID is correct

### Issue 3: Download URL Expired
**Solution:**
- Download URLs expire after a certain time
- Get fresh recording data before downloading
- Download immediately after retrieving URLs

### Issue 4: Missing Transcript
**Solution:**
- Enable "Audio Transcript" in Zoom account settings
- Ensure meeting had audio conversation
- Transcript processing takes 10-15 minutes after meeting
- Check recording_files array for file_type: "TRANSCRIPT"

---

## Security Best Practices

1. **Never Expose Credentials:**
   ```javascript
   // ❌ BAD - Don't hardcode
   const clientId = 'XmtILAA_SjePQjFum328Uw';
   
   // ✅ GOOD - Use environment variables
   const clientId = process.env.ZOOM_CLIENT_ID;
   ```

2. **Secure Token Storage:**
   - Store tokens in memory, not localStorage
   - Refresh before expiry
   - Never log tokens to console in production

3. **Validate Webhook Signatures:**
   - Always verify x-zm-signature header
   - Use constant-time comparison
   - Reject invalid signatures immediately

4. **Rate Limiting:**
   - Implement request throttling
   - Cache responses when possible
   - Handle 429 Too Many Requests errors

5. **HTTPS Only:**
   - All webhook endpoints must use HTTPS
   - Validate SSL certificates
   - Use secure connections for downloads

---

## Additional Resources

- [Zoom API Documentation](https://developers.zoom.us/docs/api/)
- [Zoom Webhook Events](https://developers.zoom.us/docs/api/rest/webhook-reference/)
- [OAuth Implementation Guide](https://developers.zoom.us/docs/integrations/oauth/)
- [Recording API Reference](https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/recordingGet)

---

## Quick Reference Commands

```bash
# Get Access Token
curl -X POST "https://zoom.us/oauth/token?grant_type=account_credentials&account_id=YOUR_ACCOUNT_ID" \
  -H "Authorization: Basic BASE64_ENCODED_CREDENTIALS" \
  -H "Content-Type: application/json"

# Get Meeting Recordings
curl "https://api.zoom.us/v2/meetings/MEETING_ID/recordings" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Download Transcript
curl "TRANSCRIPT_DOWNLOAD_URL" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -o transcript.vtt

# Get Meeting Details
curl "https://api.zoom.us/v2/meetings/MEETING_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# List User Meetings
curl "https://api.zoom.us/v2/users/me/meetings" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"