# Zoom Automation Implementation Guide

This comprehensive guide covers all steps needed to implement Zoom integration in the Top Tutors Connect platform, including both Zoom Marketplace Dashboard configuration and code implementation.

---

## Table of Contents

1. [Zoom Marketplace Dashboard Setup](#1-zoom-marketplace-dashboard-setup)
2. [Environment Variables Configuration](#2-environment-variables-configuration)
3. [Code Implementation](#3-code-implementation)
4. [Database Schema](#4-database-schema)
5. [Testing & Verification](#5-testing--verification)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Zoom Marketplace Dashboard Setup

### Step 1: Sign In to Zoom Marketplace

1. Go to [Zoom Marketplace](https://marketplace.zoom.us/)
2. Click **"Sign In"** in the top right corner
3. Sign in with your Zoom account credentials
   - **Note**: You need a Zoom account with admin privileges or the ability to create apps

### Step 2: Create App

1. After signing in, click **"Develop"** → **"Build App"** in the top navigation
2. Click **"Create"** button
3. Select **"Server-to-Server OAuth"** app type
   - This is the recommended type for backend integrations
   - It allows your application to make API calls on behalf of your Zoom account
4. Fill in the app information:
   - **App Name**: `Top Tutors Connect` (or your preferred name)
   - **Company Name**: Your company name
   - **Developer Email**: Your email address
   - **App Description**: Brief description of your app
5. Click **"Create"** to proceed

### Step 3: Create OAuth Credentials

After creating the app, you'll be taken to the app's configuration page. Here you need to:

#### 3.1 Get Account ID

1. In the **"App Credentials"** section, you'll see:
   - **Account ID** (this is your `ZOOM_ACCOUNT_ID`)
   - Copy this value - you'll need it for environment variables

#### 3.2 Create OAuth Client

1. Scroll down to **"App Credentials"** section
2. You'll see:
   - **Client ID** (this is your `ZOOM_CLIENT_ID`)
   - **Client Secret** (this is your `ZOOM_CLIENT_SECRET`)
3. **Important**: The Client Secret is only shown once. Copy it immediately and store it securely.
4. If you missed it, you can regenerate it, but the old one will stop working.

#### 3.3 Required Scopes

Navigate to **"Scopes"** tab and add the following scopes:

**Meeting Scopes:**
- ✅ `meeting:write:meeting` - Create and manage meetings
- ✅ `meeting:read:meeting` - Read meeting information
- ✅ `meeting:write:registrant` - Register participants to meetings
- ✅ `meeting:read:registrant` - Read registration information

**Recording Scopes:**
- ✅ `recording:read:recording` - Read recording information
- ✅ `recording:read:recording:admin` - Admin access to recordings

**Webhook Scopes:**
- ✅ `webinar:read:webinar` (if using webinars)
- ✅ `meeting:read:participant` - Read participant information

**Chat Scopes (Optional but Recommended):**
- ✅ `meeting:read:chat_message` - Read chat messages from meetings

After adding scopes, click **"Save"** and then **"Activate"** your app.

### Step 4: Configure Webhook

1. Navigate to **"Feature"** tab in your app configuration
2. Scroll to **"Event Subscriptions"** section
3. Click **"Add Event Subscription"**
4. Fill in the webhook configuration:

   **Subscription Name**: `Top Tutors Webhooks`
   
   **Event notification endpoint URL**: 
   ```
   https://your-domain.com/api/zoom/webhook
   ```
   - Replace `your-domain.com` with your actual production domain
   - For local testing, use a tunneling service like ngrok: `https://your-ngrok-url.ngrok.io/api/zoom/webhook`

5. **Subscribe to event types** - Select the following events:

   **Meeting Events:**
   - ✅ `meeting.started` - Meeting has started
   - ✅ `meeting.ended` - Meeting has ended
   - ✅ `meeting.participant_joined` - Participant joined meeting
   - ✅ `meeting.participant_left` - Participant left meeting

   **Recording Events:**
   - ✅ `recording.completed` - Recording has completed processing
   - ✅ `recording.transcript_completed` - Transcript has been generated

   **Optional Events:**
   - ⚠️ `meeting.chat_message_sent` - Chat message sent (if chat tracking is needed)

6. Click **"Save"** to save the webhook configuration

### Step 5: Generate Webhook Secret Token

1. In the **"Event Subscriptions"** section, you'll see a **"Verification Token"** field
2. Click **"Generate"** or **"Edit"** to set a custom token
3. **Important**: This token must be:
   - At least 8 characters long
   - Stored securely (this is your `ZOOM_WEBHOOK_SECRET_TOKEN`)
   - Never exposed in client-side code
4. Copy this token - you'll need it for environment variables
5. Click **"Save"** to save the token

### Step 6: Activate Your App

1. After configuring all settings, go to **"Activation"** tab
2. Review the activation status
3. Click **"Activate"** to activate your app
4. You may need to accept Zoom's terms and conditions
5. Once activated, your app is ready to use

---

## 2. Environment Variables Configuration

### Step 7: Add Environment Variables to Your Project

Add the following environment variables to your `.env` file (or your deployment environment):

```env
# Zoom OAuth Credentials (from Step 3)
ZOOM_ACCOUNT_ID=your_account_id_here
ZOOM_CLIENT_ID=your_client_id_here
ZOOM_CLIENT_SECRET=your_client_secret_here

# Zoom Webhook Configuration (from Step 5)
ZOOM_WEBHOOK_SECRET_TOKEN=your_webhook_secret_token_here

# Zoom Registration Feature (Optional - defaults to enabled)
USE_ZOOM_REGISTRATION=true

# Legacy JWT Credentials (Optional - for backward compatibility)
# Only needed if you're using JWT authentication instead of OAuth
ZOOM_API_KEY=your_api_key_here
ZOOM_API_SECRET=your_api_secret_here

# Mock Zoom Service (for development/testing)
# Set to 'true' to use mock service instead of real Zoom API
USE_MOCK_ZOOM=false
```

### Step 8: Verify Environment Variables

After adding the environment variables, restart your server and verify they're loaded:

```bash
# Check if variables are loaded (in your server logs)
# You should see: "🔧 [ZOOM SERVICE] Using REAL Zoom service"
```

---

## 3. Code Implementation

### Step 9: Create Meeting in Code

The meeting creation is already implemented in the codebase. Here's how it works:

#### 9.1 Meeting Creation Service

**File**: `Backend/services/realZoomService.js`

The service uses Server-to-Server OAuth to authenticate and create meetings:

```javascript
// OAuth token is automatically obtained
async createMeeting({ topic, start_time, duration, timezone, agenda, settings = {} }) {
  // Automatically gets OAuth token
  // Creates meeting via Zoom API
  // Returns meeting details including meeting ID and join URLs
}
```

#### 9.2 Create Meeting for Session

**File**: `Backend/services/zoomService.js`

When creating a meeting for a session:

```javascript
async createSessionMeeting(session) {
  // Creates Zoom meeting
  // Registers participants (if enabled)
  // Stores meeting link in database
  // Returns meeting details
}
```

#### 9.3 API Endpoint

**File**: `Backend/routes/zoomRoutes.js`

```javascript
POST /api/zoom/sessions/:sessionId/meeting
```

**Usage Example:**
```javascript
// Frontend call
const response = await api.post(`/zoom/sessions/${sessionId}/meeting`);
// Returns: { success: true, meeting: {...}, sessionId: ... }
```

### Step 10: Add Registration Process with Email

Registration is automatically handled when creating meetings (if `USE_ZOOM_REGISTRATION=true`).

#### 10.1 Registration Flow

**File**: `Backend/services/zoomService.js` → `createSessionMeeting()`

1. Meeting is created with `registration_type: 2` (required registration)
2. For each student in the pod:
   - Student is registered via Zoom API
   - Registration data is stored in database
   - Unique join URL is generated for each student

#### 10.2 Registration Service

**File**: `Backend/services/realZoomService.js`

```javascript
async registerParticipantToZoom(meetingId, email, firstName, lastName) {
  // Registers participant to Zoom meeting
  // Returns: { registrantId, participantUUID, joinUrl, email }
}
```

#### 10.3 Manual Registration Endpoint

If you need to register participants after meeting creation:

```javascript
POST /api/zoom/sessions/:sessionId/register-participants
```

This endpoint:
- Gets all students in the session's pod
- Registers each student to the Zoom meeting
- Stores registration data in database
- Returns registration results

### Step 11: Store Meeting Link in Database

Meeting links are automatically stored when creating meetings.

#### 11.1 Database Storage

**File**: `Backend/models/sessionModel.js`

The `updateSession()` function stores:
- `zoom_link` - The join URL for students
- `zoom_meeting_id` - The Zoom meeting ID
- `notes` - Meeting notes including password

#### 11.2 Registration Storage

**File**: `Backend/models/sessionParticipantRegistrationModel.js`

Registration data is stored in `session_participant_registrations` table:
- `session_id` - Links to session
- `user_id` - Links to user (student/tutor)
- `zoom_meeting_id` - Zoom meeting ID
- `participant_uuid` - Unique participant identifier
- `registrant_id` - Zoom registrant ID
- `email` - Participant email
- `role` - 'student' or 'tutor'
- `join_url` - Unique join URL for this participant

### Step 12: Webhook Implementation

Webhooks are already implemented in the codebase.

#### 12.1 Webhook Endpoint

**File**: `Backend/routes/zoomRoutes.js`

```javascript
POST /api/zoom/webhook
```

This endpoint:
- Verifies webhook signature
- Handles URL validation
- Processes different event types

#### 12.2 Webhook Handler

**File**: `Backend/controllers/zoomWebhookController.js`

The `handleZoomWebhook()` function processes:
- `endpoint.url_validation` - Initial webhook verification
- `meeting.participant_joined` - Participant join events
- `meeting.participant_left` - Participant leave events
- `meeting.ended` - Meeting end events
- `recording.completed` - Recording completion
- `recording.transcript_completed` - Transcript completion

### Step 13: Implement Join/Leave Functionality

Join and leave tracking is implemented via webhooks.

#### 13.1 Join Event Handler

**File**: `Backend/controllers/zoomWebhookController.js` → `handleParticipantJoined()`

**What it does:**
1. Receives `meeting.participant_joined` event from Zoom
2. Identifies participant (student or tutor) by:
   - Registration UUID lookup
   - Registrant ID lookup
   - Email matching
   - Host ID matching
3. Updates database:
   - `session_artifacts.tutor_join_time` (if tutor)
   - `session_artifacts.student_join_time` (if student)
   - `session_student_join_times` table (for individual student tracking)
   - `session_attendance` table

**Database Updates:**
```sql
-- Tutor join
UPDATE session_artifacts 
SET tutor_join_time = $1, tutor_name = $2 
WHERE session_id = $3;

-- Student join
UPDATE session_artifacts 
SET student_join_time = $1, student_name = $2 
WHERE session_id = $3;

INSERT INTO session_student_join_times (session_id, student_id, join_time)
VALUES ($1, $2, $3);
```

#### 13.2 Leave Event Handler

**File**: `Backend/controllers/zoomWebhookController.js` → `handleParticipantLeft()`

**What it does:**
1. Receives `meeting.participant_left` event from Zoom
2. Identifies participant using same methods as join
3. Updates database:
   - `session_artifacts.tutor_end_time` (if tutor)
   - `session_artifacts.student_end_time` (if student)
   - `session_student_end_times` table
   - Calculates duration

**Database Updates:**
```sql
-- Tutor leave
UPDATE session_artifacts 
SET tutor_end_time = $1 
WHERE session_id = $2;

-- Student leave
UPDATE session_artifacts 
SET student_end_time = $1 
WHERE session_id = $2;

INSERT INTO session_student_end_times (session_id, student_id, end_time)
VALUES ($1, $2, $3);
```

### Step 14: Implement Zoom Chats Functionality

Chat functionality is implemented to capture and store chat messages.

#### 14.1 Chat Transcript Retrieval

**File**: `Backend/services/realZoomService.js` → `getMeetingChatTranscript()`

**What it does:**
1. Gets meeting recordings
2. Finds chat transcript file (file_type: 'CHAT')
3. Downloads chat transcript
4. Returns chat content

#### 14.2 Chat Import Handler

**File**: `Backend/controllers/zoomWebhookController.js` → `importZoomChatTranscript()`

**What it does:**
1. Fetches chat transcript from Zoom API
2. Parses chat messages (handles multiple formats)
3. Identifies sender (tutor vs student)
4. Stores messages in:
   - `messages` table (for DM conversations)
   - `session_artifacts.zoom_chat_log` (for session artifacts)

**Chat Parsing:**
- Supports tab-separated format: `HH:MM:SS\tName:\tmessage`
- Supports timestamp formats: `HH:MM:SS Name: message`
- Supports JSON format
- Identifies sender by name/email matching

#### 14.3 Chat Storage

**Database Tables:**
- `messages` - Individual chat messages in DM conversations
- `session_artifacts.zoom_chat_log` - JSONB field storing:
  ```json
  {
    "messages": [...],
    "raw_transcript": "...",
    "transcript_file_name": "...",
    "transcript_file_url": "...",
    "imported_at": "...",
    "imported_count": 10,
    "parse_success": true
  }
  ```

### Step 15: Implement Zoom Recording Functionality

Recording functionality captures and processes meeting recordings.

#### 15.1 Recording Event Handler

**File**: `Backend/controllers/zoomWebhookController.js` → `handleRecordingCompleted()`

**What it does:**
1. Receives `recording.completed` event from Zoom
2. Gets recording files from webhook payload
3. Finds video recording file (prefers MP4, falls back to M4A)
4. Triggers recording ingestion pipeline
5. Downloads and processes transcript

#### 15.2 Recording Ingestion Service

**File**: `Backend/services/recordingIngestionService.js` (referenced in webhook)

**What it does:**
1. Downloads recording from Zoom
2. Uploads to S3 (AWS)
3. Generates transcript using OpenAI Whisper (if enabled)
4. Stores recording URL in `session_artifacts.recording_url`
5. Updates session status

#### 15.3 Recording Storage

**Database Storage:**
- `session_artifacts.recording_url` - S3 URL of the recording
- `session_artifacts.recording_file_name` - Original filename
- `session_artifacts.recording_file_size` - File size
- `session_artifacts.recording_duration` - Duration in seconds

### Step 16: Implement Zoom Transcript Text Functionality

Transcript functionality captures and processes meeting transcripts.

#### 16.1 Transcript Download Service

**File**: `Backend/services/realZoomService.js` → `downloadMeetingTranscript()`

**What it does:**
1. Gets OAuth access token
2. Fetches meeting recordings
3. Finds transcript file (file_type: 'TRANSCRIPT' or 'VTT')
4. Downloads transcript file
5. Returns transcript content

#### 16.2 Transcript Processing

**File**: `Backend/services/transcriptParserService.js` (referenced in webhook)

**What it does:**
1. Parses WEBVTT format transcript
2. Extracts speaker information
3. Creates structured JSON format:
   ```json
   {
     "messages": [
       {
         "speaker": "Speaker 1",
         "text": "Hello everyone",
         "timestamp": "00:00:05.000",
         "start_time": 5.0,
         "end_time": 7.5
       }
     ],
     "metadata": {
       "total_messages": 100,
       "duration": 3600,
       "format": "webvtt"
     }
   }
   ```

#### 16.3 Transcript Event Handler

**File**: `Backend/controllers/zoomWebhookController.js` → `handleRecordingTranscriptCompleted()`

**What it does:**
1. Receives `recording.transcript_completed` event
2. Downloads transcript from Zoom
3. Processes transcript (WEBVTT → structured JSON)
4. Stores in `session_artifacts.transcript_text` (JSONB field)

#### 16.4 Transcript Storage

**Database Storage:**
- `session_artifacts.transcript_text` - JSONB field containing structured transcript
- `session_artifacts.transcript_file_url` - Original transcript file URL
- `session_artifacts.transcript_file_name` - Transcript filename

---

## 4. Database Schema

### Required Tables

The following tables are used for Zoom integration:

#### 4.1 Sessions Table

```sql
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS zoom_link TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS zoom_meeting_id VARCHAR(255);
```

#### 4.2 Session Artifacts Table

```sql
CREATE TABLE IF NOT EXISTS session_artifacts (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id),
  tutor_join_time TIMESTAMP,
  tutor_end_time TIMESTAMP,
  student_join_time TIMESTAMP,
  student_end_time TIMESTAMP,
  tutor_name VARCHAR(255),
  student_name VARCHAR(255),
  recording_url TEXT,
  recording_file_name VARCHAR(255),
  recording_file_size BIGINT,
  recording_duration INTEGER,
  transcript_text JSONB,
  transcript_file_url TEXT,
  transcript_file_name VARCHAR(255),
  zoom_chat_log JSONB,
  actual_duration INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 4.3 Session Participant Registrations Table

```sql
CREATE TABLE IF NOT EXISTS session_participant_registrations (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id),
  user_id INTEGER REFERENCES users(id),
  zoom_meeting_id VARCHAR(255),
  participant_uuid VARCHAR(255),
  registrant_id VARCHAR(255),
  email VARCHAR(255),
  role VARCHAR(50), -- 'student' or 'tutor'
  join_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, user_id, zoom_meeting_id)
);
```

#### 4.4 Session Student Join Times Table

```sql
CREATE TABLE IF NOT EXISTS session_student_join_times (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id),
  student_id INTEGER REFERENCES users(id),
  join_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4.5 Session Student End Times Table

```sql
CREATE TABLE IF NOT EXISTS session_student_end_times (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id),
  student_id INTEGER REFERENCES users(id),
  end_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5. Testing & Verification

### Step 17: Test Meeting Creation

1. **Create a test session:**
   ```bash
   POST /api/zoom/sessions/:sessionId/meeting
   ```

2. **Verify in Zoom:**
   - Log into Zoom web portal
   - Check "Meetings" section
   - Verify meeting was created

3. **Verify in database:**
   ```sql
   SELECT zoom_link, zoom_meeting_id FROM sessions WHERE id = :sessionId;
   ```

### Step 18: Test Registration

1. **Check registrations:**
   ```sql
   SELECT * FROM session_participant_registrations WHERE session_id = :sessionId;
   ```

2. **Verify join URLs:**
   - Each student should have a unique join URL
   - Tutor should have a registration record

### Step 19: Test Webhook Verification

1. **Zoom will send validation request:**
   - When you add webhook URL in Zoom dashboard
   - Check server logs for: "Zoom URL validation event received"
   - Should return 200 with `plainToken` and `encryptedToken`

2. **Test webhook signature:**
   - Zoom sends events with signature headers
   - Verify signature is validated correctly
   - Check logs for: "Incoming Zoom event: meeting.participant_joined"

### Step 20: Test Join/Leave Tracking

1. **Join meeting as tutor:**
   - Use tutor's join URL or start URL
   - Check database:
     ```sql
     SELECT tutor_join_time, tutor_name FROM session_artifacts WHERE session_id = :sessionId;
     ```

2. **Join meeting as student:**
   - Use student's unique join URL
   - Check database:
     ```sql
     SELECT student_join_time, student_name FROM session_artifacts WHERE session_id = :sessionId;
     SELECT * FROM session_student_join_times WHERE session_id = :sessionId;
     ```

3. **Leave meeting:**
   - Leave as student/tutor
   - Check database for end times
   - Verify duration is calculated

### Step 21: Test Recording

1. **Enable recording in meeting:**
   - Start meeting as host
   - Click "Record" button
   - End meeting

2. **Wait for webhook:**
   - `recording.completed` event should be received
   - Check logs for: "Recording processing completed"

3. **Verify recording:**
   ```sql
   SELECT recording_url, recording_file_name FROM session_artifacts WHERE session_id = :sessionId;
   ```

4. **Check S3:**
   - Verify file is uploaded to S3 bucket
   - Verify file is accessible

### Step 22: Test Transcript

1. **Wait for transcript:**
   - After recording completes, Zoom generates transcript
   - `recording.transcript_completed` event should be received

2. **Verify transcript:**
   ```sql
   SELECT transcript_text, transcript_file_name FROM session_artifacts WHERE session_id = :sessionId;
   ```

3. **Check transcript format:**
   - Should be structured JSON
   - Should contain messages array
   - Should have timestamps

### Step 23: Test Chat

1. **Send chat messages in meeting:**
   - Send messages as tutor
   - Send messages as student

2. **Wait for chat import:**
   - Chat is imported when meeting ends
   - Check logs for: "Chat messages stored in session_artifacts"

3. **Verify chat:**
   ```sql
   SELECT zoom_chat_log FROM session_artifacts WHERE session_id = :sessionId;
   ```

4. **Check messages table:**
   ```sql
   SELECT * FROM messages WHERE session_id = :sessionId ORDER BY created_at;
   ```

---

## 6. Troubleshooting

### Issue: Webhooks Not Received

**Symptoms:**
- No webhook events in logs
- Join/leave times not tracked

**Solutions:**
1. **Check webhook URL is publicly accessible:**
   - Use ngrok for local testing: `ngrok http 4000`
   - Update webhook URL in Zoom dashboard

2. **Verify webhook secret token:**
   ```env
   ZOOM_WEBHOOK_SECRET_TOKEN=your_token_here
   ```
   - Must match token in Zoom dashboard

3. **Check firewall/security groups:**
   - Allow Zoom IP addresses
   - Check Zoom's IP ranges documentation

4. **Verify event subscriptions:**
   - Check Zoom dashboard → Event Subscriptions
   - Ensure events are subscribed

### Issue: Meeting Creation Fails

**Symptoms:**
- Error: "Missing required scopes"
- Error: "Authentication failed"

**Solutions:**
1. **Check OAuth credentials:**
   ```env
   ZOOM_ACCOUNT_ID=...
   ZOOM_CLIENT_ID=...
   ZOOM_CLIENT_SECRET=...
   ```

2. **Verify scopes:**
   - Go to Zoom dashboard → Scopes
   - Ensure `meeting:write:meeting` is added and activated

3. **Check app activation:**
   - App must be activated in Zoom dashboard
   - Check activation status

### Issue: Registration Fails

**Symptoms:**
- Error: "Registration requires paid account"
- Students can't register

**Solutions:**
1. **Check Zoom account type:**
   - Free accounts don't support API registration
   - Upgrade to Pro, Business, or Enterprise

2. **Disable registration (if needed):**
   ```env
   USE_ZOOM_REGISTRATION=false
   ```
   - Students can still join via generic link

3. **Verify registration scopes:**
   - `meeting:write:registrant` must be added
   - `meeting:read:registrant` must be added

### Issue: Recordings Not Downloading

**Symptoms:**
- Recording webhook received but no file
- Error: "No recording file found"

**Solutions:**
1. **Check recording scopes:**
   - `recording:read:recording` must be added
   - `recording:read:recording:admin` must be added

2. **Verify AWS credentials:**
   ```env
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_REGION=...
   AWS_S3_BUCKET=...
   ```

3. **Check S3 bucket permissions:**
   - Bucket must allow uploads
   - IAM user must have write permissions

### Issue: Transcript Not Generated

**Symptoms:**
- Recording completed but no transcript
- Error: "No transcript available"

**Solutions:**
1. **Enable transcription in Zoom:**
   - Meeting settings → Recording → Audio transcript
   - Must be enabled before meeting starts

2. **Check transcript scopes:**
   - Same as recording scopes
   - Verify scopes are activated

3. **Wait for processing:**
   - Transcript generation takes time
   - Check for `recording.transcript_completed` event

### Issue: Chat Not Imported

**Symptoms:**
- Meeting ended but no chat messages
- Chat log is empty

**Solutions:**
1. **Check chat recording:**
   - Meeting must have chat recording enabled
   - Check Zoom meeting settings

2. **Verify chat scopes:**
   - `meeting:read:chat_message` (optional but recommended)

3. **Check chat file:**
   - Zoom must generate chat file
   - Check recording files for CHAT type

### Issue: Participant Identification Fails

**Symptoms:**
- Join/leave events received but participant not identified
- Logs show: "Unknown participant joined"

**Solutions:**
1. **Check registration:**
   - Participants should be registered before joining
   - Verify `session_participant_registrations` table

2. **Verify email matching:**
   - Participant email must match user email in database
   - Check `users.email` matches Zoom participant email

3. **Check registration UUID:**
   - Webhook uses `participant_uuid` to identify
   - Verify UUID is stored in registration table

---

## Additional Steps & Best Practices

### Step 24: Monitor Webhook Events

Set up logging to monitor all webhook events:

```javascript
// In zoomWebhookController.js
console.log('Incoming Zoom event:', event.event);
console.log('Event payload:', JSON.stringify(event.payload, null, 2));
```

### Step 25: Error Handling

Ensure all webhook handlers have proper error handling:

```javascript
try {
  await handleParticipantJoined(event);
} catch (error) {
  console.error('Error handling participant_joined:', error);
  // Don't throw - return 200 so Zoom doesn't retry
}
```

### Step 26: Rate Limiting

Zoom API has rate limits. Implement rate limiting if creating many meetings:

```javascript
// Add delay between requests
await new Promise(resolve => setTimeout(resolve, 100));
```

### Step 27: Security Best Practices

1. **Never expose secrets:**
   - Keep all Zoom credentials in environment variables
   - Never commit `.env` file to git

2. **Verify webhook signatures:**
   - Always verify webhook signatures
   - Reject unsigned requests

3. **Use HTTPS:**
   - Webhook URLs must use HTTPS
   - Use SSL certificates

### Step 28: Database Indexing

Add indexes for better performance:

```sql
CREATE INDEX IF NOT EXISTS idx_sessions_zoom_meeting_id ON sessions(zoom_meeting_id);
CREATE INDEX IF NOT EXISTS idx_registrations_participant_uuid ON session_participant_registrations(participant_uuid);
CREATE INDEX IF NOT EXISTS idx_registrations_registrant_id ON session_participant_registrations(registrant_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_session_id ON session_artifacts(session_id);
```

---

## Summary Checklist

### Zoom Marketplace Dashboard ✅
- [ ] Signed in to Zoom Marketplace
- [ ] Created Server-to-Server OAuth app
- [ ] Copied Account ID, Client ID, Client Secret
- [ ] Added required scopes
- [ ] Configured webhook URL
- [ ] Generated webhook secret token
- [ ] Activated app

### Environment Variables ✅
- [ ] Added ZOOM_ACCOUNT_ID
- [ ] Added ZOOM_CLIENT_ID
- [ ] Added ZOOM_CLIENT_SECRET
- [ ] Added ZOOM_WEBHOOK_SECRET_TOKEN
- [ ] Configured USE_ZOOM_REGISTRATION (optional)
- [ ] Restarted server

### Code Implementation ✅
- [ ] Meeting creation works
- [ ] Registration process works
- [ ] Meeting links stored in database
- [ ] Webhook endpoint configured
- [ ] Join/leave tracking works
- [ ] Chat import works
- [ ] Recording download works
- [ ] Transcript processing works

### Testing ✅
- [ ] Tested meeting creation
- [ ] Tested participant registration
- [ ] Tested webhook verification
- [ ] Tested join/leave tracking
- [ ] Tested recording download
- [ ] Tested transcript generation
- [ ] Tested chat import

### Production Deployment ✅
- [ ] Webhook URL is publicly accessible
- [ ] SSL certificate configured
- [ ] Environment variables set in production
- [ ] Database migrations run
- [ ] Monitoring/logging configured

---

## API Reference Examples

### Example 1: Get OAuth Access Token

This curl command demonstrates how to obtain an OAuth access token using Server-to-Server OAuth:

```bash
curl --location --request POST 'https://zoom.us/oauth/token?grant_type=account_credentials&account_id=06ZPcuahRVqp7ccvwZesZQ' \
--header 'Authorization: Basic WG10SUxBQV9TamVQUWpGdW0zMjhVdzpBdzFLcjdDT0Uwa2pKZDQ0R0dMOHh3N2FRT3lVRVlIVQ==' \
--header 'Content-Type: application/json' \
--header 'Cookie: _zm_currency=INR; _zm_lang=en-US; _zm_mtk_guid=5ba7626f7c4048569abba58c72e8ea21; _zm_visitor_guid=d549f5a1af18487f9e4fa0ea3dc3d214'
```

**Notes:**
- Replace `account_id` with your `ZOOM_ACCOUNT_ID`
- The `Authorization: Basic` header contains base64-encoded `CLIENT_ID:CLIENT_SECRET`
- Response will contain `access_token` and `expires_in` fields
- Token is valid for 1 hour

**Expected Response:**
```json
{
  "access_token": "eyJzdiI6IjAwMDAwMiIsImFsZyI6IkhTNTEyIiwidiI6IjIuMCIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "meeting:write:meeting meeting:read:meeting ..."
}
```

### Example 2: Get Meeting Recordings

This curl command demonstrates how to retrieve recordings for a specific meeting:

```bash
curl --location 'https://api.zoom.us/v2/meetings/83933845921/recordings' \
--header 'Authorization: Bearer eyJzdiI6IjAwMDAwMiIsImFsZyI6IkhTNTEyIiwidiI6IjIuMCIsImtpZCI6IjFmNjBlMTBjLWIyZWItNGIzMC1hNjBiLWQ0MzNiMmNlZmZjZiJ9.eyJhdWQiOiJodHRwczovL29hdXRoLnpvb20udXMiLCJ1aWQiOiJteEgtTnh2T1JxU0tqYURPTU1DTUtRIiwidmVyIjoxMCwiYXVpZCI6ImQ4OTRjMWJkN2JkNjViNDA2M2RhNmZhN2ZlMmFhYzQwMWU0ODZhNDRjMjkxOWYwNThlZjllM2EwMThmMjMzY2YiLCJuYmYiOjE3NjUyODY5ODEsImNvZGUiOiI4S29pUGVOZ1JZbUNCNVdEV1NSLWJnUVppWjRSSDdUbVEiLCJpc3MiOiJ6bTpjaWQ6WG10SUxBQV9TamVQUWpGdW0zMjhVdyIsImdubyI6MCwiZXhwIjoxNzY1MjkwNTgxLCJ0eXBlIjozLCJpYXQiOjE3NjUyODY5ODEsImFpZCI6IjA2WlBjdWFoUlZxcDdjY3Z3WmVzWlEifQ.ZEEU2swF_9v4j0OeEVl-dDqk4JAbKooPW1koDPimSkuI9_RwPzGPt_u5u1xFdRqzsSBkM6lWYaZucC7Bg6MK7w' \
--header 'Content-Type: application/json' \
--header 'Cookie: _zm_currency=INR; _zm_lang=en-US; _zm_mtk_guid=5ba7626f7c4048569abba58c72e8ea21; _zm_visitor_guid=d549f5a1af18487f9e4fa0ea3dc3d214'
```

**Notes:**
- Replace `83933845921` with your actual meeting ID
- Replace the Bearer token with a fresh access token from Example 1
- Requires `recording:read:recording` scope

**Expected Response:**
```json
{
  "account_id": "06ZPcuahRVqp7ccvwZesZQ",
  "meeting_id": "83933845921",
  "recording_start": "2025-01-15T10:00:00Z",
  "recording_end": "2025-01-15T11:00:00Z",
  "recording_files": [
    {
      "id": "abc123",
      "meeting_id": "83933845921",
      "recording_start": "2025-01-15T10:00:00Z",
      "recording_end": "2025-01-15T11:00:00Z",
      "file_type": "MP4",
      "file_size": 15728640,
      "play_url": "https://...",
      "download_url": "https://us06web.zoom.us/rec/download/...",
      "status": "completed"
    },
    {
      "id": "def456",
      "file_type": "TRANSCRIPT",
      "file_name": "transcript.vtt",
      "download_url": "https://us06web.zoom.us/rec/download/...",
      "status": "completed"
    }
  ]
}
```

### Example 3: Download Transcript File

This curl command demonstrates how to download a transcript file (closed captions) from a recording:

```bash
curl --location 'https://us06web.zoom.us/rec/download/m3B2j8yyikZjtxWShShgAbDTGE5_3cKk3VutHGkcKG0BjKxxyyWh1kBQCasatToN__ariZAizzuOhsA_.23nFOzlQJNVYk2qE?type=cc' \
--header 'Authorization: Bearer eyJzdiI6IjAwMDAwMiIsImFsZyI6IkhTNTEyIiwidiI6IjIuMCIsImtpZCI6IjFmNjBlMTBjLWIyZWItNGIzMC1hNjBiLWQ0MzNiMmNlZmZjZiJ9.eyJhdWQiOiJodHRwczovL29hdXRoLnpvb20udXMiLCJ1aWQiOiJteEgtTnh2T1JxU0tqYURPTU1DTUtRIiwidmVyIjoxMCwiYXVpZCI6ImQ4OTRjMWJkN2JkNjViNDA2M2RhNmZhN2ZlMmFhYzQwMWU0ODZhNDRjMjkxOWYwNThlZjllM2EwMThmMjMzY2YiLCJuYmYiOjE3NjUyODY5ODEsImNvZGUiOiI4S29pUGVOZ1JZbUNCNVdEV1NSLWJnUVppWjRSSDdUbVEiLCJpc3MiOiJ6bTpjaWQ6WG10SUxBQV9TamVQUWpGdW0zMjhVdyIsImdubyI6MCwiZXhwIjoxNzY1MjkwNTgxLCJ0eXBlIjozLCJpYXQiOjE3NjUyODY5ODEsImFpZCI6IjA2WlBjdWFoUlZxcDdjY3Z3WmVzWlEifQ.ZEEU2swF_9v4j0OeEVl-dDqk4JAbKooPW1koDPimSkuI9_RwPzGPt_u5u1xFdRqzsSBkM6lWYaZucC7Bg6MK7w' \
--header 'Cookie: _zm_currency=INR; _zm_lang=en-US; _zm_mtk_guid=5ba7626f7c4048569abba58c72e8ea21; _zm_visitor_guid=d549f5a1af18487f9e4fa0ea3dc3d214'
```

**Notes:**
- Replace the download URL with the actual `download_url` from the recording files response
- The `?type=cc` parameter specifies closed captions (transcript)
- Replace the Bearer token with a fresh access token
- The response will be the transcript file content (usually WEBVTT format)

**Expected Response (WEBVTT format):**
```
WEBVTT

00:00:05.000 --> 00:00:07.500
Hello everyone, welcome to today's session.

00:00:08.000 --> 00:00:12.300
Today we'll be discussing advanced topics.

00:00:13.000 --> 00:00:16.800
Let's start with the first topic.
```

**Usage in Code:**

These curl commands correspond to the following code implementations:

1. **OAuth Token** → `Backend/services/realZoomService.js` → `getAccessToken()`
2. **Get Recordings** → `Backend/services/realZoomService.js` → `getMeetingRecordings()`
3. **Download Transcript** → `Backend/services/realZoomService.js` → `downloadMeetingTranscript()`

---

## Support & Resources

- **Zoom API Documentation**: https://marketplace.zoom.us/docs/api-reference/zoom-api
- **Zoom Webhook Guide**: https://marketplace.zoom.us/docs/api-reference/webhook-reference
- **Zoom Scopes Reference**: https://marketplace.zoom.us/docs/api-reference/zoom-api/scopes

---

**Last Updated**: 2025-01-XX
**Version**: 1.0

