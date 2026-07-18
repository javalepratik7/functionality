# 📋 Microsoft Planner API Guide (Microsoft Graph)

This document explains how to set up Azure AD app registration for the first time, get a Bearer token, and use the Microsoft Graph API to read/create Planner plans, buckets, and tasks via `curl`.

---

# 🧱 1. FIRST-TIME SETUP (AZURE PORTAL)

Before any API call works, you need an **App Registration** in Azure AD that is granted permission to call Microsoft Graph's Planner endpoints, and a way to generate an **access token** (Bearer token).

## Step 1: Register an Application

1. Go to **portal.azure.com** → search **Azure Active Directory** (Microsoft Entra ID)
2. Left menu → **App registrations** → **New registration**
3. Configure:

   * Name: `planner-api-integration`
   * Supported account types: `Accounts in this organizational directory only` (single tenant)
   * Redirect URI: leave blank for now (or `https://localhost` if testing auth code flow)
4. Click **Register**

After registration, note down (you'll need these):

* **Application (client) ID**
* **Directory (tenant) ID**

---

## Step 2: Create a Client Secret

1. In your app registration → **Certificates & secrets**
2. Click **New client secret**
3. Add a description, choose an expiry (e.g. 6/12 months)
4. Click **Add**
5. **Copy the secret VALUE immediately** — it is shown only once and disappears on page refresh

Store this as `CLIENT_SECRET`.

---

## Step 3: Add API Permissions

1. In your app registration → **API permissions** → **Add a permission**
2. Choose **Microsoft Graph**
3. Choose either:

   * **Delegated permissions** (acts as the signed-in user — needed for `/me/planner/...` endpoints), or
   * **Application permissions** (acts as the app itself, no signed-in user — needed for background/service scripts)
4. Search and add the following (as applicable to your use case):

   * `Tasks.Read`
   * `Tasks.ReadWrite`
   * `Group.Read.All`
   * `Group.ReadWrite.All`
   * `User.Read` (delegated, for resolving `/me`)
5. Click **Add permissions**
6. Click **Grant admin consent for `<your org>`** ✔ (required — a normal user can't self-consent to most of these)

> ⚠️ Without admin consent, every API call returns `403 Forbidden` even with a valid token.

---

## Step 4: Get an Access Token

### Option A — Client Credentials Flow (app-only, no user login, good for scripts/servers)

```bash
curl --location 'https://login.microsoftonline.com/<TENANT_ID>/oauth2/v2.0/token' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'client_id=<CLIENT_ID>' \
--data-urlencode 'client_secret=<CLIENT_SECRET>' \
--data-urlencode 'scope=https://graph.microsoft.com/.default' \
--data-urlencode 'grant_type=client_credentials'
```

Response contains:

```json
{
  "token_type": "Bearer",
  "expires_in": 3599,
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOi..."
}
```

> Note: Client credentials flow only works for **Application permissions**, and endpoints like `/me/...` won't work (there's no signed-in user) — use `/users/{id}/planner/...` or `/planner/plans/{id}` instead.

### Option B — Delegated / Auth Code Flow (acts as a real user, needed for `/me/planner/plans`)

This requires a browser-based sign-in flow (e.g. via Postman, MSAL, or a simple OAuth redirect) since a human must log in and consent. At a high level:

1. Redirect the user to:
   `https://login.microsoftonline.com/<TENANT_ID>/oauth2/v2.0/authorize?client_id=<CLIENT_ID>&response_type=code&redirect_uri=<REDIRECT_URI>&scope=https://graph.microsoft.com/.default offline_access`
2. User logs in and consents
3. Microsoft redirects back with a `code` param
4. Exchange that code for a token:

```bash
curl --location 'https://login.microsoftonline.com/<TENANT_ID>/oauth2/v2.0/token' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'client_id=<CLIENT_ID>' \
--data-urlencode 'client_secret=<CLIENT_SECRET>' \
--data-urlencode 'code=<AUTH_CODE_FROM_REDIRECT>' \
--data-urlencode 'redirect_uri=<REDIRECT_URI>' \
--data-urlencode 'grant_type=authorization_code'
```

This returns an `access_token` (short-lived, ~1hr) and a `refresh_token` (use it to get new access tokens without re-login).

> 💡 Tools like **Postman** (with an OAuth2 config pointing at the above URLs) make this flow much easier than doing it manually with curl.

---

## Step 5: Test the Token

```bash
curl --location 'https://graph.microsoft.com/v1.0/me' \
--header 'Authorization: Bearer <ACCESS_TOKEN>'
```

If this returns your profile JSON, the token is valid and permissions are working.

---

# 🔗 2. USER LOOKUP

Get a user's Azure AD object by UPN/email:

```bash
curl --location 'https://graph.microsoft.com/v1.0/users/swetalina.nayak@urbangabru.in' \
--header 'Authorization: Bearer xxxxxx'
```

> Useful for getting a user's `id` (GUID), which is needed later for task **assignments**.

---

# 📁 3. LIST PLANS

## Plans for the signed-in user (delegated token only)

```bash
curl --location 'https://graph.microsoft.com/v1.0/me/planner/plans' \
--header 'Authorization: Bearer xxxxxx'
```

## Plans owned by a Microsoft 365 Group

```bash
curl --location 'https://graph.microsoft.com/v1.0/groups/<GROUP_ID>/planner/plans' \
--header 'Authorization: Bearer xxxxxx'
```

---

# 🪣 4. LIST BUCKETS IN A PLAN

```bash
curl --location 'https://graph.microsoft.com/v1.0/planner/plans/GLURPGOLrEO7HwVBcwAJwskABdVr/buckets' \
--header 'Authorization: Bearer xxxxx'
```

---

# ✅ 5. LIST TASKS IN A PLAN

```bash
curl --location 'https://graph.microsoft.com/v1.0/planner/plans/GLURPGOLrEO7HwVBcwAJwskABdVr/tasks' \
--header 'Authorization: Bearer xxxx'
```

---

# ➕ 6. CREATE A TASK

```bash
curl --location 'https://graph.microsoft.com/v1.0/planner/tasks' \
--header 'Authorization: Bearer xxxxxx' \
--header 'Content-Type: application/json' \
--data-raw '{
    "planId": "tCwNH8NtwU-aGDtDFlXIgskAHk5t",
    "bucketId": "nJH7siAE506UX7XsfthHJckAOfg6",
    "title": "Test task from API",
    "dueDateTime": "2026-06-25T18:30:00Z",
    "assignments": {
      "8ac058b7-4e9c-441e-9df6-4a3b5a124d60": {
        "@odata.type": "#microsoft.graph.plannerAssignment",
        "orderHint": " !"
      }
    }
  }'
```

> The key inside `assignments` (`8ac058b7-...`) is the target user's Azure AD **object id** (from Step 2, User Lookup).

---

# 📝 7. GET TASK DETAILS (for `If-Match` etag)

```bash
curl --location 'https://graph.microsoft.com/v1.0/planner/tasks/7woVpKzCO0OCdIaE9khAy8kAKGap/details' \
--header 'Authorization: Bearer xxxxxx'
```

> ⚠️ Planner task **details** (checklist, description, references) require an `If-Match` header on any `PATCH`, using the `@odata.etag` value returned by this `GET`. Always fetch details first to get a fresh etag — stale etags cause `412 Precondition Failed`.

---

# ☑️ 8. ADD/UPDATE CHECKLIST ITEMS

```bash
curl --location --request PATCH 'https://graph.microsoft.com/v1.0/planner/tasks/7woVpKzCO0OCdIaE9khAy8kAKGap/details' \
--header 'Content-Type: application/json' \
--header 'If-Match: W/"JzEtVGFza0RldGFpbHMgQEBAQEBAQEBAQEBAQEBARCc="' \
--header 'Authorization: Bearer xxxxx' \
--data-raw '{
  "checklist": {
    "11111111-1111-1111-3333-111111111111": {
      "@odata.type": "#microsoft.graph.plannerChecklistItem",
      "title": "Collect requirements now",
      "isChecked": false,
      "orderHint": " !"
    },
    "22222222-2222-2222-4444-222222222222": {
      "@odata.type": "#microsoft.graph.plannerChecklistItem",
      "title": "Check App",
      "isChecked": false,
      "orderHint": " !"
    }
  }
}'
```

> The keys inside `checklist` (`11111111-...`, `22222222-...`) are arbitrary GUIDs you generate yourself to identify each checklist line item.

---

# ✏️ 9. UPDATE TASK DESCRIPTION

```bash
curl --location --request PATCH 'https://graph.microsoft.com/v1.0/planner/tasks/I-aGJMXSKUyi1RSsyr0bWskAFpQK/details' \
--header 'If-Match: W/"JzEtVGFza0RldGFpbHMgQEBAQEBAQEBAQEBAQEBARCc="' \
--header 'Content-Type: application/json' \
--data '{
  "description": "This is the description of the task created via API."
}'
```

---

# 🔍 10. GET TASK DETAILS AGAIN (verify update)

```bash
curl --location 'https://graph.microsoft.com/v1.0/planner/tasks/7woVpKzCO0OCdIaE9khAy8kAKGap/details' \
--header 'Authorization: Bearer xxxxxx'
```

---

# ⚡ 11. POWER AUTOMATE — PLANNER FLOW SETUP

Environment: `https://make.powerautomate.com/environments/Default-a33f6ec1-82ed-43dc-92d6-445445298ca8/flows`

This is a separate tool from the raw Graph API calls above — instead of writing curl/code, you build a **flow** in a visual designer that reacts to Planner events (or a schedule/manual trigger) and automatically does something (send a Teams/Email message, create a task elsewhere, update a SharePoint list, call the same Graph API endpoints above, etc).

## What a "flow" actually is

* A **trigger** (the "when this happens" event) + one or more **actions** (the "then do this" steps)
* Runs entirely on Microsoft's servers — no server/EC2/curl needed for this part
* Lives inside an **Environment** (your URL above points to the `Default` environment) — flows in one environment are not visible from another

## Step 1: Open the environment

1. Go to the link above (or `make.powerautomate.com` → use the environment picker top-right → select `Default`)
2. Left menu → **My flows** (personal) or **Solutions** (if it should be managed/exportable as a package)

## Step 2: Create a new flow

1. Click **+ Create** → choose flow type:

   * **Automated cloud flow** → triggers off an event (new Planner task, new email, etc.) — most common for Planner
   * **Instant cloud flow** → triggers manually (a button press, e.g. from Teams or mobile)
   * **Scheduled cloud flow** → triggers on a timer (e.g. every morning at 9am)
2. For Planner automation, pick **Automated cloud flow**, give it a name, then search the trigger list for **Planner** and pick one of:

   * `When a new task is created`
   * `When a task is assigned to me`
   * `When a task is completed`
   * `When a task is due soon`
3. Click **Create**

## Step 3: Configure the trigger

The Planner trigger asks you to pick, from dropdowns:

* **Group Id** → the Microsoft 365 Group / Team that owns the plan
* **Plan Id** → the specific plan inside that group
* (Some triggers) **Bucket Id** → narrow it further to one bucket only

> 💡 This is exactly the same `planId` / `bucketId` you see in the curl examples above — the flow designer just shows you a friendly dropdown instead of the raw GUID, but under the hood it stores the same IDs.

## Step 4: Add actions

Click **+ New step** and chain together whatever should happen after the trigger fires, e.g.:

* **Post message in a chat or channel** (Teams) — notify a group when a task is created
* **Send an email (V2)** (Outlook) — notify the assignee
* **HTTP** action → call a custom Graph endpoint (e.g. auto-update task details using the same PATCH calls shown in Section 8/9 above)
* **Create item** (SharePoint) — mirror the task into a list for reporting

## Step 5: Save and test

1. Click **Save**
2. Click **Test** → **Manually** → **Test**
3. Trigger the real event in Planner (e.g. actually create a task in that bucket)
4. Come back to Power Automate → **Run history** tab shows whether it succeeded/failed, with the full input/output of each step (useful for debugging)

## Step 6: Turn it on / off

* Toggle **On/Off** at the top of the flow's detail page
* Flows run automatically in the background as long as they're **On** and the connections (Teams/Outlook/SharePoint/etc.) they use haven't expired

---

# 🔎 12. FIND A FLOW BY BUCKET ID (when you forget the flow's name)

If you only remember a **bucket ID** (or plan ID) and need to find which flow references it, the fastest way is a script against the **Power Automate Admin API** — the UI has no built-in "search by ID" box.

Two ways to run it:

* **Interactive login** (recommended for day-to-day use) — you just run the script, a Microsoft login window pops up in your browser, you sign in once, and the script continues automatically. No manual token copy-pasting.
* **Client credentials** (for unattended/scheduled runs) — uses the app registration's `client_id` + `client_secret` from Section 1, no human present. Use this only if the interactive version isn't an option (e.g. running on a headless server).

## Method A — Interactive login (PowerShell)

This is the "run script → login popup → script continues" flow. `Add-PowerAppsAccount` handles the sign-in itself (opens a browser/device-code window), so you never touch tokens directly.

Save as `Find-FlowByBucketId.ps1`:

```powershell
param(
    [Parameter(Mandatory = $true)]
    [string]$BucketId,

    [string]$EnvironmentName = "Default-a33f6ec1-82ed-43dc-92d6-445445298ca8"
)

# Install the admin module once (skip if already installed)
if (-not (Get-Module -ListAvailable -Name Microsoft.PowerApps.Administration.PowerShell)) {
    Install-Module -Name Microsoft.PowerApps.Administration.PowerShell -Scope CurrentUser -Force
}

Import-Module Microsoft.PowerApps.Administration.PowerShell

# --- This line opens the login window ---
Add-PowerAppsAccount

Write-Host "Searching environment '$EnvironmentName' for bucket ID: $BucketId ..." -ForegroundColor Cyan

$flows = Get-AdminFlow -EnvironmentName $EnvironmentName
$found = $false

foreach ($flow in $flows) {
    $definition = Get-AdminFlow -EnvironmentName $EnvironmentName -FlowName $flow.FlowName |
        ConvertTo-Json -Depth 30

    if ($definition -match [regex]::Escape($BucketId)) {
        Write-Host "✅ MATCH: `"$($flow.DisplayName)`"  (flow id: $($flow.FlowName))" -ForegroundColor Green
        $found = $true
    }
}

