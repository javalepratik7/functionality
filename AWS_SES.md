# AWS SES (Simple Email Service) Implementation Guide

This guide covers how to set up and implement AWS SES for sending transactional emails in your application.

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
3. Navigate to the **SES (Simple Email Service)** dashboard

### Step 2: Verify Your Email Address (Sandbox Mode)
1. In the SES console, go to **Verified identities** in the left sidebar
2. Click **Create identity**
3. Select **Email address** (for single email) or **Domain** (for entire domain)
4. Enter your email address (e.g., `noreply@yourdomain.com`)
5. Click **Create identity**
6. Check your email inbox for a verification email from AWS
7. Click the verification link in the email
8. Your email is now verified and can send/receive emails

**Note**: In Sandbox mode, you can only send emails to verified addresses.

### Step 3: Verify Your Domain (Recommended for Production)
1. In **Verified identities**, click **Create identity**
2. Select **Domain**
3. Enter your domain name (e.g., `yourdomain.com`)
4. Choose **Easy DKIM** (recommended) or **BYO DKIM**
5. Click **Create identity**
6. AWS will provide DNS records to add to your domain:
   - **CNAME records** for DKIM verification
   - **TXT record** for domain verification
7. Add these records to your domain's DNS settings
8. Wait for DNS propagation (usually 5-30 minutes)
9. AWS will automatically verify once DNS records are detected

### Step 4: Request Production Access (Move Out of Sandbox)
1. In the SES console, go to **Account dashboard**
2. Click **Request production access**
3. Fill out the form:
   - **Mail Type**: Select "Transactional" or "Marketing"
   - **Website URL**: Your application URL
   - **Use case description**: Describe how you'll use SES
   - **Expected monthly volume**: Estimated number of emails
   - **Compliance**: Confirm you'll follow AWS policies
4. Submit the request
5. Wait for AWS approval (usually 24-48 hours)
6. Once approved, you can send emails to any address

### Step 5: Create IAM User and Access Keys
1. Go to **IAM** (Identity and Access Management) in AWS Console
2. Click **Users** → **Create user**
3. Enter a username (e.g., `ses-email-user`)
4. Click **Next**
5. Under **Set permissions**, select **Attach policies directly**
6. Search for and select **AmazonSESFullAccess** (or create a custom policy with minimal permissions)
7. Click **Next** → **Create user**
8. Click on the created user → **Security credentials** tab
9. Click **Create access key**
10. Select **Application running outside AWS**
11. Click **Next** → **Create access key**
12. **IMPORTANT**: Copy and save both:
    - **Access key ID**
    - **Secret access key** (shown only once)

### Step 6: Configure Sending Statistics and Bounce/Complaint Handling (Optional)
1. Go to **Configuration** → **Sending statistics** to monitor email performance
2. Set up **Configuration sets** for tracking:
   - Go to **Configuration sets** → **Create set**
   - Name your configuration set (e.g., `transactional-emails`)
   - Add event destinations (SNS topics, CloudWatch, etc.)
3. Set up **Suppression list** management for bounces and complaints

---

## Code Implementation

### Step 1: Install AWS SDK

The AWS SDK is already installed in your project. If you need to install it:

```bash
npm install @aws-sdk/client-ses
```

### Step 2: Create SES Service File

Create or update `Backend/services/sesEmailServices.js`:

```javascript
// sesEmailServices.js
import { SESClient, SendEmailCommand, SendRawEmailCommand } from "@aws-sdk/client-ses";

// Initialize SES Client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Send a simple email using AWS SES
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body (optional)
 * @param {string} from - Sender email (optional, uses env default)
 * @param {string[]} cc - CC recipients (optional)
 * @param {string[]} bcc - BCC recipients (optional)
 * @param {string} replyTo - Reply-to address (optional)
 * @returns {Promise<Object>} AWS SES response
 */
export const sendEmail = async (
  to,
  subject,
  text,
  html = null,
  from = null,
  cc = [],
  bcc = [],
  replyTo = null
) => {
  try {
    const params = {
      Source: from || process.env.SES_FROM_EMAIL,
      Destination: {
        ToAddresses: Array.isArray(to) ? to : [to],
        CcAddresses: cc.length > 0 ? cc : undefined,
        BccAddresses: bcc.length > 0 ? bcc : undefined,
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Text: {
            Data: text,
            Charset: "UTF-8",
          },
          ...(html && {
            Html: {
              Data: html,
              Charset: "UTF-8",
            },
          }),
        },
      },
      ...(replyTo && {
        ReplyToAddresses: [replyTo],
      }),
    };

    const response = await sesClient.send(new SendEmailCommand(params));
    console.log("📧 Email sent successfully:", response.MessageId);

    return {
      success: true,
      messageId: response.MessageId,
      response: response,
    };
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send email with attachments using raw email
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body (optional)
 * @param {Array} attachments - Array of attachment objects {filename, content, contentType}
 * @param {string} from - Sender email (optional)
 * @returns {Promise<Object>} AWS SES response
 */
export const sendEmailWithAttachments = async (
  to,
  subject,
  text,
  html = null,
  attachments = [],
  from = null
) => {
  try {
    const nodemailer = await import("nodemailer");
    const { createTransport } = nodemailer.default || nodemailer;

    // Create raw email using nodemailer
    const transporter = createTransport({
      SES: { ses: sesClient, aws: await import("@aws-sdk/client-ses") },
    });

    const mailOptions = {
      from: from || process.env.SES_FROM_EMAIL,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject: subject,
      text: text,
      html: html,
      attachments: attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType || "application/octet-stream",
      })),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("📧 Email with attachments sent:", info.messageId);

    return {
      success: true,
      messageId: info.messageId,
      response: info,
    };
  } catch (error) {
    console.error("❌ Email with attachments failed:", error);
    throw new Error(`Failed to send email with attachments: ${error.message}`);
  }
};

/**
 * Send bulk emails (up to 50 recipients per call)
 * @param {string[]} to - Array of recipient email addresses
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body (optional)
 * @param {string} from - Sender email (optional)
 * @returns {Promise<Object>} Results object
 */
export const sendBulkEmail = async (
  to,
  subject,
  text,
  html = null,
  from = null
) => {
  try {
    if (!Array.isArray(to) || to.length === 0) {
      throw new Error("Recipients array is required");
    }

    if (to.length > 50) {
      throw new Error("Maximum 50 recipients per bulk email");
    }

    const params = {
      Source: from || process.env.SES_FROM_EMAIL,
      Destination: {
        ToAddresses: to,
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Text: {
            Data: text,
            Charset: "UTF-8",
          },
          ...(html && {
            Html: {
              Data: html,
              Charset: "UTF-8",
            },
          }),
        },
      },
    };

    const response = await sesClient.send(new SendEmailCommand(params));
    console.log("📧 Bulk email sent successfully:", response.MessageId);

    return {
      success: true,
      messageId: response.MessageId,
      recipients: to.length,
      response: response,
    };
  } catch (error) {
    console.error("❌ Bulk email sending failed:", error);
    throw new Error(`Failed to send bulk email: ${error.message}`);
  }
};

/**
 * Send templated email (for use with SES templates)
 * @param {string} to - Recipient email address
 * @param {string} templateName - Name of SES template
 * @param {Object} templateData - Template data object
 * @param {string} from - Sender email (optional)
 * @returns {Promise<Object>} AWS SES response
 */
export const sendTemplatedEmail = async (
  to,
  templateName,
  templateData,
  from = null
) => {
  try {
    const { SendTemplatedEmailCommand } = await import("@aws-sdk/client-ses");
    
    const params = {
      Source: from || process.env.SES_FROM_EMAIL,
      Destination: {
        ToAddresses: Array.isArray(to) ? to : [to],
      },
      Template: templateName,
      TemplateData: JSON.stringify(templateData),
    };

    const response = await sesClient.send(new SendTemplatedEmailCommand(params));
    console.log("📧 Templated email sent:", response.MessageId);

    return {
      success: true,
      messageId: response.MessageId,
      response: response,
    };
  } catch (error) {
    console.error("❌ Templated email failed:", error);
    throw new Error(`Failed to send templated email: ${error.message}`);
  }
};

export default {
  sendEmail,
  sendEmailWithAttachments,
  sendBulkEmail,
  sendTemplatedEmail,
};
```

### Step 3: Create Controller/Route Handler

Create or update `Backend/controllers/emailController.js`:

