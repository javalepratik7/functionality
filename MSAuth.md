# Microsoft Authentication - Complete Setup
---

## 📋 Quick Reference - Complete Checklist

### Phase 1: Azure App Registration

- [ ] Go to https://portal.azure.com
- [ ] Search "App registrations" and create new app
- [ ] Set Redirect URI: `http://localhost:3000/auth/callback`
- [ ] Go to "Certificates & Secrets" → Create new secret
- [ ] Copy **Client ID** and **Client Secret**
- [ ] Go to "API permissions" → Add "User.Read" scope
- [ ] Add "offline_access" scope for refresh tokens
- [ ] Grant admin consent for permissions

### Phase 2: Environment Configuration

- [ ] Create `.env` file in project root
- [ ] Add `MICROSOFT_CLIENT_ID` from Azure
- [ ] Add `MICROSOFT_CLIENT_SECRET` from Azure
- [ ] Add `MICROSOFT_REDIRECT_URI=http://localhost:3000/auth/callback`
- [ ] Generate `JWT_SECRET`: `openssl rand -base64 32`
- [ ] Add database credentials
- [ ] Verify all variables are set: `npm run test:env`

### Phase 3: Database Setup

- [ ] Verify users table has required columns
- [ ] Required columns:
  - `id` (INT UNSIGNED PRIMARY KEY AUTO_INCREMENT)
  - `email` (VARCHAR UNIQUE)
  - `microsoft_oid` (VARCHAR UNIQUE)
  - `microsoft_tenant_id` (VARCHAR)
  - `ms_access_token` (LONGTEXT)
  - `ms_refresh_token` (LONGTEXT)
  - `role` (ENUM)
- [ ] Create indexes for better performance
- [ ] Test connection: `npm run test:db`

### Phase 4: Implementation

- [ ] Install dependencies: `npm install axios jsonwebtoken`
- [ ] Copy `msAuth.js` to your project
- [ ] Create auth routes in `src/routes/authRoutes.js`
- [ ] Create auth middleware in `src/middleware/`
- [ ] Import and use in `server.js`
- [ ] Test endpoints with curl or Postman

### Phase 5: Frontend Integration

- [ ] Create auth service in frontend
- [ ] Add login button that calls `/auth/login-url`
- [ ] Handle callback with token from URL
- [ ] Store token in localStorage
- [ ] Add `Authorization` header to all API requests
- [ ] Implement logout function

### Phase 6: Production Deployment

- [ ] Update `MICROSOFT_REDIRECT_URI` for production
- [ ] Add production URL to Azure Portal
- [ ] Enable HTTPS (required)
- [ ] Update database to production instance
- [ ] Set strong `JWT_SECRET`
- [ ] Implement rate limiting
- [ ] Set up error logging
- [ ] Test full flow on staging environment

---

## 🔑 Environment Variables Reference

### Microsoft Related

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `MICROSOFT_CLIENT_ID` | Azure App ID for OAuth | `a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6` | ✅ |
| `MICROSOFT_CLIENT_SECRET` | Secret for secure token exchange | `abc~DEF.ghijk_LMNOP.qRstuVWXYZ` | ✅ |
| `MICROSOFT_REDIRECT_URI` (dev) | Where Microsoft redirects after login | `http://localhost:3000/auth/callback` | ✅ |
| `MICROSOFT_REDIRECT_URI` (prod) | Production redirect URI | `https://yourdomain.com/auth/callback` | ✅ |
| `MICROSOFT_AUTHORITY` | Microsoft login endpoint | `https://login.microsoftonline.com/common` | ❌ |

### JWT Related

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Secret key for signing JWT tokens | `openssl rand -base64 32` | ✅ |
| `JWT_EXPIRY` | How long JWT tokens last | `7d`, `24h`, `3600s` | ❌ |

### Database Related

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DB_HOST` | Database server address | `localhost` (dev) / `your-db.database.windows.net` (prod) | ✅ |
| `DB_USER` | Database username | `root` | ✅ |
| `DB_PASSWORD` | Database password | strong password | ✅ |
| `DB_NAME` | Database name | `npd_dashboard` | ✅ |
| `DB_PORT` | Database port | `3306` | ❌ |

### Application Related

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `FRONTEND_URL` | Frontend application URL | `http://localhost:3000` (dev) / `https://yourdomain.com` (prod) | ✅ |
| `NODE_ENV` | Environment type | `development`, `production`, `staging` | ❌ |
| `PORT` | Server port | `3000` | ❌ |

