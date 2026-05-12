const Redis = require("ioredis");

let redis = null;

try {
  redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    enableOfflineQueue: false,
  });

  redis.on("connect", () => console.log("Connected to Redis successfully"));
  redis.on("error", (err) => {
    if (redis.status === "ready") {
      console.error("Redis connection error:", err.message);
    }
  });
} catch (err) {
  console.warn("Redis not available, continuing without cache:", err.message);
}

module.exports = redis;