```javascript
// emailController.js
import {
  sendEmail,
  sendEmailWithAttachments,
  sendBulkEmail,
  sendTemplatedEmail,
} from "../services/sesEmailServices.js";

/**
 * Send a simple email
 */
export const sendEmailHandler = async (req, res) => {
  try {
    const { to, subject, text, html, from, cc, bcc, replyTo } = req.body;

    if (!to || !subject || !text) {
      return res.status(400).json({
        error: "To, subject, and text are required fields",
      });
    }

    const result = await sendEmail(to, subject, text, html, from, cc, bcc, replyTo);

    res.json({
      success: true,
      message: "Email sent successfully",
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({
      error: "Failed to send email",
      details: error.message,
    });
  }
};

/**
 * Send email with attachments
 */
export const sendEmailWithAttachmentsHandler = async (req, res) => {
  try {
    const { to, subject, text, html, attachments, from } = req.body;

    if (!to || !subject || !text) {
      return res.status(400).json({
        error: "To, subject, and text are required fields",
      });
    }

    if (!attachments || !Array.isArray(attachments)) {
      return res.status(400).json({
        error: "Attachments must be an array",
      });
    }

    const result = await sendEmailWithAttachments(
      to,
      subject,
      text,
      html,
      attachments,
      from
    );

    res.json({
      success: true,
      message: "Email with attachments sent successfully",
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Error sending email with attachments:", error);
    res.status(500).json({
      error: "Failed to send email with attachments",
      details: error.message,
    });
  }
};

/**
 * Send bulk email
 */
export const sendBulkEmailHandler = async (req, res) => {
  try {
    const { to, subject, text, html, from } = req.body;

    if (!to || !Array.isArray(to) || to.length === 0) {
      return res.status(400).json({
        error: "To must be a non-empty array",
      });
    }

    if (to.length > 50) {
      return res.status(400).json({
        error: "Maximum 50 recipients per request",
      });
    }

    if (!subject || !text) {
      return res.status(400).json({
        error: "Subject and text are required fields",
      });
    }

    const result = await sendBulkEmail(to, subject, text, html, from);

    res.json({
      success: true,
      message: "Bulk email sent successfully",
      messageId: result.messageId,
      recipients: result.recipients,
    });
  } catch (error) {
    console.error("Error sending bulk email:", error);
    res.status(500).json({
      error: "Failed to send bulk email",
      details: error.message,
    });
  }
};

/**
 * Send templated email
 */
export const sendTemplatedEmailHandler = async (req, res) => {
  try {
    const { to, templateName, templateData, from } = req.body;

    if (!to || !templateName || !templateData) {
      return res.status(400).json({
        error: "To, templateName, and templateData are required fields",
      });
    }

    const result = await sendTemplatedEmail(to, templateName, templateData, from);

    res.json({
      success: true,
      message: "Templated email sent successfully",
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Error sending templated email:", error);
    res.status(500).json({
      error: "Failed to send templated email",
      details: error.message,
    });
  }
};
```

### Step 4: Create Routes

Create or update `Backend/routes/emailRouter.js`:

```javascript
// emailRouter.js
import express from "express";
import {
  sendEmailHandler,
  sendEmailWithAttachmentsHandler,
  sendBulkEmailHandler,
  sendTemplatedEmailHandler,
} from "../controllers/emailController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Send simple email
router.post("/send", authenticate, sendEmailHandler);

// Send email with attachments
router.post("/send-with-attachments", authenticate, sendEmailWithAttachmentsHandler);

// Send bulk email
router.post("/send-bulk", authenticate, sendBulkEmailHandler);

// Send templated email
router.post("/send-templated", authenticate, sendTemplatedEmailHandler);

export default router;
```

### Step 5: Register Routes in server.js

Add the email routes to your `Backend/server.js`:

```javascript
import emailRoutes from "./routes/emailRouter.js";

// ... existing code ...

app.use("/api/email", emailRoutes);
```

---

## Environment Variables

Add these variables to your `.env` file:

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here

# SES Configuration
SES_FROM_EMAIL=noreply@yourdomain.com

# Optional: Configuration Set
SES_CONFIGURATION_SET=transactional-emails
```

**Security Note**: Never commit your `.env` file to version control. Add it to `.gitignore`.

---

## Usage Examples

### Example 1: Send Simple Email

```javascript
import { sendEmail } from "../services/sesEmailServices.js";

// Plain text email
await sendEmail(
  "user@example.com",
  "Welcome to Top Tutors Connect",
  "Thank you for joining us!"
);

// HTML email
await sendEmail(
  "user@example.com",
  "Welcome to Top Tutors Connect",
  "Thank you for joining us!",
  "<h1>Welcome!</h1><p>Thank you for joining us!</p>"
);
```

### Example 2: Send Email via API Endpoint

```javascript
// Frontend or API call
const response = await fetch('http://localhost:4000/api/email/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Welcome Email',
    text: 'Welcome to Top Tutors Connect!',
    html: '<h1>Welcome!</h1><p>Welcome to Top Tutors Connect!</p>'
  })
});

