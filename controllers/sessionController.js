// controllers/sessionController.js (REAL SESSION STORAGE LIKE COMPANIES)
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
  const sessionKey = CACHE_KEYS.USER_SESSION(userId);

  const session = await redis.get(sessionKey);
  if (!session) return res.status(404).json({ message: "Session not found" });

  res.json(JSON.parse(session));
};