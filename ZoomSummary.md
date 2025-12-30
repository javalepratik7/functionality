# Zoom Meeting Q&A Bot Implementation Guide

This guide explains how to implement a Zoom-based Q&A bot that allows users to ask questions about meetings and fetch answers from Zoom recordings.

---

## 1. Overview

The project uses **Zoom Cloud Recording + Transcription** to store meeting transcripts in a database. Users can then ask questions, and the bot will answer based on the transcript.

**Key Steps:**

1. Enable Zoom cloud recording and transcription.
2. Fetch meeting recordings using Zoom API.
3. Convert transcript (.vtt) to plain text.
4. Store transcripts in a database.
5. Use semantic search and GPT to answer user questions.

---

## 2. Prerequisites

* Zoom account with **cloud recording enabled**
* Node.js installed
* MongoDB or any preferred database
* OpenAI API key (for summarization and Q&A)

---

## 3. Enable Zoom Cloud Recording & Transcription

1. Go to **Zoom Web > Settings > Recording > Cloud Recording**
2. Enable:

   * Record audio transcript
   * Save transcript files (.vtt)

After meetings, Zoom will automatically generate a transcript.

---

## 4. Create Zoom App & Get API Access

1. Go to [Zoom App Marketplace](https://marketplace.zoom.us/)
2. Create a **JWT or OAuth App**
3. Copy the **API Key and Secret**
4. Use these to authenticate API calls

---

## 5. Fetch Meeting Transcript via Zoom API

### Endpoint

```
GET /meetings/{meetingId}/recordings
```

### Dummy Response Example

```json
{
  "uuid": "abc123XYZ",
  "id": 123456789,
  "topic": "Project Kickoff Meeting",
  "start_time": "2025-11-24T10:00:00Z",
  "recording_files": [
    {
      "file_type": "MP4",
      "download_url": "https://api.zoom.us/rec/download/abc123XYZ"
    },
    {
      "file_type": "M4A",
      "download_url": "https://api.zoom.us/rec/download/abc123XYZ_audio"
    },
    {
      "file_type": "TRANSCRIPT",
      "download_url": "https://api.zoom.us/rec/download/abc123XYZ_transcript"
    }
  ]
}
```

**Key fields:**

* `file_type: TRANSCRIPT` → The transcript file
* `download_url` → Direct URL to download the transcript

### Node.js Example to Download Transcript

```javascript
const axios = require("axios");

const ZOOM_JWT_TOKEN = "YOUR_JWT_TOKEN";

async function downloadTranscript(meetingId) {
  const response = await axios.get(`https://api.zoom.us/v2/meetings/${meetingId}/recordings`, {
    headers: { Authorization: `Bearer ${ZOOM_JWT_TOKEN}` },
  });

  const transcriptFile = response.data.recording_files.find(f => f.file_type === "TRANSCRIPT");
  if (!transcriptFile) {
    console.log("Transcript not available yet.");
    return;
  }

  const transcriptResponse = await axios.get(transcriptFile.download_url, {
    headers: { Authorization: `Bearer ${ZOOM_JWT_TOKEN}` },
  });

  return transcriptResponse.data;
}
```

---

## 6. Convert VTT to Plain Text

Zoom transcripts are usually in **.vtt format**:

```
WEBVTT

00:00:01.000 --> 00:00:05.000
Welcome everyone to the project kickoff meeting.

00:00:05.500 --> 00:00:10.000
Today we will discuss project timelines and deliverables.
```

### Conversion Function

```javascript
function vttToText(vtt) {
  return vtt
    .split("\n")
    .filter(line => !line.includes("-->") && line.trim() !== "" && !line.startsWith("WEBVTT"))
    .join(" ");
}

// Usage
const plainText = vttToText(transcriptData);
console.log(plainText);
```

**Result:**

```
"Welcome everyone to the project kickoff meeting. Today we will discuss project timelines and deliverables."
```

---

## 7. Store Transcript in Database

### MongoDB Example

```javascript
const mongoose = require("mongoose");

const transcriptSchema = new mongoose.Schema({
  meetingId: String,
  topic: String,
  transcriptText: String,
  createdAt: { type: Date, default: Date.now },
});

const MeetingTranscript = mongoose.model("MeetingTranscript", transcriptSchema);

async function saveTranscript(meetingId, topic, transcriptText) {
  await MeetingTranscript.create({ meetingId, topic, transcriptText });
}
```

---

## 8. Build Q&A Bot

**Steps:**

1. **Chunk transcript** (optional: 100–300 words) for context.
2. **Generate embeddings** using OpenAI embeddings API.
3. **Store embeddings** in a vector database (Pinecone, FAISS, Weaviate).
4. **User asks a question** → Convert question to embedding → Retrieve relevant transcript chunks.
5. **Feed transcript chunks + question to GPT API** → Return contextual answer.

**Example Flow:**

```
User Question -> Vector Search -> Top Transcript Chunks -> GPT API -> Answer
```

**Optional Features:**

* Generate post-meeting summaries automatically.
* Filter Q&A by meeting topic, date, participants.
* Cache frequently asked questions.

---

## 9. Summary Architecture

1. **Zoom Cloud Recording** → Generates transcript
2. **Backend Server** → Fetch transcript via Zoom API
3. **Database** → Store transcript in structured format
4. **Vector DB + GPT** → Semantic search + answer generation
5. **User Bot Interface** → Return answers to users

---

This guide provides a complete implementation flow that your junior developer can follow to build a Zoom-based Q&A bot.
