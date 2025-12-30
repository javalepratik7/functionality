# AWS IAM (Identity and Access Management) Implementation Guide

This comprehensive guide explains what AWS IAM is, why it's critical for security, and how to properly implement it in your application.

## Table of Contents
1. [What is IAM and Why is it Important?](#what-is-iam-and-why-is-it-important)
2. [Core IAM Concepts](#core-iam-concepts)
3. [AWS Console Setup](#aws-console-setup)
4. [IAM Best Practices](#iam-best-practices)
5. [Code Implementation](#code-implementation)
6. [Advanced IAM Scenarios](#advanced-iam-scenarios)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting](#troubleshooting)

---

## What is IAM and Why is it Important?

### What is AWS IAM?

AWS Identity and Access Management (IAM) is a web service that helps you securely control access to AWS resources. It enables you to:

- **Manage Users**: Create and manage AWS users and their access
- **Control Permissions**: Define what users can and cannot do
- **Secure Resources**: Protect your AWS resources from unauthorized access
- **Audit Access**: Track who did what and when

### Why is IAM Critical?

#### 1. **Security First**
- **Principle of Least Privilege**: Users only get permissions they absolutely need
- **No Root Account Usage**: Avoid using root account credentials in applications
- **Credential Management**: Centralized control over who has access to what

#### 2. **Compliance and Auditing**
- **Access Logging**: CloudTrail logs all IAM actions
- **Compliance**: Meet regulatory requirements (GDPR, HIPAA, etc.)
- **Accountability**: Know exactly who accessed what resources

#### 3. **Cost Control**
- **Prevent Accidental Costs**: Limit permissions to prevent expensive mistakes
- **Resource Protection**: Prevent unauthorized resource creation
- **Budget Management**: Control who can create expensive resources

#### 4. **Scalability**
- **Team Management**: Easily add/remove team members
- **Role-Based Access**: Assign permissions based on job functions
- **Automation**: Use roles for applications and services

#### 5. **Disaster Prevention**
- **Accidental Deletion**: Prevent users from deleting critical resources
- **Data Breaches**: Limit access reduces attack surface
- **Misconfiguration**: Prevent users from making dangerous changes

### Real-World Example: What Happens Without IAM?

**Bad Practice (Using Root Account):**
```javascript
// ❌ NEVER DO THIS - Using root account credentials
const s3Client = new S3Client({
  credentials: {
    accessKeyId: "ROOT_ACCESS_KEY",  // Full access to everything!
    secretAccessKey: "ROOT_SECRET"
  }
});
// If compromised: Attacker has FULL control of your AWS account
// - Can delete all resources
// - Can create expensive resources
// - Can access all data
// - Can modify billing
```

**Good Practice (Using IAM User with Limited Permissions):**
```javascript
// ✅ CORRECT - Using IAM user with specific permissions
const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,  // Limited to S3 only
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});
// If compromised: Attacker can only access S3 bucket
// - Cannot access other services
// - Cannot delete other resources
// - Limited damage scope
```

---

## Core IAM Concepts

### 1. **Users**
- Represents a person or application that needs access
- Has permanent credentials (Access Key ID + Secret Access Key)
- Best for: Applications, services, long-term access

### 2. **Groups**
- Collection of users
- Makes permission management easier
- Best for: Teams, departments, role-based access

### 3. **Roles**
- Temporary credentials (no permanent keys)
- Can be assumed by users, applications, or AWS services
- Best for: EC2 instances, Lambda functions, cross-account access

### 4. **Policies**
- JSON documents that define permissions
- Attached to users, groups, or roles
- Defines: What actions are allowed/denied on which resources

### 5. **Access Keys**
- Credentials for programmatic access
- Access Key ID (public) + Secret Access Key (private)
- Used in applications to authenticate to AWS

---

## AWS Console Setup

### Step 1: Access IAM Console

1. Log into [AWS Console](https://console.aws.amazon.com/)
2. Search for "IAM" in the services search bar
3. Click on **IAM** service

### Step 2: Create an IAM User for Your Application

#### Option A: User for Application (Recommended for Your Use Case)

1. In IAM console, click **Users** → **Create user**
2. Enter username (e.g., `ttc-application-user`)
3. Select **Provide user access to the AWS Management Console** (optional, for manual access)
   - Or select **Access key - Programmatic access** (for application use)
4. Click **Next**

#### Step 3: Set Permissions

**Option 1: Attach Policies Directly (Quick Start)**

1. Click **Attach policies directly**
2. Search for and select policies:
   - `AmazonS3FullAccess` (if using S3)
   - `AmazonSESFullAccess` (if using SES)
   - `AmazonSNSFullAccess` (if using SNS)
3. Click **Next**

**Option 2: Create Custom Policy (Recommended - More Secure)**

1. Click **Create policy**
2. Click **JSON** tab
3. Use the policy examples below based on your needs
4. Click **Next** → Name the policy (e.g., `TTC-Application-Policy`)
5. Click **Create policy**
6. Go back to user creation and attach the new policy

**Example: Custom Policy for S3, SES, and SNS**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3DocumentAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    },
    {
      "Sid": "SESEmailAccess",
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:SendTemplatedEmail"
      ],
      "Resource": "*"
    },
    {
      "Sid": "SNSSMSAccess",
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "*"
    }
  ]
}
```

**Example: More Restrictive Policy (Better Security)**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3DocumentAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/documents/*"
    },
    {
      "Sid": "S3ListBucket",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name",
      "Condition": {
        "StringLike": {
          "s3:prefix": "documents/*"
        }
      }
    },
    {
      "Sid": "SESEmailAccess",
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ses:FromAddress": "noreply@yourdomain.com"
        }
      }
    },
    {
      "Sid": "SNSSMSAccess",
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "*",
      "Condition": {
        "StringLike": {
          "sns:endpoint": "+*"
        }
      }
    }
  ]
}
```

#### Step 4: Create Access Keys

1. After creating the user, click on the username
2. Go to **Security credentials** tab
3. Scroll to **Access keys** section
4. Click **Create access key**
5. Select **Application running outside AWS**
6. Click **Next** → **Create access key**
7. **CRITICAL**: Copy both:
   - **Access key ID** (you can see this later)
   - **Secret access key** (shown only once - save it immediately!)
8. Store these securely (see Security section below)

### Step 5: Create IAM Groups (Optional but Recommended)

For better organization, create groups for different roles:

1. Click **User groups** → **Create group**
2. Name it (e.g., `ttc-developers`, `ttc-admins`)
3. Attach policies to the group
4. Add users to groups

**Benefits:**
- Easier permission management
- Add/remove users from groups instead of managing individual permissions
- Consistent permissions across team members

### Step 6: Set Up Password Policy (For Console Access)

1. Click **Account settings** in left sidebar
2. Under **Password policy**, click **Edit**
3. Configure:
   - Minimum password length: 12 characters
   - Require uppercase, lowercase, numbers, symbols
   - Password expiration: 90 days
   - Prevent password reuse: 5 previous passwords
4. Click **Save changes**

### Step 7: Enable MFA (Multi-Factor Authentication)

For additional security on root account and admin users:

1. Click on a user
2. Go to **Security credentials** tab
3. Under **Assigned MFA device**, click **Assign MFA device**
4. Choose **Virtual MFA device** (use authenticator app)
5. Scan QR code with authenticator app
6. Enter two consecutive codes to verify

---

## IAM Best Practices

### 1. **Principle of Least Privilege**
- Give users only the minimum permissions they need
- Start restrictive, add permissions as needed
- Regularly review and remove unused permissions

### 2. **Use IAM Roles for AWS Services**
- For EC2 instances, Lambda functions, use roles instead of access keys
- Roles provide temporary credentials automatically
- More secure than storing access keys

### 3. **Separate Users for Different Purposes**
- **Application User**: For your Node.js application
- **Admin User**: For manual AWS console access
- **CI/CD User**: For deployment pipelines
- **Monitoring User**: For read-only monitoring access

### 4. **Rotate Access Keys Regularly**
- Rotate keys every 90 days
- Create new key before deleting old one
- Test new key before removing old key

### 5. **Use Policy Conditions**
- Restrict by IP address
- Restrict by time of day
- Restrict by source (specific services)

### 6. **Enable CloudTrail**
- Log all IAM actions
- Monitor for suspicious activity
- Set up alerts for unauthorized access attempts

### 7. **Tag Resources**
- Use tags to organize resources
- Use tags in IAM policies for resource-level permissions
- Makes management easier

### 8. **Regular Audits**
- Review user permissions quarterly
- Remove unused access keys
- Remove inactive users
- Review CloudTrail logs

---

## Code Implementation

### Step 1: Secure Credential Storage

**Never hardcode credentials in code!**

#### Option A: Environment Variables (Current Approach - Good)

```javascript
// ✅ CORRECT - Using environment variables
// Backend/.env
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
```

```javascript
// Backend/services/cloudStorage.js
import dotenv from "dotenv";
dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
```

#### Option B: AWS Credentials File (Alternative)

```bash
# ~/.aws/credentials
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[production]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE2
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY2
```

```javascript
// SDK automatically reads from ~/.aws/credentials
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  // No credentials needed - SDK reads from file
});
```

#### Option C: IAM Roles (Best for AWS Services)

```javascript
// For EC2, Lambda, ECS - use roles instead of keys
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  // SDK automatically uses instance/execution role
  // No credentials needed!
});
```

### Step 2: Create Credential Management Service

Create `Backend/services/awsCredentialService.js`:

```javascript
// awsCredentialService.js
import dotenv from "dotenv";

dotenv.config();

/**
 * Validates AWS credentials are configured
 * @returns {Object} Credentials object or throws error
 */
export const getAWSCredentials = () => {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env file"
    );
  }

  if (!region) {
    console.warn("AWS_REGION not set, defaulting to us-east-1");
  }

  return {
    accessKeyId,
    secretAccessKey,
    region: region || "us-east-1",
  };
};

/**
 * Creates AWS client configuration
 * @param {string} service - Service name (s3, ses, sns)
 * @returns {Object} Client configuration
 */
export const createAWSClientConfig = (service = "s3") => {
  const credentials = getAWSCredentials();

  return {
    region: credentials.region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  };
};

/**
 * Validates IAM permissions for a service
 * @param {string} service - Service name
 * @param {Array} requiredActions - Required IAM actions
 * @returns {boolean} True if permissions are likely sufficient
 */
export const validateIAMPermissions = (service, requiredActions) => {
  // This is a placeholder - actual validation would require AWS API calls
  console.log(
    `Validating IAM permissions for ${service}: ${requiredActions.join(", ")}`
  );
  return true;
};

export default {
  getAWSCredentials,
  createAWSClientConfig,
  validateIAMPermissions,
};
```

### Step 3: Update Existing Services to Use Credential Service

Update `Backend/services/cloudStorage.js`:

```javascript
// cloudStorage.js
import { createAWSClientConfig } from "./awsCredentialService.js";
import { S3Client } from "@aws-sdk/client-s3";

// Use centralized credential management
const config = createAWSClientConfig("s3");
const s3Client = new S3Client(config);
```

Update `Backend/services/sesEmailServices.js`:

```javascript
// sesEmailServices.js
import { createAWSClientConfig } from "./awsCredentialService.js";
import { SESClient } from "@aws-sdk/client-ses";

const config = createAWSClientConfig("ses");
const sesClient = new SESClient(config);
```

Update `Backend/services/snsSMSService.js`:

```javascript
// snsSMSService.js
import { createAWSClientConfig } from "./awsCredentialService.js";
import { SNSClient } from "@aws-sdk/client-sns";

const config = createAWSClientConfig("sns");
const snsClient = new SNSClient(config);
```

### Step 4: Add Credential Validation on Startup

Update `Backend/server.js`:

```javascript
// server.js
import { getAWSCredentials, validateIAMPermissions } from "./services/awsCredentialService.js";

async function startServer() {
  try {
    // Validate AWS credentials on startup
    try {
      const credentials = getAWSCredentials();
      console.log("✅ AWS credentials configured");
      console.log(`   Region: ${credentials.region}`);
      console.log(`   Access Key: ${credentials.accessKeyId.substring(0, 8)}...`);
      
      // Validate permissions (optional)
      validateIAMPermissions("s3", ["s3:PutObject", "s3:GetObject"]);
      validateIAMPermissions("ses", ["ses:SendEmail"]);
      validateIAMPermissions("sns", ["sns:Publish"]);
    } catch (error) {
      console.warn("⚠️ AWS credentials not configured:", error.message);
      console.warn("   Some features may not work without AWS configuration");
    }

    await ensureDatabase();
    // ... rest of startup code
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}
```

### Step 5: Create IAM Policy Testing Utility

Create `Backend/utils/iamPolicyTester.js`:

```javascript
// iamPolicyTester.js
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import { SESClient, GetSendQuotaCommand } from "@aws-sdk/client-ses";
import { SNSClient, ListTopicsCommand } from "@aws-sdk/client-sns";
import { createAWSClientConfig } from "../services/awsCredentialService.js";

/**
 * Test IAM permissions for S3
 */
export const testS3Permissions = async () => {
  try {
    const config = createAWSClientConfig("s3");
    const s3Client = new S3Client(config);
    
    await s3Client.send(new ListBucketsCommand({}));
    console.log("✅ S3 permissions: OK");
    return true;
  } catch (error) {
    console.error("❌ S3 permissions test failed:", error.message);
    return false;
  }
};

/**
 * Test IAM permissions for SES
 */
export const testSESPermissions = async () => {
  try {
    const config = createAWSClientConfig("ses");
    const sesClient = new SESClient(config);
    
    await sesClient.send(new GetSendQuotaCommand({}));
    console.log("✅ SES permissions: OK");
    return true;
  } catch (error) {
    console.error("❌ SES permissions test failed:", error.message);
    return false;
  }
};

/**
 * Test IAM permissions for SNS
 */
export const testSNSPermissions = async () => {
  try {
    const config = createAWSClientConfig("sns");
    const snsClient = new SNSClient(config);
    
    await snsClient.send(new ListTopicsCommand({}));
    console.log("✅ SNS permissions: OK");
    return true;
  } catch (error) {
    console.error("❌ SNS permissions test failed:", error.message);
    return false;
  }
};

/**
 * Test all IAM permissions
 */
export const testAllPermissions = async () => {
  console.log("🔍 Testing IAM permissions...\n");
  
  const results = {
    s3: await testS3Permissions(),
    ses: await testSESPermissions(),
    sns: await testSNSPermissions(),
  };

  const allPassed = Object.values(results).every((r) => r === true);
  
  if (allPassed) {
    console.log("\n✅ All IAM permissions tests passed!");
  } else {
    console.log("\n⚠️ Some IAM permissions tests failed. Check your IAM policies.");
  }

  return results;
};
```

### Step 6: Add Health Check Endpoint

Update `Backend/routes/healthRoutes.js`:

```javascript
// healthRoutes.js
import express from "express";
import { testAllPermissions } from "../utils/iamPolicyTester.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ status: "ok", service: "Top Tutors Connect API" });
});

router.get("/aws", async (req, res) => {
  try {
    const results = await testAllPermissions();
    res.json({
      status: "ok",
      aws: {
        permissions: results,
        configured: Object.values(results).some((r) => r === true),
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
});

export default router;
```

---

## Advanced IAM Scenarios

### Scenario 1: Multiple Environments (Dev, Staging, Production)

**Create separate IAM users for each environment:**

```bash
# Development
AWS_ACCESS_KEY_ID_DEV=AKIA...
AWS_SECRET_ACCESS_KEY_DEV=...

# Staging
AWS_ACCESS_KEY_ID_STAGING=AKIA...
AWS_SECRET_ACCESS_KEY_STAGING=...

# Production
AWS_ACCESS_KEY_ID_PROD=AKIA...
AWS_SECRET_ACCESS_KEY_PROD=...
```

```javascript
// awsCredentialService.js
export const getAWSCredentials = () => {
  const env = process.env.NODE_ENV || "development";
  const suffix = env === "production" ? "PROD" : env.toUpperCase();

  return {
    accessKeyId: process.env[`AWS_ACCESS_KEY_ID_${suffix}`] || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env[`AWS_SECRET_ACCESS_KEY_${suffix}`] || process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || "us-east-1",
  };
};
```

### Scenario 2: IP-Based Restrictions

**IAM Policy with IP condition:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket/*",
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": [
            "203.0.113.0/24",
            "198.51.100.0/24"
          ]
        }
      }
    }
  ]
}
```

### Scenario 3: Time-Based Access

**IAM Policy with time condition:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket/*",
      "Condition": {
        "DateGreaterThan": {
          "aws:CurrentTime": "09:00Z"
        },
        "DateLessThan": {
          "aws:CurrentTime": "17:00Z"
        }
      }
    }
  ]
}
```

### Scenario 4: MFA-Required Access

**Require MFA for sensitive operations:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:DeleteObject",
        "s3:DeleteBucket"
      ],
      "Resource": "*",
      "Condition": {
        "BoolIfExists": {
          "aws:MultiFactorAuthPresent": "true"
        }
      }
    }
  ]
}
```

---

## Security Considerations

### 1. **Never Commit Credentials**

**Add to `.gitignore`:**

```gitignore
# Environment variables
.env
.env.local
.env.*.local

# AWS credentials
.aws/
*.pem
*.key
```

### 2. **Use Secrets Management**

**For production, consider:**

- **AWS Secrets Manager**: Store and rotate secrets
- **AWS Systems Manager Parameter Store**: Store configuration
- **HashiCorp Vault**: External secrets management
- **Environment-specific configs**: Different credentials per environment

### 3. **Rotate Access Keys Regularly**

Create a rotation script:

```javascript
// scripts/rotateAWSCredentials.js
/**
 * Steps to rotate AWS credentials:
 * 1. Create new access key for IAM user
 * 2. Update .env file with new credentials
 * 3. Test application with new credentials
 * 4. Delete old access key
 * 5. Restart application
 */
```

### 4. **Monitor Access**

- Enable **CloudTrail** for all API calls
- Set up **CloudWatch Alarms** for suspicious activity
- Review access logs regularly
- Set up alerts for failed authentication attempts

### 5. **Use IAM Roles When Possible**

**For AWS-hosted services (EC2, Lambda, ECS):**

```javascript
// Instead of access keys, use IAM roles
// SDK automatically assumes the role
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  // No credentials - uses instance role
});
```

### 6. **Implement Credential Validation**

```javascript
// Validate credentials on startup
const validateCredentials = async () => {
  try {
    const sts = new STSClient({ region: process.env.AWS_REGION });
    const command = new GetCallerIdentityCommand({});
    const response = await sts.send(command);
    console.log("✅ AWS credentials valid");
    console.log(`   Account: ${response.Account}`);
    console.log(`   User ARN: ${response.Arn}`);
  } catch (error) {
    throw new Error(`Invalid AWS credentials: ${error.message}`);
  }
};
```

### 7. **Limit Permissions**

**Bad Policy (Too Permissive):**
```json
{
  "Effect": "Allow",
  "Action": "*",
  "Resource": "*"
}
```

**Good Policy (Specific Permissions):**
```json
{
  "Effect": "Allow",
  "Action": [
    "s3:PutObject",
    "s3:GetObject"
  ],
  "Resource": "arn:aws:s3:::specific-bucket/documents/*"
}
```

---

## Troubleshooting

### Issue 1: "Access Denied" Errors

**Symptoms:**
```
AccessDenied: User is not authorized to perform: s3:PutObject
```

**Solutions:**
1. Check IAM policy permissions
2. Verify resource ARN matches policy
3. Check for policy conditions (IP, time, MFA)
4. Ensure user/role has correct policy attached
5. Check if there's an explicit "Deny" policy

**Debug Steps:**
```javascript
// Test specific permission
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

try {
  await s3Client.send(new PutObjectCommand({
    Bucket: "your-bucket",
    Key: "test.txt",
    Body: "test"
  }));
  console.log("✅ Permission works");
} catch (error) {
  console.error("❌ Permission denied:", error.message);
}
```

### Issue 2: "Invalid Credentials"

**Symptoms:**
```
InvalidClientTokenId: The security token included in the request is invalid
```

**Solutions:**
1. Verify `AWS_ACCESS_KEY_ID` is correct
2. Verify `AWS_SECRET_ACCESS_KEY` is correct
3. Check for extra spaces or newlines in .env file
4. Ensure credentials haven't been deleted/rotated
5. Verify region matches credential region

### Issue 3: "Token Expired"

**Symptoms:**
```
ExpiredToken: The provided token has expired
```

**Solutions:**
1. If using temporary credentials (roles), refresh them
2. If using access keys, they don't expire - check if they were rotated
3. Check system clock is correct (affects token validation)

### Issue 4: "Region Mismatch"

**Symptoms:**
```
The bucket you are attempting to access must be addressed using the specified endpoint
```

**Solutions:**
1. Verify `AWS_REGION` matches resource region
2. Some services require specific regions
3. Check bucket/service is in the correct region

### Issue 5: "Policy Too Restrictive"

**Symptoms:**
```
AccessDenied: Access Denied
```

**Debug:**
1. Use IAM Policy Simulator in AWS Console
2. Test policy with specific user/action/resource
3. Check policy conditions
4. Review CloudTrail logs for exact error

---

## IAM Policy Examples for Your Application

### Complete Policy for Top Tutors Connect

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3DocumentManagement",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:GetObjectVersion"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name/documents/*",
        "arn:aws:s3:::your-bucket-name/uploads/*",
        "arn:aws:s3:::your-bucket-name/chat_media/*"
      ]
    },
    {
      "Sid": "S3ListBucket",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name",
      "Condition": {
        "StringLike": {
          "s3:prefix": [
            "documents/*",
            "uploads/*",
            "chat_media/*"
          ]
        }
      }
    },
    {
      "Sid": "SESSendEmail",
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:SendTemplatedEmail"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ses:FromAddress": [
            "noreply@yourdomain.com",
            "support@yourdomain.com"
          ]
        }
      }
    },
    {
      "Sid": "SNSSendSMS",
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "*",
      "Condition": {
        "StringLike": {
          "sns:endpoint": "+*"
        }
      }
    }
  ]
}
```

---

## Additional Resources

- [AWS IAM Documentation](https://docs.aws.amazon.com/iam/)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [IAM Policy Simulator](https://policysim.aws.amazon.com/)
- [AWS Security Best Practices](https://aws.amazon.com/security/security-resources/)
- [IAM Policy Examples](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_examples.html)
- [CloudTrail Documentation](https://docs.aws.amazon.com/cloudtrail/)

---

## Summary

IAM is the foundation of AWS security. By following these practices:

✅ **You'll have:**
- Secure, controlled access to AWS resources
- Audit trail of all actions
- Protection against unauthorized access
- Compliance with security standards
- Cost control and resource protection

✅ **Key Takeaways:**
1. Never use root account credentials
2. Use IAM users with minimal required permissions
3. Rotate access keys regularly
4. Monitor access with CloudTrail
5. Use IAM roles for AWS services when possible
6. Test permissions before deploying
7. Keep credentials secure and never commit them

---

## Next Steps

1. ✅ Create IAM users for your application
2. ✅ Set up custom policies with least privilege
3. ✅ Implement credential management service
4. ✅ Add permission testing utilities
5. ✅ Set up CloudTrail logging
6. ✅ Create credential rotation process
7. ✅ Set up monitoring and alerts