---

## 🗄️ Database Schema Reference

### Users Table

**Purpose:** Store user accounts with Microsoft authentication data

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | Unique user identifier |
| `name` | VARCHAR(100) | NOT NULL | User display name from Microsoft |
| `email` | VARCHAR(191) | NOT NULL, UNIQUE | User email address |
| `microsoft_oid` | VARCHAR(64) | UNIQUE, NULL | Azure Object ID (used in Planner) |
| `microsoft_tenant_id` | VARCHAR(64) | NULL | Azure Tenant ID |
| `ms_access_token` | LONGTEXT | NULL | OAuth access token (stored only in DB) |
| `ms_refresh_token` | LONGTEXT | NULL | OAuth refresh token (stored only in DB) |
| `role` | ENUM | NOT NULL, DEFAULT 'member' | User role for authorization |
| `is_active` | TINYINT(1) | NOT NULL, DEFAULT 1 | Whether user account is active |
| `last_login_at` | DATETIME | NULL | Last login timestamp |
| `created_at` | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Account creation timestamp |
| `updated_at` | DATETIME | NOT NULL, ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

**Indexes:**
- PRIMARY: `id`
- UNIQUE: `email`, `microsoft_oid`
- INDEX: `role`, `is_active`, `microsoft_tenant_id`

### Auth Sessions Table (Recommended)

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT UNSIGNED | PRIMARY KEY AUTO_INCREMENT |
| `user_id` | INT UNSIGNED | NOT NULL, FOREIGN KEY |
| `session_token` | VARCHAR(255) | NOT NULL UNIQUE |
| `ip_address` | VARCHAR(45) | NULL |
| `user_agent` | TEXT | NULL |
| `expires_at` | DATETIME | NOT NULL |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP |

---

## 🔐 Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MICROSOFT AUTHENTICATION FLOW                     │
└─────────────────────────────────────────────────────────────────────┘

1. USER INITIATES LOGIN
   Frontend → GET /auth/login-url
   Backend returns: { authUrl: "https://login.microsoftonline.com/..." }

2. FRONTEND REDIRECTS TO MICROSOFT
   User clicks "Login with Microsoft"
   Browser redirected to Microsoft login page

3. USER LOGS IN TO MICROSOFT
   User enters credentials and approves consent screen

4. MICROSOFT REDIRECTS BACK TO YOUR APP
   Microsoft → Backend at /auth/callback?code=AUTHORIZATION_CODE

5. BACKEND EXCHANGES CODE FOR TOKENS
   Backend → Microsoft token endpoint
   Returns: { access_token, refresh_token, expires_in }

6. BACKEND FETCHES USER PROFILE
   Backend → Microsoft Graph API (GET /me)
   Returns: { id, displayName, mail, ... }

7. BACKEND CREATES/UPDATES USER IN DATABASE
   INSERT or UPDATE users table with microsoft_oid, email, tokens

8. BACKEND GENERATES JWT TOKEN
   JWT contains: userId, email, role, name (signed with JWT_SECRET)

9. BACKEND REDIRECTS TO FRONTEND
   Redirect to: frontend_url?token=JWT_TOKEN

10. FRONTEND RECEIVES TOKEN
    Extract token from URL, store in localStorage, redirect to dashboard

11. FRONTEND MAKES AUTHENTICATED REQUESTS
    All API calls include: Authorization: Bearer JWT_TOKEN

12. TOKEN REFRESH (when expired)
    POST /auth/refresh-token → Backend generates new JWT

13. OPTIONAL: REFRESH MICROSOFT TOKEN
    Backend uses refresh_token to get new access_token
