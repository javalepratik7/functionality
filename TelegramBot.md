# Telegram Bot Implementation Guide
## Auto-Send Posts to Telegram Channel

This guide provides step-by-step instructions to implement automatic posting functionality to a Telegram channel using a Telegram bot.

---

## Table of Contents
1. [Create a Telegram Bot](#1-create-a-telegram-bot)
2. [Add Bot to Channel](#2-add-bot-to-channel)
3. [Get Bot Token and Channel ID](#3-get-bot-token-and-channel-id)
4. [Install Required Dependencies](#4-install-required-dependencies)
5. [Configure Environment Variables](#5-configure-environment-variables)
6. [Implement Bot Service](#6-implement-bot-service)
7. [Create API Endpoint](#7-create-api-endpoint)
8. [Usage Examples](#8-usage-examples)
9. [Testing](#9-testing)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Create a Telegram Bot

### Step 1.1: Open Telegram and Find BotFather
1. Open Telegram app (mobile or desktop)
2. Search for **@BotFather** in the search bar
3. Start a conversation with BotFather

### Step 1.2: Create New Bot
1. Send the command: `/newbot`
2. BotFather will ask for a **name** for your bot (e.g., "Top Tutors Connect Bot")
3. Then it will ask for a **username** (must end with 'bot', e.g., "toptutorsconnect_bot")
4. BotFather will respond with a **Bot Token** - **SAVE THIS TOKEN SECURELY**

Example response:
```
Done! Congratulations on your new bot. You will find it at t.me/toptutorsconnect_bot. 
Use this token to access the HTTP API:
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz-1234567890
```

### Step 1.3: Configure Bot Settings (Optional)
- Set bot description: `/setdescription` - Add a description of what your bot does
- Set bot commands: `/setcommands` - Define available commands
- Set bot photo: `/setuserpic` - Add a profile picture

---

## 2. Add Bot to Channel

### Step 2.1: Create or Select Your Channel
1. Open Telegram
2. Create a new channel or select an existing one
3. Go to channel settings (click on channel name at the top)

### Step 2.2: Add Bot as Administrator
1. In channel settings, go to **Administrators**
2. Click **Add Administrator**
3. Search for your bot by username (e.g., `@toptutorsconnect_bot`)
4. Select your bot
5. **IMPORTANT**: Grant the bot the following permissions:
   - ✅ **Post Messages** (required)
   - ✅ **Edit Messages** (optional, for updating posts)
   - ✅ **Delete Messages** (optional)
   - ❌ Other permissions are not needed for posting

### Step 2.3: Verify Bot Access
1. The bot should now appear in the channel administrators list
2. Make sure the bot has posting permissions enabled

---

## 3. Get Bot Token and Channel ID

### Step 3.1: Bot Token
- You already have this from Step 1.2
- Format: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz-1234567890`
- Keep this secure and never commit it to version control

### Step 3.2: Get Channel ID
There are multiple ways to get your channel ID:

#### Method 1: Using a Helper Bot
1. Add **@userinfobot** to your channel
2. The bot will send the channel ID in the format: `-1001234567890`
3. Remove the bot after getting the ID

#### Method 2: Using Telegram Web
1. Open your channel in Telegram Web: https://web.telegram.org
2. Look at the URL - it may contain the channel ID
3. Or use browser developer tools to inspect network requests

#### Method 3: Using Your Bot (Programmatic)
1. Send a message to your channel
2. Use Telegram Bot API to get updates
3. Extract chat ID from the response

#### Method 4: Using @getidsbot
1. Forward any message from your channel to **@getidsbot**
2. The bot will reply with the channel ID

**Note**: Channel IDs are usually negative numbers (e.g., `-1001234567890`)

---

## 4. Install Required Dependencies

Navigate to your Backend directory and install the Telegram Bot API library:

```bash
cd Backend
npm install node-telegram-bot-api
```

Or if you prefer using the official Telegram Bot API via HTTP requests:

```bash
npm install axios
```

---

## 5. Configure Environment Variables

Add the following variables to your `Backend/.env` file:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz-1234567890
TELEGRAM_CHANNEL_ID=-1001234567890
```

**Security Note**: 
- Never commit `.env` files to version control
- Add `.env` to `.gitignore`
- Use environment variables in production

---

## 6. Implement Bot Service

Create a new service file: `Backend/services/telegramBotService.js`

### Option A: Using node-telegram-bot-api (Recommended)

```javascript
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

class TelegramBotService {
  constructor() {
    this.bot = null;
    this.channelId = process.env.TELEGRAM_CHANNEL_ID;
    this.isConfigured = false;
  }

  async init() {
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      
      if (!token || !this.channelId) {
        console.warn('Telegram bot not configured - missing token or channel ID');
        return;
      }

      this.bot = new TelegramBot(token, { polling: false });
      this.isConfigured = true;
      
      // Verify bot token
      const botInfo = await this.bot.getMe();
      console.log(`Telegram bot initialized: @${botInfo.username}`);
      
    } catch (error) {
      console.error('Error initializing Telegram bot:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Send a text message to the channel
   * @param {string} message - Text message to send
   * @param {Object} options - Additional options (parse_mode, etc.)
   * @returns {Promise<Object>}
   */
  async sendMessage(message, options = {}) {
    try {
      if (!this.isConfigured || !this.bot) {
        throw new Error('Telegram bot not configured');
      }

      const result = await this.bot.sendMessage(this.channelId, message, {
        parse_mode: 'HTML',
        ...options
      });

      return { success: true, messageId: result.message_id };
    } catch (error) {
      console.error('Error sending Telegram message:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a single image with optional caption
   * @param {string|Buffer} image - Image URL, file path, or Buffer
   * @param {string} caption - Optional caption text
   * @param {Object} options - Additional options (buttons, parse_mode, etc.)
   * @returns {Promise<Object>}
   */
  async sendPhoto(image, caption = '', options = {}) {
    try {
      if (!this.isConfigured || !this.bot) {
        throw new Error('Telegram bot not configured');
      }

      const result = await this.bot.sendPhoto(this.channelId, image, {
        caption: caption,
        parse_mode: 'HTML',
        ...options
      });

      return { success: true, messageId: result.message_id };
    } catch (error) {
      console.error('Error sending Telegram photo:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send multiple images as an album
   * @param {Array<string|Buffer>} images - Array of image URLs, file paths, or Buffers
   * @param {string} caption - Optional caption for the album
   * @param {Object} options - Additional options
   * @returns {Promise<Object>}
   */
  async sendPhotoAlbum(images, caption = '', options = {}) {
    try {
      if (!this.isConfigured || !this.bot) {
        throw new Error('Telegram bot not configured');
      }

      if (!Array.isArray(images) || images.length === 0) {
        throw new Error('Images array is required and cannot be empty');
      }

      // Prepare media array for album
      const media = images.map((image, index) => ({
        type: 'photo',
        media: image,
        caption: index === 0 ? caption : undefined, // Only first image gets caption
        parse_mode: 'HTML'
      }));

      const result = await this.bot.sendMediaGroup(this.channelId, media, options);

      return { 
        success: true, 
        messageIds: result.map(msg => msg.message_id) 
      };
    } catch (error) {
      console.error('Error sending Telegram photo album:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send message with inline keyboard buttons
   * @param {string} message - Text message
   * @param {Array<Array<Object>>} buttons - Button layout (array of button rows)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>}
   */
  async sendMessageWithButtons(message, buttons, options = {}) {
    try {
      if (!this.isConfigured || !this.bot) {
        throw new Error('Telegram bot not configured');
      }

      const keyboard = {
        inline_keyboard: buttons.map(row => 
          row.map(button => ({
            text: button.text,
            url: button.url,
            callback_data: button.callback_data,
            web_app: button.web_app
          }))
        )
      };

      const result = await this.bot.sendMessage(this.channelId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
        ...options
      });

      return { success: true, messageId: result.message_id };
    } catch (error) {
      console.error('Error sending Telegram message with buttons:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send photo with inline keyboard buttons
   * @param {string|Buffer} image - Image URL, file path, or Buffer
   * @param {string} caption - Caption text
   * @param {Array<Array<Object>>} buttons - Button layout
   * @param {Object} options - Additional options
   * @returns {Promise<Object>}
   */
  async sendPhotoWithButtons(image, caption, buttons, options = {}) {
    try {
      if (!this.isConfigured || !this.bot) {
        throw new Error('Telegram bot not configured');
      }

      const keyboard = {
        inline_keyboard: buttons.map(row => 
          row.map(button => ({
            text: button.text,
            url: button.url,
            callback_data: button.callback_data,
            web_app: button.web_app
          }))
        )
      };

      const result = await this.bot.sendPhoto(this.channelId, image, {
        caption: caption,
        parse_mode: 'HTML',
        reply_markup: keyboard,
        ...options
      });

      return { success: true, messageId: result.message_id };
    } catch (error) {
      console.error('Error sending Telegram photo with buttons:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send multiple photos with buttons (album with buttons on first image)
   * @param {Array<string|Buffer>} images - Array of images
   * @param {string} caption - Caption for the album
   * @param {Array<Array<Object>>} buttons - Button layout
   * @param {Object} options - Additional options
   * @returns {Promise<Object>}
   */
  async sendPhotoAlbumWithButtons(images, caption, buttons, options = {}) {
    try {
      if (!this.isConfigured || !this.bot) {
        throw new Error('Telegram bot not configured');
      }

      if (!Array.isArray(images) || images.length === 0) {
        throw new Error('Images array is required and cannot be empty');
      }

      // For albums with buttons, we need to send the first photo with buttons
      // and then send the rest as a media group
      const keyboard = {
        inline_keyboard: buttons.map(row => 
          row.map(button => ({
            text: button.text,
            url: button.url,
            callback_data: button.callback_data,
            web_app: button.web_app
          }))
        )
      };

      // Send first image with buttons and caption
      const firstResult = await this.bot.sendPhoto(this.channelId, images[0], {
        caption: caption,
        parse_mode: 'HTML',
        reply_markup: keyboard,
        ...options
      });

      // If there are more images, send them as an album
      if (images.length > 1) {
        const remainingImages = images.slice(1);
        const media = remainingImages.map(image => ({
          type: 'photo',
          media: image
        }));

        await this.bot.sendMediaGroup(this.channelId, media);
      }

      return { 
        success: true, 
        messageId: firstResult.message_id 
      };
    } catch (error) {
      console.error('Error sending Telegram photo album with buttons:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a message from the channel
   * @param {number} messageId - ID of the message to delete
   * @returns {Promise<Object>}
   */
  async deleteMessage(messageId) {
    try {
      if (!this.isConfigured || !this.bot) {
        throw new Error('Telegram bot not configured');
      }

      await this.bot.deleteMessage(this.channelId, messageId);
      return { success: true };
    } catch (error) {
      console.error('Error deleting Telegram message:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Edit a message in the channel
   * @param {number} messageId - ID of the message to edit
   * @param {string} newText - New text content
   * @param {Object} options - Additional options
   * @returns {Promise<Object>}
   */
  async editMessage(messageId, newText, options = {}) {
    try {
      if (!this.isConfigured || !this.bot) {
        throw new Error('Telegram bot not configured');
      }

      await this.bot.editMessageText(newText, {
        chat_id: this.channelId,
        message_id: messageId,
        parse_mode: 'HTML',
        ...options
      });

      return { success: true };
    } catch (error) {
      console.error('Error editing Telegram message:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const telegramBotService = new TelegramBotService();
```

### Option B: Using Axios (HTTP API Direct)

```javascript
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class TelegramBotService {
  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN;
    this.channelId = process.env.TELEGRAM_CHANNEL_ID;
    this.apiUrl = `https://api.telegram.org/bot${this.token}`;
    this.isConfigured = false;
  }

  async init() {
    try {
      if (!this.token || !this.channelId) {
        console.warn('Telegram bot not configured - missing token or channel ID');
        return;
      }

      // Verify bot token
      const response = await axios.get(`${this.apiUrl}/getMe`);
      if (response.data.ok) {
        this.isConfigured = true;
        console.log(`Telegram bot initialized: @${response.data.result.username}`);
      }
    } catch (error) {
      console.error('Error initializing Telegram bot:', error.message);
      this.isConfigured = false;
    }
  }

  async sendMessage(message, options = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('Telegram bot not configured');
      }

      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: this.channelId,
        text: message,
        parse_mode: 'HTML',
        ...options
      });

      return { success: true, messageId: response.data.result.message_id };
    } catch (error) {
      console.error('Error sending Telegram message:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.description || error.message };
    }
  }

  async sendPhoto(image, caption = '', options = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('Telegram bot not configured');
      }

      // If image is a URL, use sendPhoto with URL
      // If image is a file path or Buffer, use FormData
      const formData = new FormData();
      formData.append('chat_id', this.channelId);
      formData.append('caption', caption);
      
      if (typeof image === 'string' && image.startsWith('http')) {
        // URL
        const response = await axios.post(`${this.apiUrl}/sendPhoto`, {
          chat_id: this.channelId,
          photo: image,
          caption: caption,
          parse_mode: 'HTML',
          ...options
        });
        return { success: true, messageId: response.data.result.message_id };
      } else {
        // File or Buffer - use FormData
        formData.append('photo', image);
        const response = await axios.post(`${this.apiUrl}/sendPhoto`, formData, {
          headers: formData.getHeaders()
        });
        return { success: true, messageId: response.data.result.message_id };
      }
    } catch (error) {
      console.error('Error sending Telegram photo:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.description || error.message };
    }
  }

  async sendMessageWithButtons(message, buttons, options = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('Telegram bot not configured');
      }

      const keyboard = {
        inline_keyboard: buttons.map(row => 
          row.map(button => ({
            text: button.text,
            url: button.url,
            callback_data: button.callback_data,
            web_app: button.web_app
          }))
        )
      };

      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: this.channelId,
        text: message,
        parse_mode: 'HTML',
        reply_markup: keyboard,
        ...options
      });

      return { success: true, messageId: response.data.result.message_id };
    } catch (error) {
      console.error('Error sending Telegram message with buttons:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.description || error.message };
    }
  }

  async sendPhotoWithButtons(image, caption, buttons, options = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('Telegram bot not configured');
      }

      const keyboard = {
        inline_keyboard: buttons.map(row => 
          row.map(button => ({
            text: button.text,
            url: button.url,
            callback_data: button.callback_data,
            web_app: button.web_app
          }))
        )
      };

      if (typeof image === 'string' && image.startsWith('http')) {
        const response = await axios.post(`${this.apiUrl}/sendPhoto`, {
          chat_id: this.channelId,
          photo: image,
          caption: caption,
          parse_mode: 'HTML',
          reply_markup: keyboard,
          ...options
        });
        return { success: true, messageId: response.data.result.message_id };
      } else {
        // Handle file upload with FormData
        const formData = new FormData();
        formData.append('chat_id', this.channelId);
        formData.append('photo', image);
        formData.append('caption', caption);
        formData.append('reply_markup', JSON.stringify(keyboard));
        
        const response = await axios.post(`${this.apiUrl}/sendPhoto`, formData, {
          headers: formData.getHeaders()
        });
        return { success: true, messageId: response.data.result.message_id };
      }
    } catch (error) {
      console.error('Error sending Telegram photo with buttons:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.description || error.message };
    }
  }
}

