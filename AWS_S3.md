# 🪣 AWS S3 Integration Guide

---

## 1. Create S3 Bucket

1. AWS Console → **S3** → **Create bucket**
2. Configure:
   - **Bucket name**: `your-app-name-prod` *(globally unique, lowercase, no spaces)*
   - **Region**: closest to your server (e.g., `us-east-1`)
   - **Block Public Access**: ✅ Keep all enabled *(we'll use signed URLs)*
   - **Default encryption**: ✅ Enable → SSE-S3
3. Click **Create bucket**

> Create separate buckets if needed (e.g., `your-app-documents-prod`, `your-app-recordings-prod`)

---

## 2. Create IAM User

1. AWS Console → **IAM** → **Users** → **Create user**
2. **User name**: `your-app-s3-user`
3. Skip console access — click **Next**
4. Skip permissions for now → **Create user**

---

## 3. Create & Attach IAM Policy

### 3.1 Create Policy

IAM → **Policies** → **Create policy** → **JSON tab** → paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3Operations",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name/*"
      ]
    },
    {
      "Sid": "AllowListAndLocation",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name"
    }
  ]
}
```

> Replace `your-bucket-name` with your actual bucket name. For multiple buckets, duplicate the statements with each bucket ARN.

- **Policy name**: `YourAppS3Policy`
- Click **Create policy**

### 3.2 Attach Policy to User

IAM → **Users** → click your user → **Add permissions** → **Attach policies directly** → search `YourAppS3Policy` → attach

---

## 4. Get Access Keys

1. IAM → **Users** → click your user → **Security credentials** tab
2. **Create access key** → use case: **Application running outside AWS**
3. Copy and save both values immediately:

```
Access Key ID:     AKIAIOSFODNN7EXAMPLE
Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

> ⚠️ Secret key is shown only once. Save it in a password manager or `.env` immediately.

---

## 5. Configure CORS (If Frontend Uploads Directly)

S3 bucket → **Permissions** tab → **CORS** → Edit → paste:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://your-domain.com", "http://localhost:5173"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

To give Permission to all
```
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Sid": "PublicReadGetObject",
			"Effect": "Allow",
			"Principal": "*",
			"Action": "s3:GetObject",
			"Resource": "arn:aws:s3:::<BUCKET NAME>/*"
		}
	]
}
```

> Skip this if your backend handles all uploads.

---

## 6. Environment Variables

Add to your `.env` file:

```env
# AWS S3
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Storage mode: 's3' for production, 'local' for development
MEDIA_STORAGE=s3

# Max file size in bytes (default: 20MB)
MAX_FILE_SIZE=20971520

# Signed URL expiry in seconds (max 7 days = 604800)
MEDIA_SIGNED_URL_EXPIRY=604800
```

Make sure `.env` is in `.gitignore`:

```gitignore
.env
.env.*
```

---

## 7. Install Dependencies

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

## 8. Code Implementation

### 8.1 S3 Service — `services/s3Service.js`

```javascript
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';

const region = process.env.AWS_REGION || 'us-east-1';
const bucketName = process.env.AWS_S3_BUCKET;

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Upload file to S3
export async function uploadFile(fileBuffer, key, contentType, metadata = {}) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
    Metadata: { uploadedAt: new Date().toISOString(), ...metadata },
  });

  await s3Client.send(command);

  return {
    key,
    location: `https://${bucketName}.s3.${region}.amazonaws.com/${key}`,
  };
}

// Generate signed URL (max 7 days)
export async function getSignedUrlForKey(key, expiresIn = 3600) {
  const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
  return await getSignedUrl(s3Client, command, {
    expiresIn: Math.min(expiresIn, 604800),
  });
}

// Delete file from S3
export async function deleteFile(key) {
  const command = new DeleteObjectCommand({ Bucket: bucketName, Key: key });
  await s3Client.send(command);
  return true;
}

