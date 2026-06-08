# Microsoft Planner Integration Module

A Node.js/Express module for seamlessly creating tasks in Microsoft Planner using your existing Microsoft authentication setup.

## Quick Start (5 minutes)

### 1. Install Dependencies
```bash
npm install @microsoft/microsoft-graph-client
```

### 2. Set Environment Variables
Add to your `.env` file:
```env
MICROSOFT_CLIENT_ID=your-azure-app-id
MICROSOFT_CLIENT_SECRET=your-azure-app-secret
PLANNER_PLAN_ID=your-plan-id
PLANNER_REVIEW_BUCKET_ID=your-bucket-id
```

### 3. Import in Your Routes
```javascript
const { createPlannerTask, createTaskHandler } = require('./msPlanner');

app.post('/api/planner/task', createTaskHandler);
```

### 4. Make API Calls
```bash
curl -X POST http://localhost:3000/api/planner/task \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Review Product Roadmap",
    "description": "Review Q4 roadmap",
    "planId": "your-plan-id",
    "bucketId": "your-bucket-id",
    "assigneeId": "azure-object-id",
    "dueDate": "2026-07-15",
    "priority": 7
  }'
```

## Features

✅ **Automatic Token Refresh** - Tokens are automatically refreshed when expired  
✅ **Task Assignment** - Assign tasks to specific Azure users  
✅ **Error Handling** - Comprehensive error messages and logging  
✅ **DB Integration** - Seamlessly uses your existing users table  
✅ **Multiple Task Helpers** - Get plans, buckets, discover structure  
✅ **Express Middleware Ready** - Works with your auth middleware  

## Functions

### `createPlannerTask(taskData)`
Creates a new task in Microsoft Planner.

**Parameters:**
```javascript
{
  userId: number,           // User creating task (required)
  title: string,            // Task title (required)
  description: string,      // Task description (optional)
  planId: string,           // Planner Plan ID (required)
  bucketId: string,         // Planner Bucket ID (required)
  assigneeId: string,       // Azure Object ID of assignee (required)
  dueDate: string,          // ISO date format (optional)
  priority: number          // 0-10 scale (optional)
}
```

**Returns:**
```javascript
{
  success: boolean,
  message: string,
  task: object,             // Created task details
  error: object             // Error details if failed
}
```

### `createTaskHandler` (Express Middleware)
Express route handler for `/api/planner/task` POST requests.

### `getUserPlans(userId)`
Fetches all Planner plans for a user.

### `getPlanBuckets(userId, planId)`
Fetches all buckets in a specific plan.

### `refreshAccessToken(userId)`
Manually refresh a user's Microsoft access token.

## Database Schema

Ensure your `users` table has these columns:
```sql
CREATE TABLE users (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  microsoft_oid VARCHAR(64) UNIQUE,           -- Azure Object ID
  microsoft_tenant_id VARCHAR(64),            -- Tenant ID
  ms_access_token TEXT,                       -- Access token
  ms_refresh_token TEXT,                      -- Refresh token
  role ENUM('member','admin','superAdmin','content') DEFAULT 'member',
  is_active TINYINT(1) DEFAULT 1,
  last_login_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Finding Plan and Bucket IDs

### Using the Module
```javascript
const { getUserPlans, getPlanBuckets } = require('./msPlanner');

// Get all plans
const plansResult = await getUserPlans(userId);
plansResult.plans.forEach(plan => {
  console.log(`${plan.title}: ${plan.id}`);
});

// Get buckets for a plan
const bucketsResult = await getPlanBuckets(userId, planId);
bucketsResult.buckets.forEach(bucket => {
  console.log(`${bucket.name}: ${bucket.id}`);
});
```

### Using Microsoft 365 UI
1. Open Microsoft Teams or Outlook
2. Go to Plans / Planner tab
3. Right-click plan → "Copy plan ID"
4. Open bucket and copy bucket ID from URL

## Complete Integration Example

```javascript
const express = require('express');
const { createPlannerTask, createTaskHandler, getUserPlans } = require('./msPlanner');

const app = express();
app.use(express.json());

// Auth middleware
app.use((req, res, next) => {
  // Implement your auth logic here
  req.user = { id: 1 }; // Example
  next();
});

// Create task endpoint
app.post('/api/planner/task', createTaskHandler);

// Get plans endpoint
app.get('/api/planner/plans', async (req, res) => {
  const result = await getUserPlans(req.user.id);
  res.json(result);
});

