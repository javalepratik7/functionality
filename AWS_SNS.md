# AWS SNS (Simple Notification Service) Implementation Guide

This guide covers how to set up and implement AWS SNS for sending SMS notifications in your application.

## Table of Contents
1. [AWS Console Setup](#aws-console-setup)
2. [Code Implementation](#code-implementation)
3. [Environment Variables](#environment-variables)
4. [Usage Examples](#usage-examples)
5. [Best Practices](#best-practices)

---

## AWS Console Setup

### Step 1: Create an AWS Account
1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Sign in or create a new account
3. Navigate to the **SNS (Simple Notification Service)** dashboard

### Step 2: Verify Your Phone Number (Sandbox Mode)
1. In the SNS console, go to **Text messaging (SMS)** in the left sidebar
2. Click on **Phone numbers** → **Request phone number**
3. For testing, you can use the **Sandbox** mode which allows you to:
   - Send SMS to verified phone numbers only
   - Test your implementation without charges
4. To verify a phone number:
   - Go to **Text messaging (SMS)** → **Phone numbers**
   - Click **Create phone number**
   - Enter the phone number in E.164 format (e.g., +1234567890)
   - Click **Create phone number**
   - Enter the verification code sent to your phone

### Step 3: Request Production Access (Optional)
1. If you need to send SMS to unverified numbers:
   - Go to **Text messaging (SMS)** → **Account preferences**
   - Click **Edit** under **Account settings**
   - Request production access by providing:
     - Use case description
     - Expected monthly volume
     - Sample messages
   - Wait for AWS approval (usually 24-48 hours)

### Step 4: Create IAM User and Access Keys
1. Go to **IAM** (Identity and Access Management) in AWS Console
2. Click **Users** → **Create user**
3. Enter a username (e.g., `sns-sms-user`)
4. Click **Next**
5. Under **Set permissions**, select **Attach policies directly**
6. Search for and select **AmazonSNSFullAccess** (or create a custom policy with minimal permissions)
7. Click **Next** → **Create user**
8. Click on the created user → **Security credentials** tab
9. Click **Create access key**
10. Select **Application running outside AWS**
11. Click **Next** → **Create access key**
12. **IMPORTANT**: Copy and save both:
    - **Access key ID**
    - **Secret access key** (shown only once)

### Step 5: Set Up SNS Topic (Optional - for Push Notifications)
If you want to use SNS Topics for push notifications:
1. Go to **SNS** → **Topics** → **Create topic**
2. Choose **Standard** or **FIFO** topic type
3. Enter a topic name (e.g., `user-notifications`)
4. Click **Create topic**
5. Copy the **Topic ARN** for later use

---

## Code Implementation

### Step 1: Install AWS SDK

The AWS SDK is already installed in your project. If you need to install it:

```bash
npm install @aws-sdk/client-sns
```

### Step 2: Create SNS Service File

Create or update `Backend/services/snsSMSService.js`:

```javascript
// snsSMSService.js
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

// Initialize SNS Client
const snsClient = new SNSClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

/**
 * Send SMS using AWS SNS
 * @param {string} phoneNumber - Phone number in E.164 format (e.g., +1234567890)
 * @param {string} message - Message text to send
 * @returns {Promise<Object>} AWS SNS response
 */
export const sendSMS = async (phoneNumber, message) => {
  try {
    // Validate phone number format (E.164)
    if (!phoneNumber.startsWith('+')) {
      throw new Error('Phone number must be in E.164 format (e.g., +1234567890)');
    }

    // Validate message length (SMS limit is 160 characters for single message)
    if (message.length > 160) {
      console.warn(`Message exceeds 160 characters. It will be split into multiple messages.`);
    }

    const params = {
      Message: message,
      PhoneNumber: phoneNumber,
    };

    const response = await snsClient.send(new PublishCommand(params));
    console.log("📲 SMS sent successfully:", response.MessageId);

    return {
      success: true,
      messageId: response.MessageId,
      response: response
    };
  } catch (error) {
    console.error("❌ SMS sending failed:", error);
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
};

/**
 * Send SMS to multiple phone numbers using SNS Topic
 * @param {string} topicArn - SNS Topic ARN
 * @param {string} message - Message text to send
 * @returns {Promise<Object>} AWS SNS response
 */
export const sendSMSToTopic = async (topicArn, message) => {
  try {
    const params = {
      Message: message,
      TopicArn: topicArn,
    };

    const response = await snsClient.send(new PublishCommand(params));
    console.log("📲 SMS sent to topic successfully:", response.MessageId);

    return {
      success: true,
      messageId: response.MessageId,
      response: response
    };
  } catch (error) {
    console.error("❌ SMS sending to topic failed:", error);
    throw new Error(`Failed to send SMS to topic: ${error.message}`);
  }
};

/**
 * Format phone number to E.164 format
 * @param {string} phoneNumber - Phone number in any format
 * @param {string} defaultCountryCode - Default country code (e.g., '1' for US)
 * @returns {string} Phone number in E.164 format
 */
export const formatPhoneNumber = (phoneNumber, defaultCountryCode = '1') => {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // If already starts with country code, add +
  if (digits.length >= 10) {
    // If starts with country code
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    // If 10 digits, assume US number
    if (digits.length === 10) {
      return `+${defaultCountryCode}${digits}`;
    }
    // If longer, assume it includes country code
    return `+${digits}`;
  }
  
  throw new Error('Invalid phone number format');
};

export default {
  sendSMS,
  sendSMSToTopic,
  formatPhoneNumber
};
```

### Step 3: Create Controller/Route Handler

Create or update `Backend/controllers/smsController.js`:

```javascript
// smsController.js
import { sendSMS, formatPhoneNumber } from "../services/snsSMSService.js";

/**
 * Send SMS to a single phone number
 */
export const sendSMSHandler = async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        error: "Phone number and message are required"
      });
    }

    // Format phone number to E.164
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Send SMS
    const result = await sendSMS(formattedPhone, message);

    res.json({
      success: true,
      message: "SMS sent successfully",
      messageId: result.messageId
    });
  } catch (error) {
    console.error("Error sending SMS:", error);
    res.status(500).json({
      error: "Failed to send SMS",
      details: error.message
    });
  }
};

/**
 * Send SMS to multiple recipients
 */
export const sendBulkSMSHandler = async (req, res) => {
  try {
    const { phoneNumbers, message } = req.body;

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({
        error: "Phone numbers array is required"
      });
    }

    if (!message) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    const results = await Promise.allSettled(
      phoneNumbers.map(phone => {
        const formattedPhone = formatPhoneNumber(phone);
        return sendSMS(formattedPhone, message);
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json({
      success: true,
      total: phoneNumbers.length,
      successful,
      failed,
      results: results.map((r, i) => ({
        phoneNumber: phoneNumbers[i],
        status: r.status,
        messageId: r.status === 'fulfilled' ? r.value.messageId : null,
        error: r.status === 'rejected' ? r.reason.message : null
      }))
    });
  } catch (error) {
    console.error("Error sending bulk SMS:", error);
    res.status(500).json({
      error: "Failed to send bulk SMS",
      details: error.message
    });
  }
};
```

### Step 4: Create Routes

Create or update `Backend/routes/smsRouter.js`:

```javascript
// smsRouter.js
import express from "express";
import { sendSMSHandler, sendBulkSMSHandler } from "../controllers/smsController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Send SMS to single recipient
router.post("/send", authenticate, sendSMSHandler);

// Send SMS to multiple recipients
router.post("/send-bulk", authenticate, sendBulkSMSHandler);

export default router;
```

### Step 5: Register Routes in server.js

Add the SMS routes to your `Backend/server.js`:

```javascript
import smsRoutes from "./routes/smsRouter.js";

// ... existing code ...

app.use("/api/sms", smsRoutes);
```

---

## Environment Variables

Add these variables to your `.env` file:

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here

# Optional: SNS Topic ARN (if using topics)
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:user-notifications
```

**Security Note**: Never commit your `.env` file to version control. Add it to `.gitignore`.

---

## Usage Examples

### Example 1: Send SMS from Controller

```javascript
import { sendSMS, formatPhoneNumber } from "../services/snsSMSService.js";

// In your controller
const phoneNumber = formatPhoneNumber("1234567890"); // Becomes +11234567890
const message = "Your verification code is 123456";

try {
  const result = await sendSMS(phoneNumber, message);
  console.log("SMS sent:", result.messageId);
} catch (error) {
  console.error("Failed to send SMS:", error);
}
```

### Example 2: Send SMS via API Endpoint

```javascript
// Frontend or API call
const response = await fetch('http://localhost:4000/api/sms/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    phoneNumber: '+1234567890',
    message: 'Hello from Top Tutors Connect!'
  })
});

const data = await response.json();
console.log(data);
```

### Example 3: Send Bulk SMS

```javascript
const response = await fetch('http://localhost:4000/api/sms/send-bulk', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    phoneNumbers: ['+1234567890', '+1987654321'],
    message: 'Bulk notification message'
  })
});
```

---

## Best Practices

### 1. Phone Number Formatting
- Always use E.164 format: `+[country code][number]`
- Example: `+1234567890` (US), `+919876543210` (India)

### 2. Message Length
- Standard SMS: 160 characters (single message)
- Long messages are automatically split (charged as multiple messages)
- Consider using MMS for longer content

### 3. Error Handling
- Always wrap SNS calls in try-catch blocks
- Log errors for debugging
- Implement retry logic for transient failures

### 4. Rate Limiting
- AWS SNS has rate limits (varies by region)
- Implement rate limiting in your application
- Use SNS Topics for high-volume scenarios

### 5. Cost Optimization
- Use Sandbox mode for development/testing
- Monitor usage in AWS Cost Explorer
- Set up billing alerts
- Consider using SNS Topics for bulk messaging

### 6. Security
- Store AWS credentials in environment variables
- Use IAM roles with minimal required permissions
- Never expose credentials in client-side code
- Rotate access keys regularly

### 7. Monitoring
- Set up CloudWatch alarms for failed messages
- Monitor delivery rates
- Track message costs

### 8. Testing
- Always test in Sandbox mode first
- Verify phone numbers before sending
- Test error scenarios

---

## Troubleshooting

### Common Issues

1. **"Phone number is not verified"**
   - Solution: Verify the phone number in AWS SNS console (Sandbox mode)

2. **"Invalid phone number format"**
   - Solution: Ensure phone number is in E.164 format (+country code + number)

3. **"Access Denied"**
   - Solution: Check IAM user permissions and credentials

4. **"Region mismatch"**
   - Solution: Ensure AWS_REGION matches your SNS configuration

5. **High costs**
   - Solution: Monitor usage, use Sandbox for testing, set up billing alerts

---

## Additional Resources

- [AWS SNS Documentation](https://docs.aws.amazon.com/sns/)
- [AWS SNS Pricing](https://aws.amazon.com/sns/pricing/)
- [E.164 Phone Number Format](https://en.wikipedia.org/wiki/E.164)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sns/)

---

## Next Steps

1. Set up CloudWatch alarms for monitoring
2. Implement message templates
3. Add delivery status callbacks
4. Set up SNS Topics for group messaging
5. Implement SMS verification workflows