```

---

## 📊 API Endpoints Reference

### Authentication Endpoints

#### `GET /auth/login-url`

Get Microsoft login URL

| Property | Value |
|----------|-------|
| **Method** | GET |
| **Requires Token** | No |
| **Use Case** | Frontend calls this to get login URL |

**Response (Success - 200):**
```json
{
  "success": true,
  "authUrl": "https://login.microsoftonline.com/..."
}
```

---

#### `GET /auth/callback`

OAuth callback from Microsoft

| Property | Value |
|----------|-------|
| **Method** | GET |
| **Requires Token** | No |
| **Query Params** | `code` (auth code), `state` (CSRF token), `error` (if failed) |
| **Use Case** | Microsoft redirects here after user logs in |

**Response:** Redirect to frontend with JWT token

---

#### `GET /auth/me`

Get current authenticated user

| Property | Value |
|----------|-------|
| **Method** | GET |
| **Requires Token** | Yes |
| **Headers** | `Authorization: Bearer JWT_TOKEN` |

**Response (Success - 200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "member",
    "microsoft_oid": "uuid",
    "is_active": true
  }
}
```

---

#### `POST /auth/logout`

Logout user

| Property | Value |
|----------|-------|
| **Method** | POST |
| **Requires Token** | Yes |

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### `POST /auth/refresh-token`

Get new JWT token (refresh)

| Property | Value |
|----------|-------|
| **Method** | POST |
| **Requires Token** | Yes |

**Response (Success - 200):**
```json
{
  "success": true,
  "token": "NEW_JWT_TOKEN"
}
```

---

#### `POST /auth/refresh-ms-token`

Refresh Microsoft access token

| Property | Value |
|----------|-------|
| **Method** | POST |
| **Requires Token** | Yes |

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Microsoft token refreshed"
}
```

---

## 🔒 Security Best Practices

### Tokens

#### Access Tokens (Microsoft)

| ✅ Should Do | ❌ Don't Do |
|--------------|-------------|
| Store only in database | Never send to frontend |
| Use for Microsoft Graph API calls only | Never log or print |
| Refresh when expired (automatic) | Never commit to git |
| Include in Authorization header | Never store in localStorage |

#### Refresh Tokens

| ✅ Should Do | ❌ Don't Do |
|--------------|-------------|
| Store in database (encrypted if possible) | Never expose to frontend |
| Use to get new access tokens | Never log |
| Rotate refresh tokens periodically | Never use for API authentication |

#### JWT Tokens

| ✅ Should Do | ❌ Don't Do |
|--------------|-------------|
| Send to frontend after successful auth | Store sensitive data in JWT |
| Include in Authorization header | Use weak secrets |
| Set reasonable expiration (7d or less) | Skip JWT expiration validation |
| Sign with strong secret (min 32 chars) | |

### CSRF Protection

- ✅ Use state parameter in OAuth flow
- ✅ Validate state on callback
- ✅ Current implementation uses UUID for state

### HTTPS

| Requirement | Description |
|-------------|-------------|
| **Production** | MANDATORY |
| **Development** | `http://localhost` is acceptable |
| **Reasoning** | Tokens can be intercepted over HTTP |

### Database Security

| ✅ Should Do | ❌ Don't Do |
|--------------|-------------|
| Use strong passwords | Don't use default passwords |
| Limit database user privileges | Don't expose database to public internet |
| Use encrypted connections (SSL/TLS) | Don't log full query strings with tokens |
| Regular backups | |
| Access control lists | |

### Code Security

| ✅ Should Do | ❌ Don't Do |
|--------------|-------------|
| Validate all inputs | Don't trust user input |
| Implement rate limiting on auth endpoints | Don't expose stack traces in API responses |
| Log auth events (not tokens) | Don't log passwords or tokens |
| Monitor failed login attempts | |
| Implement account lockout after X failures | |

---

## ⚠️ Common Issues & Solutions

### Issue: Invalid Redirect URI

**Symptom:** Error: `"invalid_request"` or `"redirect_uri mismatch"`

**Causes:**
- `MICROSOFT_REDIRECT_URI` env var not set
- Redirect URI not configured in Azure Portal
- Mismatch between code and Azure config

**Solutions:**
- Check `.env` file has `MICROSOFT_REDIRECT_URI`
- Check Azure Portal > App > Authentication > Redirect URIs
- Ensure exact match (http vs https, port number)

---

### Issue: Invalid Client Secret

**Symptom:** Error: `"invalid_client"`

**Causes:**
- `MICROSOFT_CLIENT_SECRET` is wrong or expired
- `MICROSOFT_CLIENT_ID` is wrong
- Secret hasn't been copied correctly

