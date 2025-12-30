Great — here is your complete and polished **Zero-to-Hero Redis + Enterprise MERN Backend Guide** in **clean Markdown format**, perfect for long-term reference.

---

# 🚀 **Redis From Zero to Hero — Complete Guide (MD Format)**

## **+ Enterprise-Level MERN Folder Structure & Redis Implementation**

---

# #️⃣ **TABLE OF CONTENTS**

1. What is Redis?
2. Why Companies Use Redis
3. Redis Installation
4. Redis CLI Basics
5. Redis Data Types (All With Examples)
6. Redis in Node.js (ioredis)
7. Enterprise Folder Structure
8. Complete Backend Code (Modular, Senior-Level)
9. API Endpoints + cURL Commands
10. Docker + Redis Setup
11. Best Practices for Real Companies

---

# #️⃣ 1. **What is Redis?**

Redis is an **in-memory key-value store** used for:

* Caching
* Rate Limiting
* Session Storage
* Queues
* Pub/Sub
* Real-time analytics

Redis = **Very fast memory storage** → much faster than MongoDB/MySQL because Redis stores data in RAM.

---

# #️⃣ 2. **Why Companies Use Redis**

| Feature                | Why Companies Use It                                 |
| ---------------------- | ---------------------------------------------------- |
| ⚡ Speed                | Millions of reads per second                         |
| 🔄 Caching             | Reduce database load by 70%+                         |
| ⏳ TTL                  | Auto-expire keys (sessions, OTP, cache invalidation) |
| 🚦 Rate Limiting       | API protection, DDOS prevention                      |
| 🗂 Multiple Data Types | Strings, Lists, Sets, Hashes, Streams                |
| 🏢 Cluster Ready       | Scales horizontally                                  |

---

# #️⃣ 3. **Install Redis**

### **Windows (WSL Recommended)**

```
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

### **MacOS**

```
brew install redis
brew services start redis
```

### **Ubuntu / Linux**

```
sudo apt-get install redis-server
```

### **Check Redis**

```
redis-cli ping
```

Output:

```
PONG
```

---

# #️⃣ 4. **Redis CLI Basics**

### **Set a key**

```
SET name "Pratik"
```

### **Get a key**

```
GET name
```

### **Set key with expiry**

```
SET otp "123456" EX 60
```

### **List all keys**

```
KEYS *
```

### **Delete a key**

```
DEL name
```

---

# #️⃣ 5. **Redis Data Types (All Important Ones)**

---

## **1) STRING (most used)**

Basic key-value data.

### Set:

```
SET user:1 "Pratik"
```

### Get:

```
GET user:1
```

### Increment:

```
INCR views
```

---

## **2) HASH (Like JSON object)**

```
HSET user:101 name "Pratik" age "23"
HGETALL user:101
```

→ Best for user profiles, settings, metadata.

---

## **3) LIST (Queue / Stack)**

Add items:

```
LPUSH tasks "task1"
RPUSH tasks "task2"
```

Pop:

```
LPOP tasks
```

---

## **4) SET (Unique values)**

```
SADD tags "node" "redis" "backend"
SMEMBERS tags
```

---

## **5) SORTED SETS (leaderboards, ranking)**

```
ZADD scores 100 "player1"
ZADD scores 200 "player2"
ZRANGE scores 0 -1 WITHSCORES
```

---

## **6) PUB/SUB (Real-time messaging)**

Terminal 1:

```
SUBSCRIBE news
```

Terminal 2:

```
PUBLISH news "New message!"
```

---

## **7) STREAMS (Modern, Kafka-like)**

```
XADD mystream * name "Pratik" message "Hello"
XREAD COUNT 1 STREAMS mystream 0
```

---

# #️⃣ 6. **Redis in Node.js (ioredis)**

Install:

```
npm i ioredis
```

Basic usage:

```js
import Redis from "ioredis";

const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
});

await redis.set("name", "Pratik");
const name = await redis.get("name");
console.log(name);
```

---

# #️⃣ 7. **Enterprise Folder Structure**

```
backend/
├── server.js
├── config/
│     ├── db.js
│     └── redisClient.js
├── middleware/
│     └── rateLimiter.js
├── controllers/
│     ├── productController.js
│     └── sessionController.js
├── routes/
│     ├── productRoutes.js
│     └── sessionRoutes.js
├── models/
│     └── Product.js
└── utils/
      └── cacheKeys.js
```

Senior developers always follow:

* Clear separation
* Reusable modules
* Centralized Redis keys
* Controller-based logic
* Route grouping

---

# #️⃣ 8. **Complete Backend Redis Code (Senior Developer Standard)**

---

## **server.js**

```js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import redis from "./config/redisClient.js";
import productRoutes from "./routes/productRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import rateLimiter from "./middleware/rateLimiter.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// connect DB + Redis
connectDB();
redis.ping();

