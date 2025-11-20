// middleware/rateLimiter.js
import redis from "../config/redisClient.js";

export default async function rateLimiter(req, res, next) {
  const ip = req.ip;
  const key = `rate:${ip}`;

  const requests = await redis.incr(key);

  if (requests === 1) {
    redis.expire(key, 60); // 60 seconds
  }

  if (requests > 100) {
    return res.status(429).json({ message: "Too many requests" });
  }

  next();
}