// Create task on product status change
app.post('/api/products/:id/status', async (req, res) => {
  const { newStatus } = req.body;

  // Update product in database
  // ... your update logic ...

  // Create Planner task if needed
  if (newStatus === 'review') {
    const result = await createPlannerTask({
      userId: req.user.id,
      title: `Product Review: ${req.params.id}`,
      planId: process.env.PLANNER_PLAN_ID,
      bucketId: process.env.PLANNER_REVIEW_BUCKET_ID,
      assigneeId: req.body.reviewerOid,
      priority: 8,
    });

    if (!result.success) {
      console.warn('Planner task failed:', result.message);
    }
  }

  res.json({ success: true });
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

## Troubleshooting

### "User not found"
- Verify userId exists in database
- Check user has completed Microsoft authentication

### "Token refresh failed"
- Ensure `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET` are set
- Verify user has valid refresh token in database

### "Invalid plan/bucket ID"
- Use `getUserPlans()` and `getPlanBuckets()` to discover IDs
- Planner IDs are Base64 encoded
- IDs must be copied exactly

### "Unauthorized (401)"
- Module attempts automatic token refresh
- If still fails, user may need to re-authenticate
- Check token expiration in database

### "Task created but assignment failed"
- Task is created successfully
- Assignee doesn't have access to the plan
- Check plan permissions in Teams/Outlook

## API Response Examples

### Success
```json
{
  "success": true,
  "message": "Task created successfully in Planner",
  "task": {
    "id": "task-123abc",
    "title": "Review Product Roadmap",
    "planId": "plan-456def",
    "bucketId": "bucket-789ghi",
    "createdDateTime": "2026-06-08T10:30:00Z",
    "dueDateTime": "2026-07-15T00:00:00Z",
    "priority": 7,
    "hasDescription": true
  }
}
```

### Error - Missing Fields
```json
{
  "success": false,
  "message": "Missing required fields: planId, assigneeId",
  "error": null
}
```

### Error - API Error
```json
{
  "success": false,
  "message": "Invalid plan ID",
  "error": {
    "code": "BadRequest",
    "message": "Invalid plan ID"
  }
}
```

## Performance Tips

1. **Batch Operations**
   ```javascript
   const tasks = await Promise.all(
     userOids.map(oid => createPlannerTask({...}))
   );
   ```

2. **Cache Plan/Bucket IDs** - Store in environment variables

3. **Implement Rate Limiting**
   ```bash
   npm install express-rate-limit
   ```

4. **Monitor Token Refresh** - Check logs for "Access token expired"

5. **Database Connection Pool** - Ensure MySQL connection pool is properly sized

## Security Checklist

- ✅ Access tokens stored encrypted in database
- ✅ Tokens never exposed in API responses
- ✅ Automatic token refresh on expiration
- ✅ Input validation for required fields
- ✅ User ID validation against authenticated user
- ✅ Rate limiting recommended for production
- ✅ Tenant ID ensures multi-tenant isolation

## Migration/Setup Steps

1. **Install module**
   ```bash
   npm install @microsoft/microsoft-graph-client
   cp msPlanner.js /path/to/your/project
   ```

2. **Update .env**
   ```env
   MICROSOFT_CLIENT_ID=your-id
   MICROSOFT_CLIENT_SECRET=your-secret
   ```

3. **Verify database schema**
   - Check `users` table has required columns
   - Verify auth flow populates `ms_access_token` and `ms_refresh_token`

4. **Import and mount routes**
   ```javascript
   const plannerRoutes = require('./msPlanner-CONFIG');
   plannerRoutes(app);
   ```

5. **Test**
   - Use discovery endpoints to get plan/bucket IDs
   - Create test task
   - Verify in Planner UI

## Files Included

- **msPlanner.js** - Main module (ready to use)
- **msPlanner-USAGE.js** - Examples and patterns
- **msPlanner-CONFIG.js** - Configuration and setup guide
- **msPlanner-README.md** - This file

## Support & Debugging

Enable detailed logging:
```javascript
// In msPlanner.js, modify error handlers:
console.error = (msg) => logger.error(msg);
console.log = (msg) => logger.info(msg);
```

Check Microsoft Graph API docs:
- https://learn.microsoft.com/en-us/graph/api/planner-post-tasks
- https://learn.microsoft.com/en-us/graph/api/planner-list-plans
  
