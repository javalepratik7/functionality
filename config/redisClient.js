// import Redis from "ioredis";

// const redis = new Redis({
//   host: process.env.REDIS_HOST,
//   port: process.env.REDIS_PORT
// });

// redis.on("connect", () => console.log("Redis Connected"));
// redis.on("error", (err) => console.error("Redis Error:", err));

// export default redis;


// config/redisClient.js
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

export default redis;