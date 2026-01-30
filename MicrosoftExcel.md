# Microsoft Excel Third-Party Integration using Microsoft Graph API

This document explains **end-to-end steps** to integrate **Microsoft
Excel (OneDrive / SharePoint)** using **Microsoft Graph APIs**,
including: - Azure App registration - Permissions - OAuth token
generation - Accessing shared drive files - Searching Excel files -
Downloading files - Extracting data - Storing data into database

------------------------------------------------------------------------

## 1. High-Level Flow Overview

1.  Create Azure App Registration\
2.  Generate Client ID, Client Secret, Tenant ID\
3.  Assign Microsoft Graph Permissions\
4.  Generate OAuth Access Token\
5.  Access User Drive Files\
6.  Search Excel File\
7.  Download Excel File\
8.  Extract Required Data\
9.  Store Data into Database

------------------------------------------------------------------------

## 2. Azure App Registration

### Step 1: Login to Azure Portal

-   URL: https://portal.azure.com
-   Login using **Admin account** of the tenant

### Step 2: Create App Registration

1.  Go to **Azure Active Directory**
2.  Click **App registrations**
3.  Click **New registration**
4.  Fill details:
    -   Name: `Excel-Graph-Integration`
    -   Supported account type: **Single tenant**
    -   Redirect URI: (leave empty for backend apps)
5.  Click **Register**

------------------------------------------------------------------------

## 3. Get Client ID, Tenant ID

After app registration: - Go to **Overview** - Copy: - **Application
(client) ID** → `client_id` - **Directory (tenant) ID** → `tenant_id`

Example:

    tenant_id = 9a4f037c-0cc5-4106-8da2-d794e393482e

------------------------------------------------------------------------

## 4. Create Client Secret

1.  Go to **Certificates & secrets**
2.  Click **New client secret**
3.  Add description & expiry
4.  Click **Add**
5.  Copy the **Secret Value** immediately

⚠️ This value is shown only once

    client_secret = xxxxxxxxxxxxxxxxx

------------------------------------------------------------------------

## 5. Configure Microsoft Graph API Permissions

### Step 1: Add API Permissions

1.  Go to **API Permissions**
2.  Click **Add a permission**
3.  Select **Microsoft Graph**
4.  Choose **Application permissions**

### Required Permissions:

-   Files.Read.All
-   Files.ReadWrite.All
-   Sites.Read.All
-   User.Read.All

### Step 2: Grant Admin Consent

-   Click **Grant admin consent**
-   Status must be **Granted**

------------------------------------------------------------------------

## 6. Generate OAuth Access Token

### Token URL

    POST https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token

Example:

    https://login.microsoftonline.com/9a4f037c-0cc5-4106-8da2-d794e393482e/oauth2/v2.0/token

### Request Body (x-www-form-urlencoded)

    client_id={client_id}
    client_secret={client_secret}
    scope=https://graph.microsoft.com/.default
    grant_type=client_credentials

### Response

    {
      "access_token": "eyJ0eXAiOiJKV1Qi...",
      "expires_in": 3599
    }

Use this `access_token` for all further API calls.

------------------------------------------------------------------------

## 7. Access User Drive Files

### API

    GET https://graph.microsoft.com/v1.0/users/ugops@globalbees.com/drive/root/children

### Headers

    Authorization: Bearer {access_token}

### Purpose

-   List all files & folders available in user's OneDrive

------------------------------------------------------------------------

## 8. Search Excel File in Same Tenant

### API

    GET https://graph.microsoft.com/v1.0/users/pratiksha.upadhyay@globalbees.com/drive/root/search(q='Swiggy Instamart Sales - Online (September Onwards).xlsx')

### Response

-   Returns metadata including:
    -   file id
    -   drive id
    -   parentReference

------------------------------------------------------------------------

## 9. Download Excel File

### API

    GET https://graph.microsoft.com/v1.0/drives/{driveId}/items/{itemId}/content

### Example

    https://graph.microsoft.com/v1.0/drives/{{driveId}}/items/{{itemId}}/content

### Result

-   Downloads `.xlsx` binary file

------------------------------------------------------------------------

## 10. Extract Excel File Data

After downloading: 1. Read Excel using: - Python (openpyxl / pandas) -
Node.js (xlsx package) 2. Extract: - Sheet name - Columns - Required
rows 3. Validate & clean data

------------------------------------------------------------------------

## 11. Store Data into Database

### Recommended Flow

1.  Convert Excel rows to JSON
2.  Apply transformations
3.  Insert into DB:
    -   MySQL / PostgreSQL
    -   MongoDB

### Example Fields

    date
    order_id
    sales_amount
    platform
    city

------------------------------------------------------------------------

## 12. Security & Best Practices

-   Store secrets in **Key Vault / ENV**
-   Rotate client secret periodically
-   Use least privilege permissions
-   Log API failures
-   Handle token expiry

------------------------------------------------------------------------

## 13. Complete Flow Diagram (Text)

    Azure App
       ↓
    OAuth Token
       ↓
    Microsoft Graph API
       ↓
    User Drive
       ↓
    Search Excel
       ↓
    Download File
       ↓
    Extract Data
       ↓
    Store in DB

------------------------------------------------------------------------

## 14. Conclusion

This setup enables **fully automated Excel ingestion** from Microsoft
OneDrive / SharePoint using **secure Microsoft Graph APIs**, suitable
for **daily sync jobs**, **ETL pipelines**, and **analytics workflows**.
