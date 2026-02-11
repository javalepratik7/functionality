# ImageKit Implementation Guide - MERN Stack

A comprehensive guide to implementing ImageKit authentication and dashboard APIs in your MERN (MongoDB, Express, React, Node.js) application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [ImageKit Setup](#imagekit-setup)
3. [Backend Setup (Node.js + Express)](#backend-setup)
4. [Authentication Implementation](#authentication-implementation)
5. [Dashboard API Implementation](#dashboard-api-implementation)
6. [Frontend Integration (React)](#frontend-integration)
7. [Security Best Practices](#security-best-practices)
8. [Error Handling](#error-handling)
9. [Testing](#testing)

---

## Prerequisites

### Backend Dependencies

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install imagekit express cors dotenv multer mongoose
npm install -D nodemon typescript @types/express @types/cors @types/multer @types/node

# For authentication (optional but recommended)
npm install jsonwebtoken bcryptjs express-validator
npm install -D @types/jsonwebtoken @types/bcryptjs
```

### Frontend Dependencies

```bash
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install axios react-query imagekit-javascript
npm install -D @types/react
```

### Environment Variables

Create a `.env` file in your backend root:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/your_database

# ImageKit Configuration
IMAGEKIT_PUBLIC_KEY=your_public_key_here
IMAGEKIT_PRIVATE_KEY=your_private_key_here
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id

# JWT Secret (for authentication)
JWT_SECRET=your_jwt_secret_here

# CORS
CLIENT_URL=http://localhost:3000
```

Create a `.env` file in your frontend root:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_IMAGEKIT_PUBLIC_KEY=your_public_key_here
REACT_APP_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id
```

**Important**: Never expose your private key on the client side. Only use it in server-side code.

---

## ImageKit Setup

### 1. Get Your Credentials

1. Sign up at [ImageKit.io](https://imagekit.io)
2. Navigate to **Developer Options** in your dashboard
3. Copy your:
   - Public Key
   - Private Key
   - URL Endpoint

### 2. Project Structure

```
project-root/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   └── imagekit.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   └── imagekitController.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── upload.js
│   │   │   └── errorHandler.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   └── Media.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   └── imagekitRoutes.js
│   │   ├── utils/
│   │   │   └── helpers.js
│   │   └── server.js
│   ├── .env
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── imagekitApi.js
    │   ├── components/
    │   │   ├── Dashboard.jsx
    │   │   ├── FileUpload.jsx
    │   │   └── FileGallery.jsx
    │   ├── hooks/
    │   │   └── useImageKit.js
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   └── App.jsx
    ├── .env
    └── package.json
```


---

## Backend Setup

### 1. Database Configuration (`config/database.js`)

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
```

### 2. ImageKit Configuration (`config/imagekit.js`)

```javascript
const ImageKit = require('imagekit');

// Initialize ImageKit with credentials
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

/**
 * Generate authentication parameters for client-side uploads
 * @returns {Object} Authentication parameters
 */
const getImageKitAuthParams = () => {
  try {
    const authParams = imagekit.getAuthenticationParameters();
    
    return {
      signature: authParams.signature,
      expire: authParams.expire,
      token: authParams.token,
    };
  } catch (error) {
    console.error('Error generating ImageKit auth params:', error);
    throw new Error('Failed to generate authentication parameters');
  }
};

/**
 * Generate signed URL for secure access
 * @param {string} path - File path
 * @param {number} expirationSeconds - Expiration time in seconds
 * @returns {string} Signed URL
 */
const getSignedUrl = (path, expirationSeconds = 3600) => {
  return imagekit.url({
    path,
    signed: true,
    expireSeconds: expirationSeconds,
  });
};

/**
 * Generate optimized URL with transformations
 * @param {string} path - File path
 * @param {Array} transformations - Array of transformation objects
 * @returns {string} Optimized URL
 */
const getOptimizedUrl = (path, transformations = []) => {
  return imagekit.url({
    path,
    transformation: transformations,
  });
};

module.exports = {
  imagekit,
  getImageKitAuthParams,
  getSignedUrl,
  getOptimizedUrl,
};
```

---

## Authentication Implementation

### 1. Media Model (`models/Media.js`)

```javascript
const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    fileId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
    },
    fileType: {
      type: String,
      enum: ['image', 'video', 'document', 'other'],
      default: 'other',
    },
    size: {
      type: Number,
      required: true,
    },
    width: {
      type: Number,
    },
    height: {
      type: Number,
    },
    folder: {
      type: String,
      default: '/',
    },
    tags: [{
      type: String,
    }],
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customMetadata: {
      type: Map,
      of: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
mediaSchema.index({ uploadedBy: 1, createdAt: -1 });
mediaSchema.index({ fileType: 1 });
mediaSchema.index({ tags: 1 });

module.exports = mongoose.model('Media', mediaSchema);
```

### 2. User Model (`models/User.js`)

```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    storageUsed: {
      type: Number,
      default: 0,
    },
    storageLimit: {
      type: Number,
      default: 1073741824, // 1GB in bytes
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
```

### 3. Auth Middleware (`middleware/auth.js`)

```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Admin middleware
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as admin' });
  }
};

module.exports = { protect, admin };
```

### 4. Upload Middleware (`middleware/upload.js`)

```javascript
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|mp4|avi/;
  const extname = allowedTypes.test(file.originalname.toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, documents, and videos are allowed.'));
  }
};

// Create multer upload instance
const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
  fileFilter,
});

module.exports = upload;
```

### 5. Error Handler Middleware (`middleware/errorHandler.js`)

```javascript
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 25MB.' });
    }
    return res.status(400).json({ message: err.message });
  }

  // MongoDB errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  if (err.code === 11000) {
    return res.status(400).json({ message: 'Duplicate field value entered' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    message: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
```

---

## Dashboard API Implementation

### 1. ImageKit Controller (`controllers/imagekitController.js`)

```javascript
const { 
  imagekit, 
  getImageKitAuthParams 
} = require('../config/imagekit');
const Media = require('../models/Media');
const User = require('../models/User');

/**
 * @desc    Get ImageKit authentication parameters
 * @route   GET /api/imagekit/auth
 * @access  Private
 */
const getAuthParams = async (req, res, next) => {
  try {
    const authParams = getImageKitAuthParams();
    
    res.status(200).json(authParams);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload file to ImageKit
 * @route   POST /api/imagekit/upload
 * @access  Private
 */
const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const { folder = '/', tags, useUniqueFileName = true } = req.body;

    // Check storage limit
    const user = await User.findById(req.user._id);
    if (user.storageUsed + req.file.size > user.storageLimit) {
      return res.status(400).json({ message: 'Storage limit exceeded' });
    }

    // Convert buffer to base64
    const base64File = req.file.buffer.toString('base64');

    // Upload to ImageKit
    const uploadResponse = await imagekit.upload({
      file: base64File,
      fileName: req.file.originalname,
      folder: folder,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      useUniqueFileName: useUniqueFileName === 'true',
    });

    // Determine file type
    let fileType = 'other';
    if (uploadResponse.fileType === 'image') {
      fileType = 'image';
    } else if (req.file.mimetype.startsWith('video')) {
      fileType = 'video';
    } else if (req.file.mimetype.includes('pdf') || req.file.mimetype.includes('document')) {
      fileType = 'document';
    }

    // Save to database
    const media = await Media.create({
      fileId: uploadResponse.fileId,
      name: uploadResponse.name,
      filePath: uploadResponse.filePath,
      url: uploadResponse.url,
      thumbnailUrl: uploadResponse.thumbnailUrl,
      fileType,
      size: uploadResponse.size,
      width: uploadResponse.width,
      height: uploadResponse.height,
      folder: uploadResponse.folder,
      tags: uploadResponse.tags,
      uploadedBy: req.user._id,
    });

    // Update user storage
    user.storageUsed += uploadResponse.size;
    await user.save();

    res.status(201).json({
      success: true,
      data: media,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all files
 * @route   GET /api/imagekit/files
 * @access  Private
 */
const getFiles = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      fileType = '',
      folder = '',
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    // Build query
    const query = { uploadedBy: req.user._id };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (fileType) {
      query.fileType = fileType;
    }

    if (folder) {
      query.folder = folder;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get files
    const files = await Media.find(query)
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('-__v');

    // Get total count
    const total = await Media.countDocuments(query);

    res.status(200).json({
      success: true,
      data: files,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get file details
 * @route   GET /api/imagekit/files/:id
 * @access  Private
 */
const getFileDetails = async (req, res, next) => {
  try {
    const media = await Media.findById(req.params.id);

    if (!media) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check ownership
    if (media.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to access this file' });
    }

    // Get details from ImageKit
    const ikDetails = await imagekit.getFileDetails(media.fileId);

    res.status(200).json({
      success: true,
      data: {
        ...media.toObject(),
        imagekitDetails: ikDetails,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update file details
 * @route   PUT /api/imagekit/files/:id
 * @access  Private
 */
const updateFile = async (req, res, next) => {
  try {
    const media = await Media.findById(req.params.id);

    if (!media) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check ownership
    if (media.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this file' });
    }

    const { tags, customCoordinates } = req.body;

    // Update in ImageKit
    const updateData = {};
    if (tags) updateData.tags = tags;
    if (customCoordinates) updateData.customCoordinates = customCoordinates;

    if (Object.keys(updateData).length > 0) {
      await imagekit.updateFileDetails(media.fileId, updateData);
    }

    // Update in database
    if (tags) media.tags = tags;
    await media.save();

    res.status(200).json({
      success: true,
      data: media,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete file
 * @route   DELETE /api/imagekit/files/:id
 * @access  Private
 */
const deleteFile = async (req, res, next) => {
  try {
    const media = await Media.findById(req.params.id);

    if (!media) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check ownership
    if (media.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this file' });
    }

    // Delete from ImageKit
    await imagekit.deleteFile(media.fileId);

    // Update user storage
    const user = await User.findById(req.user._id);
    user.storageUsed -= media.size;
    await user.save();

    // Delete from database
    await media.deleteOne();

    res.status(200).json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk delete files
 * @route   POST /api/imagekit/files/bulk-delete
 * @access  Private
 */
const bulkDeleteFiles = async (req, res, next) => {
  try {
    const { fileIds } = req.body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ message: 'File IDs array is required' });
    }

    // Get all media files
    const mediaFiles = await Media.find({
      _id: { $in: fileIds },
      uploadedBy: req.user._id,
    });

    if (mediaFiles.length === 0) {
      return res.status(404).json({ message: 'No files found' });
    }

    // Delete from ImageKit
    const deletePromises = mediaFiles.map(media =>
      imagekit.deleteFile(media.fileId)
    );
    await Promise.all(deletePromises);

    // Calculate total size
    const totalSize = mediaFiles.reduce((sum, media) => sum + media.size, 0);

    // Update user storage
    const user = await User.findById(req.user._id);
    user.storageUsed -= totalSize;
    await user.save();

    // Delete from database
    await Media.deleteMany({ _id: { $in: fileIds } });

    res.status(200).json({
      success: true,
      message: `${mediaFiles.length} files deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user storage info
 * @route   GET /api/imagekit/storage
 * @access  Private
 */
const getStorageInfo = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit,
        storagePercentage: (user.storageUsed / user.storageLimit) * 100,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuthParams,
  uploadFile,
  getFiles,
  getFileDetails,
  updateFile,
  deleteFile,
  bulkDeleteFiles,
  getStorageInfo,
};
```

### 2. Auth Controller (`controllers/authController.js`)

```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

/**
 * @desc    Register user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.status(200).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
};
```

### 3. Routes Configuration

**ImageKit Routes (`routes/imagekitRoutes.js`)**

```javascript
const express = require('express');
const router = express.Router();
const {
  getAuthParams,
  uploadFile,
  getFiles,
  getFileDetails,
  updateFile,
  deleteFile,
  bulkDeleteFiles,
  getStorageInfo,
} = require('../controllers/imagekitController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Auth endpoint
router.get('/auth', protect, getAuthParams);

// File operations
router.post('/upload', protect, upload.single('file'), uploadFile);
router.get('/files', protect, getFiles);
router.get('/files/:id', protect, getFileDetails);
router.put('/files/:id', protect, updateFile);
router.delete('/files/:id', protect, deleteFile);
router.post('/files/bulk-delete', protect, bulkDeleteFiles);

// Storage info
router.get('/storage', protect, getStorageInfo);

module.exports = router;
```

**Auth Routes (`routes/authRoutes.js`)**

```javascript
const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

module.exports = router;
```

### 4. Server Setup (`server.js`)

```javascript
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/imagekit', require('./routes/imagekitRoutes'));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```


---

## Frontend Integration (React)

### 1. API Client (`api/imagekitApi.js`)

```javascript
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ImageKit API functions
export const imagekitApi = {
  // Get auth params
  getAuthParams: async () => {
    const response = await api.get('/imagekit/auth');
    return response.data;
  },

  // Upload file
  uploadFile: async (file, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options.folder) formData.append('folder', options.folder);
    if (options.tags) formData.append('tags', options.tags);
    if (options.useUniqueFileName !== undefined) {
      formData.append('useUniqueFileName', options.useUniqueFileName);
    }

    const response = await api.post('/imagekit/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get files
  getFiles: async (params = {}) => {
    const response = await api.get('/imagekit/files', { params });
    return response.data;
  },

  // Get file details
  getFileDetails: async (id) => {
    const response = await api.get(`/imagekit/files/${id}`);
    return response.data;
  },

  // Update file
  updateFile: async (id, updates) => {
    const response = await api.put(`/imagekit/files/${id}`, updates);
    return response.data;
  },

  // Delete file
  deleteFile: async (id) => {
    const response = await api.delete(`/imagekit/files/${id}`);
    return response.data;
  },

  // Bulk delete files
  bulkDeleteFiles: async (fileIds) => {
    const response = await api.post('/imagekit/files/bulk-delete', { fileIds });
    return response.data;
  },

  // Get storage info
  getStorageInfo: async () => {
    const response = await api.get('/imagekit/storage');
    return response.data;
  },
};

// Auth API functions
export const authApi = {
  // Register
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  // Login
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  // Get current user
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
  },
};

export default api;
```

### 2. Auth Context (`context/AuthContext.jsx`)

```javascript
import React, { createContext, useState, useEffect, useContext } from 'react';
import { authApi } from '../api/imagekitApi';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const userData = await authApi.getMe();
        setUser(userData);
      } catch (err) {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  };

  const register = async (userData) => {
    try {
      setError(null);
      const data = await authApi.register(userData);
      setUser(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      throw err;
    }
  };

  const login = async (credentials) => {
    try {
      setError(null);
      const data = await authApi.login(credentials);
      setUser(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    }
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

### 3. Custom Hook (`hooks/useImageKit.js`)

```javascript
import { useState, useCallback } from 'react';
import { imagekitApi } from '../api/imagekitApi';

export const useImageKit = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get auth params
  const getAuthParams = useCallback(async () => {
    try {
      setError(null);
      return await imagekitApi.getAuthParams();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to get auth params';
      setError(message);
      throw err;
    }
  }, []);

  // Upload file
  const uploadFile = useCallback(async (file, options = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await imagekitApi.uploadFile(file, options);
      return result.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Upload failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get files
  const getFiles = useCallback(async (params = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await imagekitApi.getFiles(params);
      return result;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch files';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get file details
  const getFileDetails = useCallback(async (id) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await imagekitApi.getFileDetails(id);
      return result.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to get file details';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update file
  const updateFile = useCallback(async (id, updates) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await imagekitApi.updateFile(id, updates);
      return result.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update file';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete file
  const deleteFile = useCallback(async (id) => {
    setIsLoading(true);
    setError(null);

    try {
      await imagekitApi.deleteFile(id);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete file';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Bulk delete
  const bulkDeleteFiles = useCallback(async (fileIds) => {
    setIsLoading(true);
    setError(null);

    try {
      await imagekitApi.bulkDeleteFiles(fileIds);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete files';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get storage info
  const getStorageInfo = useCallback(async () => {
    try {
      const result = await imagekitApi.getStorageInfo();
      return result.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to get storage info';
      setError(message);
      throw err;
    }
  }, []);

  return {
    isLoading,
    error,
    getAuthParams,
    uploadFile,
    getFiles,
    getFileDetails,
    updateFile,
    deleteFile,
    bulkDeleteFiles,
    getStorageInfo,
  };
};
```

### 4. File Upload Component (`components/FileUpload.jsx`)

```javascript
import React, { useState } from 'react';
import { useImageKit } from '../hooks/useImageKit';

const FileUpload = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [folder, setFolder] = useState('/');
  const [tags, setTags] = useState('');
  const { uploadFile, isLoading, error } = useImageKit();

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) return;

    try {
      await uploadFile(selectedFile, {
        folder,
        tags,
        useUniqueFileName: true,
      });

      // Reset form
      setSelectedFile(null);
      setPreview(null);
      setTags('');
      
      // Notify parent
      if (onUploadSuccess) {
        onUploadSuccess();
      }

      alert('File uploaded successfully!');
    } catch (err) {
      console.error('Upload error:', err);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Upload File</h2>

      <form onSubmit={handleUpload}>
        {/* File Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Select File
          </label>
          <input
            type="file"
            onChange={handleFileSelect}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            accept="image/*,video/*,.pdf,.doc,.docx"
          />
        </div>

        {/* Preview */}
        {preview && (
          <div className="mb-4">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-48 object-cover rounded-lg"
            />
          </div>
        )}

        {/* Folder */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Folder
          </label>
          <input
            type="text"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="/"
          />
        </div>

        {/* Tags */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="tag1, tag2, tag3"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!selectedFile || isLoading}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
    </div>
  );
};

export default FileUpload;
```

### 5. File Gallery Component (`components/FileGallery.jsx`)

```javascript
import React, { useState, useEffect } from 'react';
import { useImageKit } from '../hooks/useImageKit';

const FileGallery = () => {
  const [files, setFiles] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [fileType, setFileType] = useState('');
  const { getFiles, deleteFile, isLoading, error } = useImageKit();

  useEffect(() => {
    loadFiles();
  }, [page, search, fileType]);

  const loadFiles = async () => {
    try {
      const result = await getFiles({
        page,
        limit: 12,
        search,
        fileType,
      });
      setFiles(result.data);
      setPagination(result.pagination);
    } catch (err) {
      console.error('Failed to load files:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      await deleteFile(id);
      loadFiles();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6">File Gallery</h2>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Search files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={fileType}
          onChange={(e) => setFileType(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="document">Documents</option>
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Files Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {files.map((file) => (
          <div
            key={file._id}
            className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Image Preview */}
            {file.fileType === 'image' && (
              <img
                src={file.url}
                alt={file.name}
                className="w-full h-48 object-cover"
              />
            )}

            {/* File Info */}
            <div className="p-4">
              <h3 className="font-medium truncate mb-1">{file.name}</h3>
              <p className="text-sm text-gray-500 mb-2">
                {formatFileSize(file.size)}
              </p>
              
              {/* Tags */}
              {file.tags && file.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {file.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 text-center"
                >
                  View
                </a>
                <button
                  onClick={() => handleDelete(file._id)}
                  className="flex-1 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {!isLoading && files.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No files found
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.pages}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default FileGallery;
```

### 6. Dashboard Component (`components/Dashboard.jsx`)

```javascript
import React, { useState, useEffect } from 'react';
import { useImageKit } from '../hooks/useImageKit';
import FileUpload from './FileUpload';
import FileGallery from './FileGallery';

const Dashboard = () => {
  const [storageInfo, setStorageInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('gallery');
  const { getStorageInfo } = useImageKit();

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    try {
      const info = await getStorageInfo();
      setStorageInfo(info);
    } catch (err) {
      console.error('Failed to load storage info:', err);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            ImageKit Dashboard
          </h1>
        </div>
      </header>

      {/* Storage Info */}
      {storageInfo && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Storage Usage</h2>
            <div className="mb-2">
              <div className="flex justify-between text-sm mb-1">
                <span>Used: {formatBytes(storageInfo.storageUsed)}</span>
                <span>Limit: {formatBytes(storageInfo.storageLimit)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${storageInfo.storagePercentage}%` }}
                ></div>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              {storageInfo.storagePercentage.toFixed(2)}% used
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('gallery')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'gallery'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Gallery
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'upload'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Upload
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'gallery' && <FileGallery />}
            {activeTab === 'upload' && (
              <FileUpload
                onUploadSuccess={() => {
                  setActiveTab('gallery');
                  loadStorageInfo();
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
```

### 7. Main App (`App.jsx`)

```javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Register from './components/Register';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
```


---

## Security Best Practices

### 1. Environment Variables

```javascript
// backend/.env.example
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/your_database
IMAGEKIT_PUBLIC_KEY=your_public_key_here
IMAGEKIT_PRIVATE_KEY=your_private_key_here
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id
JWT_SECRET=your_jwt_secret_here
CLIENT_URL=http://localhost:3000
```

**Important:**
- Never commit `.env` to version control
- Add `.env` to `.gitignore`
- Use different keys for development and production
- Rotate keys periodically
- Use strong JWT secrets (32+ characters)

### 2. Input Validation

```javascript
const { body, validationResult } = require('express-validator');

// Validation middleware for upload
const validateUpload = [
  body('folder').optional().matches(/^\/[\w\-\/]*$/),
  body('tags').optional().isString(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

// Use in route
router.post('/upload', protect, validateUpload, upload.single('file'), uploadFile);
```

### 3. Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

// Create rate limiter
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many upload requests, please try again later.',
});

// Apply to routes
router.post('/upload', protect, uploadLimiter, upload.single('file'), uploadFile);
```

### 4. CORS Configuration

```javascript
const cors = require('cors');

const corsOptions = {
  origin: process.env.CLIENT_URL,
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
```

### 5. Helmet for Security Headers

```javascript
const helmet = require('helmet');

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
```

### 6. MongoDB Injection Prevention

```javascript
const mongoSanitize = require('express-mongo-sanitize');

// Sanitize user input
app.use(mongoSanitize());
```

### 7. File Upload Security

```javascript
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Allowed extensions
    const allowedExts = /jpeg|jpg|png|gif|webp|pdf|doc|docx|mp4|avi/;
    
    // Allowed mimetypes
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4',
      'video/x-msvideo',
    ];

    const extname = allowedExts.test(file.originalname.toLowerCase());
    const mimetype = allowedMimes.includes(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});
```

### 8. JWT Best Practices

```javascript
const jwt = require('jsonwebtoken');

// Generate token with expiration
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d', // Token expires in 7 days
    issuer: 'your-app-name',
    audience: 'your-app-users',
  });
};

// Verify token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'your-app-name',
      audience: 'your-app-users',
    });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};
```

---

## Error Handling

### 1. Custom Error Classes

```javascript
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Not authorized') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
};
```

### 2. Async Handler Wrapper

```javascript
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Usage
const getFiles = asyncHandler(async (req, res) => {
  const files = await Media.find({ uploadedBy: req.user._id });
  res.json({ success: true, data: files });
});
```

### 3. Global Error Handler

```javascript
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new NotFoundError(message);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = new ValidationError(message);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(e => e.message).join(', ');
    error = new ValidationError(message);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AuthenticationError('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AuthenticationError('Token expired');
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
```

### 4. Frontend Error Handling

```javascript
// api/imagekitApi.js
import axios from 'axios';

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        error.message || 
                        'An unexpected error occurred';

    // Handle specific error codes
    if (error.response?.status === 401) {
      // Redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    // Show user-friendly messages
    console.error('API Error:', errorMessage);
    
    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
);
```

---

## Testing

### 1. Backend Unit Tests (Jest)

```bash
npm install -D jest supertest @types/jest
```

```javascript
// __tests__/imagekit.test.js
const request = require('supertest');
const app = require('../src/server');
const User = require('../src/models/User');
const Media = require('../src/models/Media');

describe('ImageKit API', () => {
  let token;
  let userId;

  beforeAll(async () => {
    // Create test user
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    });
    userId = user._id;

    // Login to get token
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    token = res.body.token;
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({});
    await Media.deleteMany({});
  });

  describe('GET /api/imagekit/auth', () => {
    it('should return auth params', async () => {
      const res = await request(app)
        .get('/api/imagekit/auth')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('signature');
      expect(res.body).toHaveProperty('expire');
      expect(res.body).toHaveProperty('token');
    });

    it('should fail without token', async () => {
      const res = await request(app).get('/api/imagekit/auth');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/imagekit/files', () => {
    it('should return files list', async () => {
      const res = await request(app)
        .get('/api/imagekit/files')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
```

### 2. Frontend Component Tests (React Testing Library)

```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

```javascript
// __tests__/FileUpload.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FileUpload from '../components/FileUpload';
import { useImageKit } from '../hooks/useImageKit';

jest.mock('../hooks/useImageKit');

describe('FileUpload Component', () => {
  it('should render upload form', () => {
    useImageKit.mockReturnValue({
      uploadFile: jest.fn(),
      isLoading: false,
      error: null,
    });

    render(<FileUpload />);

    expect(screen.getByText('Upload File')).toBeInTheDocument();
    expect(screen.getByLabelText('Select File')).toBeInTheDocument();
  });

  it('should handle file selection', () => {
    useImageKit.mockReturnValue({
      uploadFile: jest.fn(),
      isLoading: false,
      error: null,
    });

    render(<FileUpload />);

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByLabelText('Select File');

    fireEvent.change(input, { target: { files: [file] } });

    expect(input.files[0]).toBe(file);
  });

  it('should call uploadFile on submit', async () => {
    const mockUpload = jest.fn().mockResolvedValue({});

    useImageKit.mockReturnValue({
      uploadFile: mockUpload,
      isLoading: false,
      error: null,
    });

    render(<FileUpload />);

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByLabelText('Select File');
    const button = screen.getByText('Upload');

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith(
        file,
        expect.objectContaining({ folder: '/' })
      );
    });
  });
});
```

### 3. Integration Tests

```javascript
// __tests__/integration/upload.test.js
const request = require('supertest');
const path = require('path');
const app = require('../../src/server');

describe('File Upload Integration', () => {
  let token;

  beforeAll(async () => {
    // Get auth token
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });
    token = res.body.token;
  });

  it('should upload a file successfully', async () => {
    const testFile = path.join(__dirname, '../fixtures/test-image.jpg');

    const res = await request(app)
      .post('/api/imagekit/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', testFile)
      .field('folder', '/test')
      .field('tags', 'test,integration');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('fileId');
    expect(res.body.data).toHaveProperty('url');
  });
});
```

---

## Additional Features

### 1. Image Transformations

```javascript
const { getOptimizedUrl } = require('../config/imagekit');

// Resize image
const resizedUrl = getOptimizedUrl('/path/to/image.jpg', [
  { width: '400', height: '300' }
]);

// Apply multiple transformations
const transformedUrl = getOptimizedUrl('/path/to/image.jpg', [
  { width: '400', height: '300', crop: 'at_max' },
  { quality: '80' },
  { format: 'webp' },
  { blur: '10' },
]);

// Responsive images
const responsiveUrl = getOptimizedUrl('/path/to/image.jpg', [
  { width: '800', height: '600', dpr: '2' }
]);
```

### 2. Folder Management API

```javascript
/**
 * @desc    Create folder
 * @route   POST /api/imagekit/folders
 * @access  Private
 */
const createFolder = async (req, res, next) => {
  try {
    const { folderName, parentFolderPath = '/' } = req.body;

    await imagekit.createFolder({
      folderName,
      parentFolderPath,
    });

    res.status(201).json({
      success: true,
      message: 'Folder created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete folder
 * @route   DELETE /api/imagekit/folders
 * @access  Private
 */
const deleteFolder = async (req, res, next) => {
  try {
    const { folderPath } = req.body;

    await imagekit.deleteFolder(folderPath);

    res.status(200).json({
      success: true,
      message: 'Folder deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
```

### 3. Metadata Management

```javascript
/**
 * @desc    Add custom metadata to file
 * @route   PATCH /api/imagekit/files/:id/metadata
 * @access  Private
 */
const updateMetadata = async (req, res, next) => {
  try {
    const media = await Media.findById(req.params.id);

    if (!media) {
      throw new NotFoundError('File not found');
    }

    const { metadata } = req.body;

    // Update in ImageKit
    await imagekit.updateFileDetails(media.fileId, {
      customMetadata: metadata,
    });

    // Update in database
    media.customMetadata = new Map(Object.entries(metadata));
    await media.save();

    res.status(200).json({
      success: true,
      data: media,
    });
  } catch (error) {
    next(error);
  }
};
```

### 4. Search and Filter API

```javascript
/**
 * @desc    Advanced search for files
 * @route   POST /api/imagekit/search
 * @access  Private
 */
const searchFiles = async (req, res, next) => {
  try {
    const {
      query,
      fileType,
      tags,
      dateFrom,
      dateTo,
      sizeMin,
      sizeMax,
    } = req.body;

    // Build MongoDB query
    const searchQuery = { uploadedBy: req.user._id };

    if (query) {
      searchQuery.name = { $regex: query, $options: 'i' };
    }

    if (fileType) {
      searchQuery.fileType = fileType;
    }

    if (tags && tags.length > 0) {
      searchQuery.tags = { $in: tags };
    }

    if (dateFrom || dateTo) {
      searchQuery.createdAt = {};
      if (dateFrom) searchQuery.createdAt.$gte = new Date(dateFrom);
      if (dateTo) searchQuery.createdAt.$lte = new Date(dateTo);
    }

    if (sizeMin || sizeMax) {
      searchQuery.size = {};
      if (sizeMin) searchQuery.size.$gte = sizeMin;
      if (sizeMax) searchQuery.size.$lte = sizeMax;
    }

    const files = await Media.find(searchQuery)
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: files.length,
      data: files,
    });
  } catch (error) {
    next(error);
  }
};
```

---

## Deployment

### 1. Backend Deployment (Heroku/Railway)

```bash
# Add Procfile
echo "web: node src/server.js" > Procfile

# Deploy to Heroku
heroku create your-app-name
git push heroku main

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGO_URI=your_production_mongo_uri
heroku config:set IMAGEKIT_PRIVATE_KEY=your_private_key
```

### 2. Frontend Deployment (Vercel/Netlify)

```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod

# Or deploy to Netlify
netlify deploy --prod
```

### 3. Environment Variables in Production

```env
# Production .env
NODE_ENV=production
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
IMAGEKIT_PUBLIC_KEY=public_xxx
IMAGEKIT_PRIVATE_KEY=private_xxx
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
JWT_SECRET=your_super_secure_secret_key_here
CLIENT_URL=https://your-frontend-domain.com
```

---

## Troubleshooting

### Common Issues

1. **CORS Errors**
   ```javascript
   // Ensure CORS is properly configured
   app.use(cors({
     origin: process.env.CLIENT_URL,
     credentials: true,
   }));
   ```

2. **File Upload Fails**
   - Check file size limits (ImageKit free tier: 25MB)
   - Verify file format is supported
   - Ensure proper base64 encoding
   - Check storage quota

3. **Authentication Failed**
   - Verify JWT secret is set correctly
   - Check token expiration
   - Ensure Bearer token format is correct

4. **MongoDB Connection Issues**
   - Verify MONGO_URI is correct
   - Check network connectivity
   - Ensure IP whitelist in MongoDB Atlas

5. **ImageKit API Errors**
   - Verify API keys are correct
   - Check rate limits
   - Ensure file paths are valid

---

## Resources

- [ImageKit Documentation](https://docs.imagekit.io/)
- [ImageKit Node.js SDK](https://github.com/imagekit-developer/imagekit-nodejs)
- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [React Documentation](https://react.dev/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

- [youtube] (https://www.youtube.com/watch?v=Xq9ZN1kUkMA)

---

## License

This guide is provided as-is for educational purposes.