if (-not $found) {
    Write-Host "No flow in this environment references that bucket ID." -ForegroundColor Yellow
}
```

Run it:

```powershell
.\Find-FlowByBucketId.ps1 -BucketId "nJH7siAE506UX7XsfthHJckAOfg6"
```

What happens when you run it:

1. A Microsoft sign-in window (or device-code prompt, depending on your PowerShell host) opens automatically
2. You log in with your normal M365 account — no client ID/secret needed
3. Once signed in, the script keeps running on its own, listing every flow in the environment and checking each one's definition for that bucket ID
4. Matching flow names print to the console

> Requires at least **Environment Maker** rights on the `Default-a33f6ec1-82ed-43dc-92d6-445445298ca8` environment, and you must be an owner/co-owner of a flow (or a tenant admin) to see its full definition.

## Method B — Client credentials (curl, for unattended/service scripts)

Use this only when there's no human available to log in (e.g. a scheduled job on a server).

```bash
curl --location 'https://login.microsoftonline.com/<TENANT_ID>/oauth2/v2.0/token' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'client_id=<CLIENT_ID>' \
--data-urlencode 'client_secret=<CLIENT_SECRET>' \
--data-urlencode 'scope=https://service.flow.microsoft.com//.default' \
--data-urlencode 'grant_type=client_credentials'
```

Save as `find-flow-by-bucket.sh`:

```bash
#!/bin/bash
# Usage: ./find-flow-by-bucket.sh <BUCKET_ID> <ACCESS_TOKEN>

