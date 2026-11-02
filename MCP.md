# MCP (Model Context Protocol): Detailed Notes

## Contents
1. [What is MCP](#1-what-is-mcp)
2. [Problem it solves](#2-problem-it-solves)
3. [Architecture](#3-architecture)
4. [Protocol basics (JSON-RPC)](#4-protocol-basics-json-rpc)
5. [Transports](#5-transports)
6. [Server primitives](#6-server-primitives)
7. [Client features](#7-client-features)
8. [Build a server (Node.js)](#8-build-a-server-nodejs)
9. [Build a server (Python)](#9-build-a-server-python)
10. [Connecting a server to a client](#10-connecting-a-server-to-a-client)
11. [Testing and debugging](#11-testing-and-debugging)
12. [Auth](#12-auth)
13. [Security](#13-security)
14. [Alternatives and comparison](#14-alternatives-and-comparison)
15. [When to use / skip MCP](#15-when-to-use--skip-mcp)
16. [Best practices](#16-best-practices)
17. [Common pitfalls](#17-common-pitfalls)
18. [Glossary](#18-glossary)
19. [Resources](#19-resources)

---

## 1. What is MCP

- **Model Context Protocol**: an open standard, introduced by Anthropic in Nov 2024, for connecting AI applications to external tools, data and workflows. It has since been adopted across vendors (Claude, ChatGPT, Cursor, VS Code, Gemini tooling, etc.) and moved to neutral governance under the Linux Foundation.
- Analogies:
  - **USB-C for AI**: one connector shape, many devices.
  - **LSP (Language Server Protocol) for LLM tools**: LSP made N editors x M languages into N + M; MCP does the same for N AI apps x M tools.
- Transport-agnostic, message format is **JSON-RPC 2.0**.
- Spec and docs: `modelcontextprotocol.io`.

---

## 2. Problem it solves

| Before MCP | With MCP |
|---|---|
| N apps x M tools = N*M custom integrations | N + M: each app implements a client once, each tool a server once |
| Every AI app has its own plugin / function-calling format | One protocol reused across clients |
| Tool code glued into the app | Tool is a separate process/service, versioned and deployed independently |
| Secrets and business logic leak into app/prompt code | Auth, secrets and logic stay inside the server |
| Tool list is static, hard-coded | Dynamic discovery (`tools/list`), servers can announce changes |

Core idea: an LLM alone can only produce text. To *do* things (query a DB, create a ticket, send an email) or read *fresh/private data*, it needs tools and context. MCP standardizes how those are exposed and consumed.

---

## 3. Architecture

```
┌──────────────────────── Host (AI application) ────────────────────────┐
│  Claude Desktop / Claude Code / Cursor / VS Code / your own agent     │
│                                                                       │
│   ┌─ MCP Client 1 ─┐   ┌─ MCP Client 2 ─┐   ┌─ MCP Client 3 ─┐       │
└───┼────────────────┼───┼────────────────┼───┼────────────────┼───────┘
    │ JSON-RPC       │   │                │   │                │
    ▼                ▼   ▼                ▼   ▼                ▼
 MCP Server A      MCP Server B       MCP Server C
 (filesystem)      (GitHub API)       (your MySQL / PO system)
```

| Role | Meaning |
|---|---|
| **Host** | The AI app the user interacts with. Owns the LLM, UI, and user consent |
| **Client** | Connector inside the host. **One client per server**, 1:1 stateful session |
| **Server** | Program exposing tools/resources/prompts. Local process or remote service |
| **Data source** | What the server wraps: DB, REST API, files, SaaS |

Flow of a typical request:
1. User asks something in the host.
2. Host sends the LLM the user message plus the tool definitions (from servers).
3. LLM decides to call a tool and emits a tool call.
4. Host (via the client) sends `tools/call` to the server, usually after user approval.
5. Server runs it, returns the result.
6. Host feeds the result to the LLM, which writes the final answer.

The model never talks to the server directly; the host/client mediates everything.

---

## 4. Protocol basics (JSON-RPC)

### Lifecycle
| Phase | What happens |
|---|---|
| **Initialize** | Client sends `initialize` with protocol version, capabilities, client info. Server replies with its own. Client then sends `notifications/initialized` |
| **Operation** | Normal requests/responses/notifications |
| **Shutdown** | Transport closes (stdio: close stdin / terminate process; HTTP: close connection / delete session) |

### Message types
| Type | Has `id`? | Expects response? |
|---|---|---|
| Request | yes | yes |
| Response (result or error) | yes (matches request) | no |
| Notification | no | no |

### Example exchange
```jsonc
// client -> server: discover tools
{ "jsonrpc": "2.0", "id": 1, "method": "tools/list" }

// server -> client
{
  "jsonrpc": "2.0", "id": 1,
  "result": {
    "tools": [{
      "name": "get_po_status",
      "description": "Get status of a purchase order by ID",
      "inputSchema": {
        "type": "object",
        "properties": { "poId": { "type": "string" } },
        "required": ["poId"]
      }
    }]
  }
}

// client -> server: call it
{
  "jsonrpc": "2.0", "id": 2, "method": "tools/call",
  "params": { "name": "get_po_status", "arguments": { "poId": "PO-1042" } }
}

// server -> client
{
  "jsonrpc": "2.0", "id": 2,
  "result": { "content": [{ "type": "text", "text": "{\"status\":\"SHIPPED\"}" }], "isError": false }
}
```

### Common methods
| Method | Direction | Purpose |
|---|---|---|
| `initialize` | client -> server | Handshake, capability negotiation |
| `ping` | either | Liveness check |
| `tools/list`, `tools/call` | client -> server | Discover / invoke tools |
| `resources/list`, `resources/read`, `resources/subscribe` | client -> server | Discover / read / watch resources |
| `prompts/list`, `prompts/get` | client -> server | Discover / fetch prompt templates |
| `notifications/tools/list_changed` | server -> client | Tool list changed, re-fetch |
| `sampling/createMessage` | server -> client | Server asks host LLM to generate |
| `elicitation/create` | server -> client | Server asks the user for input |
| `roots/list` | server -> client | Ask which filesystem roots are in scope |

### Errors
- **Protocol errors**: standard JSON-RPC errors (unknown method, invalid params).
- **Tool execution errors**: return a normal result with `isError: true` and a helpful message, so the LLM can read it and recover.

---

## 5. Transports

| Transport | Use | Notes |
|---|---|---|
| **stdio** | Local servers | Client spawns server as a subprocess; messages over stdin/stdout, newline-delimited. Simplest. One user, one machine |
| **Streamable HTTP** | Remote / hosted servers | Single HTTP endpoint (e.g. `/mcp`). POST for client messages; server may reply with JSON or upgrade to an SSE stream. Supports sessions via `Mcp-Session-Id` header. Replaced the older HTTP+SSE transport (spec 2025-03-26) |
| Custom | Special cases | Spec allows others as long as JSON-RPC semantics are preserved |

> **stdio gotcha:** stdout is the protocol channel. Never `console.log` / `print` to stdout in a stdio server. Log to **stderr** (`console.error`) or a file.

Local (stdio) vs Remote (HTTP):
| | stdio | Streamable HTTP |
|---|---|---|
| Deployment | Runs on user's machine | Hosted, shared by many users |
| Auth | Inherits the user's env / env vars | OAuth 2.1 / tokens |
| Scaling | 1 process per client | Normal web scaling (stateless mode possible) |
| Typical use | Dev tools, filesystem, local DB | SaaS integrations, org-wide internal tools |

---

## 6. Server primitives

| Primitive | Controlled by | What it is | Example |
|---|---|---|---|
| **Tools** | Model (LLM decides to call) | Executable actions, may have side effects | `create_ticket`, `run_query`, `send_email` |
| **Resources** | Application (host decides what to attach) | Read-only data identified by URI | `file:///logs/app.log`, `db://orders/123` |
| **Prompts** | User (explicitly picked, e.g. slash command) | Reusable prompt templates with arguments | `/review-pr`, `/summarize-po` |

### Tools
- Defined by `name`, `description`, `inputSchema` (JSON Schema). Newer spec revisions also allow `outputSchema` / structured content and annotations (e.g. read-only / destructive hints).
- The **description is part of your prompt engineering**: the LLM chooses tools based on it.
- Result `content` can be text, image, audio, embedded resource, or resource links.

### Resources
- Fixed URIs, or **resource templates** (`orders://{id}`) for parameterized access.
- Can be text or binary (base64). Clients can subscribe for change notifications.
- Use for context loading ("attach this file/schema"), not for actions.

### Prompts
- Named templates with arguments that return a list of messages.
- Surface to users as slash commands / menu items.

---

## 7. Client features

Features a **client** offers to servers:

| Feature | Purpose |
|---|---|
| **Sampling** | Server requests an LLM completion through the host (server needs no API key of its own; host keeps control and can require user approval) |
| **Elicitation** | Server asks the user for structured input mid-task (confirm, pick a value, fill a form) |
| **Roots** | Client tells server which filesystem/URI boundaries it may operate in |

---

## 8. Build a server (Node.js)

Install:
```bash
npm i @modelcontextprotocol/sdk zod
```

### 8a. stdio server (local)
```js
// server.js  (package.json: "type": "module")
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "po-tools", version: "1.0.0" });

// TOOL
server.registerTool(
  "get_po_status",
  {
    description: "Get status of a purchase order by its ID",
    inputSchema: { poId: z.string().describe("PO ID, e.g. PO-1042") },
  },
  async ({ poId }) => {
    try {
      const [rows] = await db.query("SELECT * FROM pos WHERE id = ?", [poId]); // parameterized!
      if (!rows.length) {
        return { isError: true, content: [{ type: "text", text: `No PO found with id ${poId}` }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(rows[0]) }] };
    } catch (e) {
      console.error(e); // stderr, NOT stdout
      return { isError: true, content: [{ type: "text", text: "Database error" }] };
    }
  }
);

// RESOURCE (static URI)
server.registerResource(
  "schema",
  "db://schema",
  { title: "DB schema", mimeType: "text/plain" },
  async (uri) => ({ contents: [{ uri: uri.href, text: "pos(id, status, vendor, created_at)..." }] })
);

// PROMPT
server.registerPrompt(
  "summarize-po",
  { description: "Summarize a PO", argsSchema: { poId: z.string() } },
  ({ poId }) => ({
    messages: [{ role: "user", content: { type: "text", text: `Summarize PO ${poId} and flag any risks.` } }],
  })
);

await server.connect(new StdioServerTransport());
```

### 8b. Streamable HTTP server (remote, Express)
```js
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const app = express();
app.use(express.json());

function buildServer() {
  const server = new McpServer({ name: "po-tools", version: "1.0.0" });
  // ...register tools/resources/prompts exactly as above...
  return server;
}

// Stateless mode: new server + transport per request
app.post("/mcp", async (req, res) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { transport.close(); server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.listen(3000, () => console.error("MCP server on :3000/mcp"));
```
- Put real auth in front (Bearer token / OAuth) before exposing this beyond localhost.
- For stateful sessions (subscriptions, server-initiated messages), generate a session ID and keep transports in a map keyed by `Mcp-Session-Id`.

---

## 9. Build a server (Python)

```bash
pip install "mcp[cli]"
```
```python
# server.py
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("po-tools")

@mcp.tool()
def get_po_status(po_id: str) -> str:
    """Get status of a purchase order by its ID."""
    return f"PO {po_id}: SHIPPED"

@mcp.resource("db://schema")
def schema() -> str:
    return "pos(id, status, vendor, created_at)"

@mcp.prompt()
def summarize_po(po_id: str) -> str:
    return f"Summarize PO {po_id} and flag any risks."

if __name__ == "__main__":
    mcp.run()          # stdio by default
```
FastMCP builds the JSON Schema from type hints and the docstring.

---

## 10. Connecting a server to a client

### Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "po-tools": {
      "command": "node",
      "args": ["/absolute/path/to/server.js"],
      "env": { "DB_HOST": "localhost", "DB_USER": "readonly_user" }
    }
  }
}
```
Restart the app after editing. Use **absolute paths**.

### Claude Code (CLI)
```bash
# local stdio server
claude mcp add po-tools -- node /absolute/path/to/server.js

# remote HTTP server
claude mcp add --transport http po-tools https://example.com/mcp

claude mcp list
```

### Cursor / VS Code
Same `mcpServers`-style JSON, in the editor's MCP config file (`.cursor/mcp.json`, `.vscode/mcp.json`; exact key names vary slightly by editor, check its docs).

---

## 11. Testing and debugging

| Tool | Command / how |
|---|---|
| **MCP Inspector** (best first step) | `npx @modelcontextprotocol/inspector node server.js`: UI to list/call tools, read resources, see raw JSON-RPC |
| Client logs | Claude Desktop writes MCP logs to its logs folder; Claude Code has `/mcp` and `claude --debug` |
| stderr logging | Your server's `console.error` output appears in client logs |

Debug checklist when a server doesn't show up:
- [ ] Absolute path to the script / correct `command`
- [ ] Runs standalone: `node server.js` starts without errors
- [ ] Nothing printed to **stdout** besides protocol messages
- [ ] Required env vars passed via `env` (GUI apps often don't inherit your shell env / PATH)
- [ ] Node version compatible with the SDK
- [ ] Restarted the client after editing config

---

## 12. Auth

| Scenario | Approach |
|---|---|
| Local stdio server | Credentials via env vars from client config; runs with the user's own permissions |
| Remote HTTP server | **OAuth 2.1** (authorization code + PKCE). MCP server acts as an OAuth *resource server*; clients discover the authorization server via metadata endpoints. Dynamic client registration is supported |
| Simple internal use | Static Bearer token / API key header (fine for internal, not for public) |

Rules:
- Use **least-privilege** credentials (e.g. a read-only DB user for a "reporting" server).
- Never pass the client's token through to downstream APIs blindly ("token passthrough" is an anti-pattern); validate tokens issued for *your* server.

---

## 13. Security

MCP gives an LLM real capabilities, so treat it like exposing an API to an untrusted caller.

| Threat | Description | Mitigation |
|---|---|---|
| **Prompt injection** | Text in tool output / resources (web page, ticket, email) contains instructions that hijack the model | Treat tool output as untrusted; human approval for sensitive actions; sandbox |
| **Tool poisoning** | Malicious server hides instructions in tool descriptions | Only install trusted servers; review tool definitions |
| **Rug pull** | Server changes tool behavior/description after approval | Pin versions; re-review on `list_changed` |
| **Over-permissioned tokens** | Server holds broad credentials; one bad call = big damage | Least privilege, scoped tokens, read-only by default |
| **Confused deputy** | Server acts with its own privileges on behalf of a user who shouldn't have them | Per-user auth, authorization checks inside server |
| **Command / SQL injection** | LLM-supplied args reach shell or SQL | Validate with schemas, **parameterized queries**, no `exec` on raw input |
| **Data exfiltration** | Combination of read tool + network-capable tool leaks private data | Limit tool combos, egress restrictions, approval prompts |
| **Local server risk** | stdio server runs with your user's full permissions | Run in container/sandbox; audit source before running |
| **DNS rebinding / open localhost** | Local HTTP server reachable from browser pages | Bind to 127.0.0.1, validate `Origin`/`Host`, require auth |

Principles: human-in-the-loop for destructive actions, annotate tools (read-only vs destructive), log every tool call, validate every input.

---

## 14. Alternatives and comparison

| Approach | How it works | vs MCP |
|---|---|---|
| **Native function/tool calling** (OpenAI, Anthropic APIs) | Tools declared inline in each API request; your app executes them | MCP builds on this; it standardizes the layer *outside* your app so tools are reusable across clients |
| **LangChain / LlamaIndex tools** | Framework-level tool abstractions | Framework- and language-specific, not a wire protocol. Both can wrap MCP servers |
| **OpenAPI / REST + GPT Actions** | Describe HTTP API with a spec, model calls it | Good for plain HTTP; no standard for resources, prompts, sampling, stateful sessions |
| **A2A (Agent2Agent, Google)** | Agent <-> agent communication | **Complementary**: MCP = agent <-> tools; A2A = agent <-> agent |
| **OpenAI Apps SDK** | Build apps inside ChatGPT | Vendor-specific, itself built on MCP |
| **CLI / shell + scripts / skills** | Agent runs commands directly | Simple, token-cheap, often enough for local dev; no discovery/auth standard |
| **Direct SDK/API calls in your code** | Hard-code the integration | Fine for one app you fully control |

Function calling vs MCP in one line: function calling is *how a model asks for a tool call*; MCP is *how tools are packaged, discovered and served to any app*.

---

## 15. When to use / skip MCP

| Use MCP when | Skip MCP when |
|---|---|
| One integration should work across multiple AI clients | One app, 2-3 tools, you own the code: plain function calling is simpler |
| Exposing internal systems (DB, dashboards, PO system) to AI assistants | A CLI or script already does the job |
| Reusing community servers (GitHub, Postgres, Slack, Sentry...) | Token/latency cost matters more than reuse |
| Teams need versioned, separately-deployed tool services | You can't secure / audit a new service surface |

---

## 16. Best practices

**Tool design**
- Few, well-named, task-oriented tools beat many low-level ones (`get_po_status` > `run_sql`).
- Write descriptions for the LLM: when to use it, what args mean, what it returns.
- Describe each argument (`.describe()` / docstring) and constrain with enums, min/max, regex.
- Return concise, structured results; paginate or cap large outputs (context is expensive).
- Return actionable error messages with `isError: true`.
- Make tools idempotent where possible; mark read-only vs destructive.

**Operations**
- Separate read tools from write tools; start read-only.
- Version your server; keep tool names stable.
- Log tool calls (who, what, args, duration) to stderr/file.
- Timeouts and rate limits on downstream calls.

**Context management**
- Every tool definition costs prompt tokens. Expose only what the task needs; split into several focused servers rather than one giant one.
- Prefer resources for bulk reference data; tools for actions.

---

## 17. Common pitfalls

| Pitfall | Fix |
|---|---|
| `console.log` breaks a stdio server | Use `console.error` |
| Server not found in GUI client | Absolute paths; pass env/PATH explicitly |
| LLM never picks your tool | Improve name/description; reduce overlapping tools |
| Huge tool outputs blow the context | Limit rows, summarize, paginate |
| Raw SQL tool exposed | Provide narrow, parameterized, read-only tools |
| Too many tools degrade selection | Trim, group, or load per-task |
| Hosting stateful sessions behind a load balancer | Use stateless mode or sticky sessions / shared session store |

---

## 18. Glossary

| Term | Meaning |
|---|---|
| Host | AI app the user runs |
| Client | Per-server connector inside host |
| Server | Program exposing tools/resources/prompts |
| Tool | Model-invoked action |
| Resource | App-attached read-only data (URI) |
| Prompt | User-invoked template |
| Sampling | Server asks host's LLM for a completion |
| Elicitation | Server asks the user for input |
| Roots | Filesystem/URI scope given to server |
| Transport | Wire layer: stdio or Streamable HTTP |
| JSON-RPC 2.0 | Message format used by MCP |
| Inspector | Official debugging UI for servers |

---

## 19. Resources

| What | Where |
|---|---|
| Official docs and spec | https://modelcontextprotocol.io |
| TypeScript SDK | `@modelcontextprotocol/sdk` (npm) |
| Python SDK | `mcp` (PyPI) |
| Reference / community servers | github.com/modelcontextprotocol (servers repo) |
| Inspector | `npx @modelcontextprotocol/inspector` |
| Hindi videos | Chai aur Code: "What are MCP servers \| Explained in Hindi"; Abhijit Kalamkar (AI Learners India): "How MCP Makes your AI Agents Super Smart"; Kunal Garg: "Model Context Protocol (MCP) Clearly Explained in Hindi" |

> The spec evolves (transports, auth and tool features have changed across revisions). Check the changelog on modelcontextprotocol.io for the latest revision before relying on specifics.