const data = await response.json();
console.log(data);
```

### Example 3: Send Email with Attachments

```javascript
const fs = require('fs');

const attachment = {
  filename: 'document.pdf',
  content: fs.readFileSync('./path/to/document.pdf').toString('base64'),
  contentType: 'application/pdf'
};

await sendEmailWithAttachments(
  "user@example.com",
  "Document Attached",
  "Please find the attached document.",
  "<p>Please find the attached document.</p>",
  [attachment]
);
```

### Example 4: Send Bulk Email

```javascript
await sendBulkEmail(
  ["user1@example.com", "user2@example.com", "user3@example.com"],
  "Important Announcement",
  "This is an important announcement for all users.",
  "<h2>Important Announcement</h2><p>This is an important announcement for all users.</p>"
);
```

### Example 5: Integration with Existing Email Service

Update your existing `emailService.js` to use SES:

```javascript
import { sendEmail } from "./sesEmailServices.js";

export const sendWelcomeEmail = async (userEmail, userName) => {
  const subject = "Welcome to Top Tutors Connect";
  const text = `Hi ${userName}, welcome to Top Tutors Connect!`;
  const html = `
    <html>
      <body>
        <h1>Welcome, ${userName}!</h1>
        <p>Thank you for joining Top Tutors Connect.</p>
      </body>
    </html>
  `;

  return await sendEmail(userEmail, subject, text, html);
};
```

---

## Best Practices

### 1. Email Formatting
- Always provide both plain text and HTML versions
- Use responsive HTML templates
- Test emails across different email clients
- Keep subject lines under 50 characters

### 2. Sender Identity
- Use a verified domain for better deliverability
- Set up SPF, DKIM, and DMARC records
- Use a consistent "From" address
- Set up a "Reply-To" address for user responses

### 3. Rate Limits
- SES has sending limits (varies by account)
- Start with 1 email per second in Sandbox
- Production accounts can request limit increases
- Implement queuing for high-volume sends

### 4. Bounce and Complaint Handling
- Monitor bounce and complaint rates
- Remove bounced addresses from your list
- Set up SNS notifications for bounces/complaints
- Keep bounce rate below 5% and complaint rate below 0.1%

### 5. Error Handling
- Always wrap SES calls in try-catch blocks
- Implement retry logic for transient failures
- Log errors for debugging
- Handle specific error types (bounces, complaints, etc.)

### 6. Security
- Store AWS credentials in environment variables
- Use IAM roles with minimal required permissions
- Never expose credentials in client-side code
- Rotate access keys regularly

### 7. Cost Optimization
- Use Sandbox mode for development/testing
- Monitor usage in AWS Cost Explorer
- Set up billing alerts
- Use SES Templates for repeated content

### 8. Monitoring
- Set up CloudWatch alarms for failed sends
- Monitor bounce and complaint rates
- Track delivery rates
- Set up SNS notifications for events

### 9. Testing
- Always test in Sandbox mode first
- Verify email addresses before sending
- Test HTML rendering in different clients
- Test error scenarios

### 10. Compliance
- Include unsubscribe links in marketing emails
- Follow CAN-SPAM Act requirements
- Respect user preferences
- Handle GDPR requirements if applicable

---

## Troubleshooting

### Common Issues

1. **"Email address not verified"**
   - Solution: Verify the email address in AWS SES console (Sandbox mode)

2. **"Account is in Sandbox"**
   - Solution: Request production access in SES console

3. **"Message rejected: Email address is not verified"**
   - Solution: Verify sender email address or request production access

4. **"Access Denied"**
   - Solution: Check IAM user permissions and credentials

5. **"Region mismatch"**
   - Solution: Ensure AWS_REGION matches your SES configuration

6. **High bounce rate**
   - Solution: Verify email addresses, clean your list, check DNS records

7. **Emails going to spam**
   - Solution: Set up SPF, DKIM, DMARC records, use verified domain

---

## Additional Resources

- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)
- [AWS SES Pricing](https://aws.amazon.com/ses/pricing/)
- [SES Best Practices](https://docs.aws.amazon.com/ses/latest/dg/best-practices.html)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-ses/)
- [Email Template Examples](https://github.com/awsdocs/amazon-ses-developer-guide)

---

## Next Steps

1. Set up email templates in SES console
2. Configure bounce and complaint handling
3. Set up CloudWatch alarms
4. Implement email queuing for high volume
5. Set up domain verification and DKIM
6. Create email templates for common use cases (welcome, password reset, etc.)