BUCKET_ID="$1"
TOKEN="$2"
ENV="Default-a33f6ec1-82ed-43dc-92d6-445445298ca8"

if [ -z "$BUCKET_ID" ] || [ -z "$TOKEN" ]; then
  echo "Usage: $0 <BUCKET_ID> <ACCESS_TOKEN>"
  exit 1
fi

# 1. List every flow in the environment
FLOWS=$(curl -s --location \
  "https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/${ENV}/flows?api-version=2016-11-01" \
  --header "Authorization: Bearer ${TOKEN}")

echo "$FLOWS" | jq -c '.value[] | {name: .name, displayName: .properties.displayName}' | while read -r flow; do
  FLOW_ID=$(echo "$flow" | jq -r '.name')
  DISPLAY_NAME=$(echo "$flow" | jq -r '.displayName')

  # 2. Fetch full definition for each flow
  DEFINITION=$(curl -s --location \
    "https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/${ENV}/flows/${FLOW_ID}?api-version=2016-11-01&\$expand=properties.definition" \
    --header "Authorization: Bearer ${TOKEN}")

  # 3. Grep the raw JSON for the bucket ID string
  if echo "$DEFINITION" | grep -q "$BUCKET_ID"; then
    echo "✅ MATCH: \"$DISPLAY_NAME\"  (flow id: $FLOW_ID)"
  fi