// middleware
app.use(rateLimiter);

// routes
app.use("/api/products", productRoutes);
app.use("/api/session", sessionRoutes);

app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`)
);
```

---

## **config/db.js**

```js
import mongoose from "mongoose";

export default async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB Connection Failed", err);
    process.exit(1);
  }
}
```

---

## **config/redisClient.js**

```js
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

redis.on("connect", () => console.log("Redis Connected"));
redis.on("error", (err) => console.error("Redis Error:", err));

export default redis;
```

---

## **middleware/rateLimiter.js**

```js
import redis from "../config/redisClient.js";

export default async function rateLimiter(req, res, next) {
  const ip = req.ip;
  const key = `rate:${ip}`;

  const requests = await redis.incr(key);

  if (requests === 1) redis.expire(key, 60);

  if (requests > 100) {
    return res.status(429).json({ message: "Too many requests" });
  }

  next();
}
```

---

## **models/Product.js**

```js
import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
});

export default mongoose.model("Product", productSchema);
```

---

## **utils/cacheKeys.js**

```js
export const CACHE_KEYS = {
  ALL_PRODUCTS: "products:all",
  USER_SESSION: (userId) => `session:${userId}`,
};
```

---

## **controllers/productController.js**

```js
import Product from "../models/Product.js";
import redis from "../config/redisClient.js";
import { CACHE_KEYS } from "../utils/cacheKeys.js";

export const getProducts = async (req, res) => {
  const cache = await redis.get(CACHE_KEYS.ALL_PRODUCTS);

  if (cache) {
    return res.json({ source: "cache", data: JSON.parse(cache) });
  }

  const products = await Product.find();
  await redis.set(CACHE_KEYS.ALL_PRODUCTS, JSON.stringify(products), "EX", 60);

  res.json({ source: "database", data: products });
};

export const createProduct = async (req, res) => {
  const product = await Product.create(req.body);

  await redis.del(CACHE_KEYS.ALL_PRODUCTS);

  res.status(201).json(product);
};
```

---

## **controllers/sessionController.js**

```js
import redis from "../config/redisClient.js";
import { CACHE_KEYS } from "../utils/cacheKeys.js";

export const createSession = async (req, res) => {
  const { userId } = req.body;

  const sessionKey = CACHE_KEYS.USER_SESSION(userId);

  const sessionData = {
    userId,
    loginTime: Date.now(),
  };

  await redis.set(sessionKey, JSON.stringify(sessionData), "EX", 3600);

  res.json({ message: "Session created", session: sessionData });
};

export const getSession = async (req, res) => {
  const { userId } = req.params;

  const session = await redis.get(CACHE_KEYS.USER_SESSION(userId));

  if (!session)
    return res.status(404).json({ message: "Session not found" });

  res.json(JSON.parse(session));
};
```

---

## **routes/productRoutes.js**

```js
import express from "express";
import { getProducts, createProduct } from "../controllers/productController.js";

const router = express.Router();

router.get("/", getProducts);
router.post("/", createProduct);

export default router;
```

---

## **routes/sessionRoutes.js**

```js
import express from "express";
import { createSession, getSession } from "../controllers/sessionController.js";

const router = express.Router();

router.post("/create", createSession);
router.get("/:userId", getSession);

export default router;
```

---

# #️⃣ 9. **cURL Commands**

### Create product

```
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"iPhone","price":999}'
```

### Get products

```
curl http://localhost:5000/api/products
```

### Create session

```
curl -X POST http://localhost:5000/api/session/create \
  -H "Content-Type: application/json" \
  -d '{"userId":"101"}'
```

### Get session

```
curl http://localhost:5000/api/session/101
```

---

# #️⃣ 10. **Docker Setup**

### **docker-compose.yml**

```yml
version: "3.8"

services:
  redis:
    image: redis:latest
    container_name: redis-server
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

volumes:
  redisdata:
```

Run:

```
docker-compose up -d
```

---

# #️⃣ 11. **Best Practices (What Companies Do)**

* Always use **centralized cache keys**
* Always add **TTL** to cache
* Clear cache when database changes
* Use Redis for rate limiting
* Use Redis for session store (instead of MongoDB)
* Keep Redis connection in `/config/redisClient.js`
* Avoid putting Redis logic inside routes
* Prefer hashing over strings for structured data

---

# 🎉 **DONE!**

If you want, I can also generate:

✅ PDF version
✅ DOCX version
✅ Make it a tutorial-style PDF
✅ Add diagrams / cheat sheets

Just tell me!
