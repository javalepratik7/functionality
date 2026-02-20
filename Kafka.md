# Kafka with Node.js — Step-by-Step Implementation Guide

A complete guide to setting up Apache Kafka using Docker and integrating it with Node.js via the `kafkajs` library.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1 — Start Kafka with Docker](#step-1--start-kafka-with-docker)
3. [Step 2 — Project Setup](#step-2--project-setup)
4. [Step 3 — Create the Kafka Client](#step-3--create-the-kafka-client)
5. [Step 4 — Create a Topic (Admin)](#step-4--create-a-topic-admin)
6. [Step 5 — Produce Messages](#step-5--produce-messages)
7. [Step 6 — Consume Messages](#step-6--consume-messages)
8. [Running Everything Together](#running-everything-together)
9. [Project Structure](#project-structure)
10. [Key Concepts](#key-concepts)

---

## Prerequisites

Make sure you have the following installed before starting:

- [Docker](https://www.docker.com/) — to run the Kafka broker
- [Node.js](https://nodejs.org/) (v14 or higher)
- npm (comes with Node.js)

---

## Step 1 — Start Kafka with Docker

Kafka (since v3.3) supports **KRaft mode**, which eliminates the need for a separate ZooKeeper instance. The command below starts a single-node Kafka broker in KRaft mode using the official Apache image.

```bash
docker run -d \
  --name kafka \
  -p 9092:9092 \
  -e KAFKA_NODE_ID=1 \
  -e KAFKA_PROCESS_ROLES=broker,controller \
  -e KAFKA_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093 \
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 \
  -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT \
  -e KAFKA_CONTROLLER_QUORUM_VOTERS=1@localhost:9093 \
  -e KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER \
  -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 \
  apache/kafka:latest
```

**What each environment variable does:**

| Variable | Purpose |
|---|---|
| `KAFKA_NODE_ID` | Unique ID for this broker node |
| `KAFKA_PROCESS_ROLES` | Roles this node plays: `broker` (handles messages) + `controller` (manages cluster metadata) |
| `KAFKA_LISTENERS` | Internal ports Kafka listens on |
| `KAFKA_ADVERTISED_LISTENERS` | Address clients use to connect (use `localhost` for local dev) |
| `KAFKA_CONTROLLER_QUORUM_VOTERS` | The set of controller nodes in the cluster |
| `KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR` | Set to `1` for single-node setups |

**Verify the container is running:**

```bash
docker ps
```

Expected output:
```
NAMES   STATUS   PORTS
kafka   Up       0.0.0.0:9092->9092/tcp
```

---

## Step 2 — Project Setup

Create a new Node.js project and install the `kafkajs` library.

```bash
mkdir kafka-demo
cd kafka-demo
npm init -y
npm install kafkajs
```

---

## Step 3 — Create the Kafka Client

Create a shared `client.js` file. All other files will import from this single place, so your broker address is configured in one location only.

```javascript
// client.js
const { Kafka } = require('kafkajs')

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['localhost:9092']
})

module.exports = { kafka }
```

**`clientId`** — a human-readable identifier for your application (used in logs).  
**`brokers`** — a list of `host:port` pairs for your Kafka cluster.

---

## Step 4 — Create a Topic (Admin)

Before producing or consuming messages, you need a **topic**. Topics are categories/channels where messages are published. Create an `admin.js` file to set up your topic programmatically.

```javascript
// admin.js
const { kafka } = require('./client')

async function init() {
    const admin = kafka.admin()

    console.log("Admin connecting...")
    await admin.connect()

    console.log("Creating topic...")
    await admin.createTopics({
        topics: [
            {
                topic: "rider-updates",
                numPartitions: 2   // Split data across 2 partitions for parallelism
            }
        ]
    })

    console.log("Topic created successfully!")
    await admin.disconnect()
}

init()
```

**Run the admin script once to set up the topic:**

```bash
node admin.js
```

**What is a partition?** Partitions allow a topic to be split across multiple brokers and enable parallel consumption. Each partition is an ordered, immutable sequence of messages. With `numPartitions: 2`, you have two independent queues under one topic name.

---

## Step 5 — Produce Messages

A **producer** publishes messages to a topic. You can route messages to specific partitions using the `partition` key.

```javascript
// producer.js
const { kafka } = require('./client')

async function init() {
    const producer = kafka.producer()

    console.log("Connecting producer...")
    await producer.connect()
    console.log("Producer connected successfully!")

    await producer.send({
        topic: 'rider-updates',
        messages: [
            { key: 'key1', value: 'hello world', partition: 0 },
            { key: 'key2', value: 'hey hey!',    partition: 1 }
        ],
    })

    console.log("Messages sent!")
    await producer.disconnect()
}

init()
```

**Key fields in each message:**

| Field | Description |
|---|---|
| `key` | Optional identifier; messages with the same key always go to the same partition |
| `value` | The actual payload (string, Buffer, or JSON-stringified object) |
| `partition` | Explicitly target a partition (optional; Kafka will round-robin if omitted) |

**Run the producer:**

```bash
node producer.js
```

---

## Step 6 — Consume Messages

A **consumer** reads messages from a topic. Consumers belong to a **consumer group** — Kafka distributes partitions across all members of a group, enabling load-balanced consumption.

```javascript
// consumer.js
const { kafka } = require('./client')

async function init() {
    const consumer = kafka.consumer({ groupId: "rider-group" })

    await consumer.connect()

    await consumer.subscribe({
        topic: "rider-updates",
        fromBeginning: true   // Read all messages from the start
    })

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            console.log("Topic:    ", topic)
            console.log("Partition:", partition)
            console.log("Message:  ", message.value.toString())
            console.log("---")
        }
    })
}

init()
```

**Key options:**

| Option | Description |
|---|---|
| `groupId` | Consumer group name; multiple consumers with the same ID share the work |
| `fromBeginning: true` | Start reading from the oldest message; set to `false` to read only new messages |
| `eachMessage` | Callback triggered for every incoming message |

**Run the consumer (keep it running):**

```bash
node consumer.js
```

---

## Running Everything Together

Open **three separate terminals** and run the following in order:

**Terminal 1 — Start the consumer first** (so it's ready to receive):
```bash
node consumer.js
```

**Terminal 2 — Run the producer** to send messages:
```bash
node producer.js
```

**Terminal 3 — (Optional) Create additional topics** using admin:
```bash
node admin.js
```

You should see the consumer terminal printing the messages as soon as the producer sends them.

---

## Project Structure

```
kafka-demo/
├── client.js       # Shared Kafka connection config
├── admin.js        # Topic creation
├── producer.js     # Sends messages to a topic
├── consumer.js     # Reads messages from a topic
└── package.json
```

---

## Key Concepts

**Broker** — A running Kafka server that stores and serves messages.

**Topic** — A named channel/category where messages are published (like a table in a database).

**Partition** — A subdivision of a topic. Messages within a partition are strictly ordered. Multiple partitions allow parallel reads and writes.

**Producer** — An application that writes (publishes) messages to a Kafka topic.

**Consumer** — An application that reads (subscribes to) messages from a Kafka topic.

**Consumer Group** — A group of consumers that jointly consume a topic. Each partition is assigned to exactly one consumer in a group at a time, enabling load balancing.

**Offset** — A unique, sequential ID assigned to each message within a partition. Consumers track their offset to know where to resume reading after a restart.

**KRaft Mode** — Kafka's built-in consensus mechanism (replaces ZooKeeper). The controller role manages cluster metadata directly within the Kafka process.

---

## Troubleshooting

**`ECONNREFUSED localhost:9092`** — Kafka container isn't running. Run `docker ps` and restart it if needed with `docker start kafka`.

**Consumer not receiving messages** — Make sure `fromBeginning: true` is set if messages were sent before the consumer started, and verify the topic name matches exactly.

**Topic already exists error** — This is harmless. The admin script checks for conflicts; you can safely ignore this on repeated runs or wrap `createTopics` in a try/catch.

**Docker port conflict** — If port 9092 is in use, change `-p 9093:9092` in the Docker command and update `brokers: ['localhost:9093']` in `client.js`.