done
```

Make it executable and run:

```bash
chmod +x find-flow-by-bucket.sh
./find-flow-by-bucket.sh nJH7siAE506UX7XsfthHJckAOfg6 <ACCESS_TOKEN>
```

Output looks like:

```
✅ MATCH: "Notify team on new onboarding task"  (flow id: 3fa1c9b2-....)
```

> Requires `jq` installed (`sudo apt install jq -y`). Every run needs a fresh token (~1hr expiry) — either paste a new one each time or wrap the curl-token step into the script itself.

---

# 🚨 COMMON FIXES

## `403 Forbidden` on every call

* Admin consent not granted → go back to **API permissions** → click **Grant admin consent**
* Wrong permission type — delegated permissions won't work with client-credentials tokens, and vice versa

## `412 Precondition Failed` on PATCH to `/details`

* Your `If-Match` etag is stale — re-run the `GET .../details` call and copy the fresh `@odata.etag` value before retrying the `PATCH`

## `401 Unauthorized` / `InvalidAuthenticationToken`

* Token expired (access tokens last ~1 hour) — re-request using client credentials flow, or use the `refresh_token` for delegated flow
* Double-check you're not accidentally sending an ID token instead of the access token

## `/me/planner/plans` returns empty or errors

* You're using an app-only (client credentials) token — `/me` requires a delegated (user sign-in) token
* Use `/users/{id}/planner/plans` or `/groups/{id}/planner/plans` instead for app-only auth

## Assignment / checklist item not showing up

* GUIDs used as keys inside `assignments` / `checklist` must be valid UUIDs (generate with `uuidgen` or any UUID v4 generator) — malformed keys are silently rejected or return `400`

## Power Automate flow not triggering

* Flow toggle is **Off** — check the flow's detail page
* The connection used by the trigger (e.g. your M365 login) expired — go to **My flows** → the flow → fix any "connection needs attention" banner
* Trigger is scoped to the wrong **Bucket Id** — re-check via Section 4 (`.../buckets`) that you picked the right one

## `find-flow-by-bucket.sh` returns no matches / 403

* Token scope must be `https://service.flow.microsoft.com//.default` (note the double slash before `.default`), not the Graph scope from Section 4
* You need **Environment Maker** or admin rights on that environment to list/read flows you don't own
* Some flows store the bucket ID inside a **dynamic content expression** rather than a literal string — those won't match a plain `grep`; open the flow manually and check the trigger's Bucket field in that case

---

# 🧠 BEST PRACTICES

* Never commit `client_id` / `client_secret` / tokens to source control — use `.env` files or a secrets manager
* Access tokens expire quickly (~1 hr) — cache and refresh programmatically, don't hardcode them
* Use **Application permissions** + client credentials flow for backend/scheduled jobs with no human present
* Use **Delegated permissions** + auth code flow when the app needs to act as a specific signed-in user (e.g. `/me/...`)
* Always fetch fresh `@odata.etag` before any `PATCH` to `/details` endpoints
* Rotate client secrets before they expire (check the expiry date set in Step 2)
* Give every Power Automate flow a **descriptive name** up front (e.g. `"NewTaskAlert - Marketing Bucket"` not `"Flow 1"`) — this alone avoids most "which flow was that" hunts
* Keep a simple internal note/spreadsheet mapping `Plan ID` / `Bucket ID` → flow name, so you rarely need the search script at all
* Export important flows as part of a **Solution** (Solutions → add existing → flow) so they're versioned and easy to move between environments