export const telegramBotService = new TelegramBotService();
```

---

## 7. Create API Endpoint

Create a controller: `Backend/controllers/telegramBotController.js`

```javascript
import { telegramBotService } from '../services/telegramBotService.js';

/**
 * Send a text message to Telegram channel
 */
export const sendMessage = async (req, res) => {
  try {
    const { message, parse_mode } = req.body;

    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message is required' 
      });
    }

    const result = await telegramBotService.sendMessage(message, { parse_mode });

    if (result.success) {
      return res.status(200).json({
        success: true,
        messageId: result.messageId,
        message: 'Message sent successfully'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in sendMessage controller:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Send a single photo to Telegram channel
 */
export const sendPhoto = async (req, res) => {
  try {
    const { imageUrl, caption, buttons } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'Image URL is required' 
      });
    }

    let result;
    if (buttons && buttons.length > 0) {
      result = await telegramBotService.sendPhotoWithButtons(
        imageUrl, 
        caption || '', 
        buttons
      );
    } else {
      result = await telegramBotService.sendPhoto(imageUrl, caption || '');
    }

    if (result.success) {
      return res.status(200).json({
        success: true,
        messageId: result.messageId,
        message: 'Photo sent successfully'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in sendPhoto controller:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Send multiple photos to Telegram channel
 */
export const sendPhotoAlbum = async (req, res) => {
  try {
    const { images, caption, buttons } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Images array is required and cannot be empty' 
      });
    }

    let result;
    if (buttons && buttons.length > 0) {
      result = await telegramBotService.sendPhotoAlbumWithButtons(
        images, 
        caption || '', 
        buttons
      );
    } else {
      result = await telegramBotService.sendPhotoAlbum(images, caption || '');
    }

    if (result.success) {
      return res.status(200).json({
        success: true,
        messageId: result.messageId || result.messageIds,
        message: 'Photo album sent successfully'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in sendPhotoAlbum controller:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Send a message with buttons
 */
export const sendMessageWithButtons = async (req, res) => {
  try {
    const { message, buttons } = req.body;

    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message is required' 
      });
    }

    if (!buttons || !Array.isArray(buttons) || buttons.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Buttons array is required' 
      });
    }

    const result = await telegramBotService.sendMessageWithButtons(message, buttons);

    if (result.success) {
      return res.status(200).json({
        success: true,
        messageId: result.messageId,
        message: 'Message with buttons sent successfully'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in sendMessageWithButtons controller:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Delete a message from Telegram channel
 */
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message ID is required' 
      });
    }

    const result = await telegramBotService.deleteMessage(parseInt(messageId));

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Message deleted successfully'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in deleteMessage controller:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
```

Create routes: `Backend/routes/telegramBotRoutes.js`

```javascript
import express from 'express';
import {
  sendMessage,
  sendPhoto,
  sendPhotoAlbum,
  sendMessageWithButtons,
  deleteMessage
} from '../controllers/telegramBotController.js';
import { authenticateToken } from '../middleware/authMiddleware.js'; // Optional: Add auth

const router = express.Router();

// All routes require authentication (optional - remove if not needed)
// router.use(authenticateToken);

// Send text message
router.post('/message', sendMessage);

// Send single photo
router.post('/photo', sendPhoto);

// Send multiple photos (album)
router.post('/photo-album', sendPhotoAlbum);

// Send message with buttons
router.post('/message-buttons', sendMessageWithButtons);

// Delete message
router.delete('/message/:messageId', deleteMessage);

export default router;
```

Add route to `Backend/server.js`:

```javascript
import telegramBotRoutes from './routes/telegramBotRoutes.js';

// ... existing code ...

app.use('/api/telegram', telegramBotRoutes);
```

Initialize the service in `Backend/server.js`:

```javascript
import { telegramBotService } from './services/telegramBotService.js';

// ... existing code ...

// Initialize Telegram bot service
telegramBotService.init().catch(console.error);
```

---

## 8. Usage Examples

### Example 1: Send Simple Text Message

**API Request:**
```bash
POST /api/telegram/message
Content-Type: application/json

{
  "message": "Hello from Top Tutors Connect! 🎓"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": 12345,
  "message": "Message sent successfully"
}
```

### Example 2: Send Single Photo with Caption

**API Request:**
```bash
POST /api/telegram/photo
Content-Type: application/json

{
  "imageUrl": "https://example.com/image.jpg",
  "caption": "Check out our new course! 📚"
}
```

### Example 3: Send Multiple Photos (Album)

**API Request:**
```bash
POST /api/telegram/photo-album
Content-Type: application/json

{
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg",
    "https://example.com/image3.jpg"
  ],
  "caption": "Our latest course materials 📖"
}
```

### Example 4: Send Photo with Buttons

**API Request:**
```bash
POST /api/telegram/photo
Content-Type: application/json

{
  "imageUrl": "https://example.com/course-image.jpg",
  "caption": "New Course Available! 🎓",
  "buttons": [
    [
      {
        "text": "Enroll Now",
        "url": "https://toptutorsconnect.com/enroll"
      },
      {
        "text": "Learn More",
        "url": "https://toptutorsconnect.com/courses"
      }
    ],
    [
      {
        "text": "Contact Us",
        "url": "https://toptutorsconnect.com/contact"
      }
    ]
  ]
}
```

### Example 5: Send Message with Buttons

**API Request:**
```bash
POST /api/telegram/message-buttons
Content-Type: application/json

{
  "message": "Welcome to Top Tutors Connect! Choose an option:",
  "buttons": [
    [
      {
        "text": "📚 Browse Courses",
        "url": "https://toptutorsconnect.com/courses"
      }
    ],
    [
      {
        "text": "👨‍🏫 Find a Tutor",
        "url": "https://toptutorsconnect.com/tutors"
      },
      {
        "text": "📞 Contact Us",
        "url": "https://toptutorsconnect.com/contact"
      }
    ]
  ]
}
```

### Example 6: Using in Your Code

```javascript
import { telegramBotService } from './services/telegramBotService.js';

// Send a post with image and buttons
async function postToTelegram() {
  const result = await telegramBotService.sendPhotoWithButtons(
    'https://example.com/image.jpg',
    'New course available! 🎓',
    [
      [
        { text: 'Enroll Now', url: 'https://example.com/enroll' }
      ]
    ]
  );
  
  if (result.success) {
    console.log('Posted to Telegram:', result.messageId);
  }
}
```

---

## 9. Testing

### Step 9.1: Test Bot Connection
```bash
# Test if bot token is valid
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe
```

### Step 9.2: Test Sending Message
```bash
# Test sending a message
curl -X POST http://localhost:4000/api/telegram/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Test message"}'
```

### Step 9.3: Test with Postman or Thunder Client
1. Import the API endpoints
2. Test each endpoint with sample data
3. Verify messages appear in your Telegram channel

---

## 10. Troubleshooting

### Common Issues and Solutions

#### Issue 1: "Bot token is invalid"
- **Solution**: Verify the token in `.env` matches the one from BotFather
- Check for extra spaces or characters

#### Issue 2: "Chat not found" or "Channel not found"
- **Solution**: 
  - Verify the channel ID is correct (usually negative number)
  - Ensure bot is added as administrator with posting permissions
  - Try using `@channelusername` format if channel is public

#### Issue 3: "Forbidden: bot is not a member of the channel"
- **Solution**: Add the bot to the channel as an administrator with posting permissions

#### Issue 4: "Bad Request: message is too long"
- **Solution**: Telegram has a 4096 character limit for messages. Split long messages or use captions

#### Issue 5: "Bad Request: can't parse entities"
- **Solution**: Check HTML formatting in your message. Use valid HTML tags like `<b>`, `<i>`, `<a>`, etc.

#### Issue 6: Images not sending
- **Solution**: 
  - Verify image URLs are publicly accessible
  - Check image format (JPEG, PNG supported)
  - Ensure image size is under 10MB for photos

#### Issue 7: Buttons not appearing
- **Solution**: 
  - Verify button structure matches the expected format
  - Check that buttons array contains valid button objects
  - Ensure `url` or `callback_data` is provided

### Debug Tips

1. **Enable Logging**: Check console logs for detailed error messages
2. **Test with Bot API Directly**: Use curl to test Telegram API directly
3. **Verify Permissions**: Double-check bot permissions in channel settings
4. **Check Rate Limits**: Telegram has rate limits (30 messages per second per bot)

---

## Additional Resources

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [node-telegram-bot-api GitHub](https://github.com/yagop/node-telegram-bot-api)
- [Telegram Bot Examples](https://core.telegram.org/bots/samples)

---

## Security Best Practices

1. **Never commit tokens**: Always use environment variables
2. **Use HTTPS**: Always use HTTPS for API endpoints in production
3. **Add Authentication**: Protect your Telegram endpoints with authentication middleware
4. **Rate Limiting**: Implement rate limiting to prevent abuse
5. **Input Validation**: Validate all inputs before sending to Telegram
6. **Error Handling**: Implement proper error handling and logging

---

## Next Steps

After implementing the basic functionality, you can enhance it with:

1. **Scheduled Posts**: Use `node-cron` to schedule automatic posts
2. **Webhook Integration**: Set up webhooks for real-time updates
3. **Message Templates**: Create reusable message templates
4. **Analytics**: Track message engagement and views
5. **Multi-Channel Support**: Support posting to multiple channels
6. **File Uploads**: Handle file uploads from your application
7. **Rich Media**: Support videos, documents, and other media types

---

**Last Updated**: January 2025
**Version**: 1.0.0