// Check if file exists
export async function fileExists(key) {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
    return true;
  } catch (error) {
    if (error.$metadata?.httpStatusCode === 404) return false;
    throw error;
  }
}

// Generate unique filename
export function generateUniqueFileName(originalName) {
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  const random = crypto.randomBytes(6).toString('hex');
  return `${name}-${Date.now()}-${random}${ext}`;
}

export { bucketName };
```

### 8.2 File Upload Utility — `utils/fileUpload.js`

```javascript
import multer from 'multer';
import { uploadFile, generateUniqueFileName, getSignedUrlForKey } from '../services/s3Service.js';

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 20 * 1024 * 1024;

const ALLOWED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'application/pdf', 'video/mp4',
];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  },
});

export async function uploadToS3(file, folder = 'uploads') {
  const fileName = generateUniqueFileName(file.originalname);
  const key = `${folder}/${fileName}`;

  const { location } = await uploadFile(file.buffer, key, file.mimetype, {
    originalName: file.originalname,
  });

  const signedUrl = await getSignedUrlForKey(key, 604800);

  return { key, url: location, signedUrl, size: file.size };
}
```

### 8.3 File Routes — `routes/fileRoutes.js`

```javascript
import express from 'express';
import { upload, uploadToS3 } from '../utils/fileUpload.js';
import { getSignedUrlForKey, deleteFile } from '../services/s3Service.js';

const router = express.Router();

// Upload file
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const folder = req.body.folder || 'uploads';
    const result = await uploadToS3(req.file, folder);

    res.status(201).json({ success: true, file: result });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed', message: error.message });
  }
});

// Get fresh signed URL
router.get('/:key/url', async (req, res) => {
  try {
    const signedUrl = await getSignedUrlForKey(
      req.params.key,
      parseInt(req.query.expiresIn) || 3600
    );
    res.json({ success: true, signedUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate URL', message: error.message });
  }
});

// Delete file
router.delete('/:key', async (req, res) => {
  try {
    await deleteFile(req.params.key);
    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Delete failed', message: error.message });
  }
});

export default router;
```

### 8.4 Register in `server.js`

```javascript
import fileRoutes from './routes/fileRoutes.js';

app.use('/api/files', fileRoutes);
```

---

## 9. Database Schema (PostgreSQL)

```sql
ALTER TABLE files
  ADD COLUMN IF NOT EXISTS s3_key TEXT,
  ADD COLUMN IF NOT EXISTS s3_url TEXT,
  ADD COLUMN IF NOT EXISTS signed_url TEXT;

CREATE INDEX IF NOT EXISTS idx_files_s3_key ON files(s3_key) WHERE s3_key IS NOT NULL;
```

---

## 10. Lifecycle Policy (Optional — Auto Cleanup)

S3 bucket → **Management** → **Create lifecycle rule**

- **Rule name**: `DeleteOldFiles`
- **Scope**: prefix `recordings/` (or all objects)
- **Action**: Delete expired objects after X days (e.g., 90)

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `AccessDenied` | Wrong IAM policy or credentials | Check policy ARN, re-verify `.env` values |
| `NoSuchBucket` | Wrong bucket name or region | Check `AWS_S3_BUCKET` and `AWS_REGION` in `.env` |
| `InvalidAccessKeyId` | Wrong access key | Re-copy key from IAM, check for spaces |
| `SignatureDoesNotMatch` | Wrong secret key or system clock | Re-copy secret key, sync server clock via NTP |
| Signed URL not working | Expired or wrong key path | Regenerate URL, check `key` value matches exactly |

---

## Security Checklist

- [ ] Block Public Access enabled on bucket
- [ ] IAM user has only required permissions (no `s3:*`)
- [ ] Access keys stored only in `.env`, not in code
- [ ] `.env` added to `.gitignore`
- [ ] Separate credentials for dev and production
- [ ] Rotate access keys every 90 days
- [ ] Server-side encryption enabled on bucket
