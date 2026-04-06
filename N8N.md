# n8n Complete Guide for Junior Developers

## Table of Contents

1. [Introduction](#introduction)
2. [Installation and Setup](#installation-and-setup)
3. [Core Concepts](#core-concepts)
4. [Creating Workflows](#creating-workflows)
5. [Triggers](#triggers)
6. [Nodes](#nodes)
7. [Expressions](#expressions)
8. [Data Transformation](#data-transformation)
9. [Working with APIs](#working-with-apis)
10. [Error Handling](#error-handling)
11. [Reusable Workflows](#reusable-workflows)
12. [Best Practices](#best-practices)
13. [Advanced Topics](#advanced-topics)
14. [Resources](#resources)

---

## 1. Introduction

n8n is a **free and open-source workflow automation tool**.
It allows you to connect apps, automate tasks, and orchestrate workflows without writing complex backend code.

Key Points:

* Visual workflow editor
* Over 300 nodes for popular apps and services
* Trigger-based automation
* Self-hosting support

---

## 2. Installation and Setup

### Requirements

* Node.js 18+
* npm or Yarn
* Docker (optional, recommended for production)

### Installation Methods

1. **Docker (recommended for beginners)**:

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  n8nio/n8n
```

2. **npm Install (local setup)**:

```bash
npm install n8n -g
n8n start
```

3. **Desktop App**: Available for Windows/macOS/Linux (easy start for testing)

### Accessing n8n

* Open your browser and go to: `http://localhost:5678/`

---

## 3. Core Concepts

1. **Workflow**: A sequence of nodes performing tasks.
2. **Node**: A single operation in a workflow (API call, data transformation, etc.)
3. **Trigger**: Starts a workflow (e.g., webhook, schedule).
4. **Credentials**: Securely stored secrets for services like Google, Slack, etc.
5. **Execution Modes**: Manual run vs Triggered run.

---

## 4. Creating Workflows

1. Click **New Workflow**
2. Give it a meaningful name
3. Add a **Trigger Node** (e.g., Webhook, Schedule, Cron)
4. Add action nodes connected in sequence
5. Use **Execute Workflow** to test

---

## 5. Triggers

Triggers start workflows automatically. Common triggers:

1. **Webhook Trigger**: Receives data from external apps
2. **Schedule Trigger**: Runs workflows at intervals
3. **Cron Trigger**: Runs workflows at specific times
4. **Event-based Trigger**: From apps like Slack, Gmail

Example: Webhook Trigger

* Node: Webhook
* Method: POST
* URL: `/webhook-test`
* Send test data with Postman or curl

---

## 6. Nodes

### Node Types

1. **Core Nodes**: Function, Set, Merge, HTTP Request
2. **App Nodes**: Gmail, Slack, Google Sheets, Airtable, etc.
3. **Utility Nodes**: SplitInBatches, Wait, IF, Switch

### Example: HTTP Request Node

* Method: GET
* URL: `https://jsonplaceholder.typicode.com/todos/1`
* Output: JSON data of the todo

---

## 7. Expressions

Expressions allow dynamic data usage.

* Format: `{{$json["key"]}}`
* Example: Set Node

```json
{
  "message": "Hello {{$json[\"name\"]}}!"
}
```

---

## 8. Data Transformation

1. **Set Node**: Create or modify fields
2. **Function Node**: Write JavaScript to manipulate data

```javascript
return items.map(item => {
  item.json.fullName = item.json.firstName + " " + item.json.lastName;
  return item;
});
```

3. **Merge Node**: Combine multiple data streams

---

## 9. Working with APIs

1. Use **HTTP Request Node**
2. Support for **GET, POST, PUT, DELETE**
3. Add authentication: Basic Auth, OAuth2, API Key
4. Parse JSON responses with **Set or Function Nodes**

Example: Fetch GitHub Repos

* HTTP Request Node: `GET https://api.github.com/users/{{ $json["username"] }}/repos`
* Output: List of repositories

---

## 10. Error Handling

* Use **Error Trigger Node** to catch workflow errors
* Combine with **IF Node** to handle retries
* Example:

  * Node fails → Error Trigger → Send Slack notification
* Add **Retry on Failure** in node settings

---

## 11. Reusable Workflows

* Create workflows to be **called inside other workflows** using **Execute Workflow Node**
* Benefits:

  * Reusability
  * Modular design
  * Easier debugging

---

## 12. Best Practices

1. Name nodes clearly
2. Use credentials securely
3. Keep workflows modular
4. Test with small data sets first
5. Enable **Execution Logging** for debugging

---

## 13. Advanced Topics

1. **Sub-Workflows**: Break large workflows into smaller units
2. **Expression Functions**: Advanced JS inside expressions
3. **Webhook Security**: Use secret keys to validate payloads
4. **Queue Mode**: Scale workflows for heavy traffic
5. **Environment Variables**: Manage API keys and sensitive data

---

## 14. Resources

* [Official n8n Docs](https://docs.n8n.io/)
* [n8n Forum](https://community.n8n.io/)
* [YouTube Tutorials](https://www.youtube.com/c/n8n_io)
* [n8n GitHub](https://github.com/n8n-io/n8n)