**Solutions:**
- Go to Azure Portal > Certificates & Secrets
- Delete old secret, create new one
- Copy value (not ID)
- Update `.env` file

---

### Issue: Token Not in Database

**Symptom:** User created but `ms_access_token` is NULL

**Causes:**
- Token exchange failed silently
- Database insert didn't include token
- Database column too small for token

**Solutions:**
- Use `LONGTEXT` for token columns
- Add error logging to token exchange
- Check database insert query
- Verify columns exist: `ms_access_token`, `ms_refresh_token`

---

### Issue: JWT Verification Failed

**Symptom:** Error: `"Invalid or expired token"`

**Causes:**
- `JWT_SECRET` changed between signing and verification
- Token is expired
- Token payload corrupted

**Solutions:**
- Check `JWT_SECRET` is same in `.env`
- Check token expiration time
- Verify token format: `Authorization: Bearer TOKEN`
- Don't modify token after generation

---

### Issue: User Profile Fetch Failed

**Symptom:** Error: `"Failed to fetch user profile"`

**Causes:**
- Access token is invalid
- Microsoft Graph endpoint changed
- `User.Read` permission not granted

**Solutions:**
- Verify access token was obtained
- Check Microsoft Graph documentation
- Add `User.Read` permission in Azure
- Add `offline_access` scope

---

## 🚀 Deployment Checklist

### Before Deploying to Production

#### Security
- [ ] Use HTTPS (not HTTP)
- [ ] Update `JWT_SECRET` to strong value
- [ ] Use production database
- [ ] Enable database SSL connections
- [ ] Set strong database password
- [ ] Remove all `console.log` statements
- [ ] Implement rate limiting
- [ ] Set up error logging (Sentry, etc.)
- [ ] Implement CORS properly (whitelist domains)

#### Azure Configuration
- [ ] Create production app registration
- [ ] Add production redirect URI
- [ ] Generate new client secret for production
- [ ] Grant admin consent for permissions
- [ ] Test full flow on staging

#### Environment
- [ ] Set `NODE_ENV=production`
- [ ] Update all environment variables
- [ ] Use environment variable management service
- [ ] Never commit `.env` file
- [ ] Rotate secrets regularly

#### Database
- [ ] Run migrations on production DB
- [ ] Verify all users table columns exist
- [ ] Verify all indexes are created
- [ ] Set up automated backups
- [ ] Test backup restoration

#### Frontend
- [ ] Update `FRONTEND_URL` to production
- [ ] Build frontend for production
- [ ] Set up CORS headers correctly
- [ ] Implement token refresh logic
- [ ] Handle 401 errors (expired token)

#### Monitoring
- [ ] Set up error tracking
- [ ] Set up auth event logging
- [ ] Monitor failed login attempts
- [ ] Alert on suspicious activity
- [ ] Track token refresh rates

#### Testing
- [ ] Full auth flow test (dev, staging, prod)
- [ ] Token refresh test
- [ ] Token expiration test
- [ ] Logout test
- [ ] Protected routes test
- [ ] Role-based access test
- [ ] Error handling test
- [ ] Load testing on auth endpoints

#### Documentation
- [ ] Document auth flow
- [ ] Document all environment variables
- [ ] Document troubleshooting steps
- [ ] Create runbook for support team

---

## 📚 Additional Resources

### Microsoft Documentation

| Resource | URL |
|----------|-----|
| Microsoft Identity Platform | https://learn.microsoft.com/en-us/azure/active-directory/develop/ |
| OAuth 2.0 Flow | https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow |
| Microsoft Graph API | https://learn.microsoft.com/en-us/graph/api/overview |
| Azure Portal | https://portal.azure.com |

### NPM Packages

| Package | URL |
|---------|-----|
| axios | https://github.com/axios/axios |
| jsonwebtoken | https://github.com/auth0/node-jsonwebtoken |
| uuid | https://github.com/uuidjs/uuid |
| bcryptjs | https://github.com/dcodeIO/bcrypt.js |

### Related Modules

| Module | Description |
|--------|-------------|
| `@azure/msal-node` | Alternative to manual OAuth |
| `passport-oauth2` | Passport strategy for OAuth |
| `express-session` | Session management |
| `helmet` | Security headers |

---
