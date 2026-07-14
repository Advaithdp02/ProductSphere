import { Router, Request, Response, NextFunction } from "express";
import { register, login } from "../controllers/auth.controller";
import { redis } from "../config/redis";

const AUTH_WINDOW_SECONDS = 15 * 60; // 15 minutes
const AUTH_MAX_ATTEMPTS = 10;

const authRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const redisKey = `authrate:${ip}`;

  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, AUTH_WINDOW_SECONDS);
    }
    if (count > AUTH_MAX_ATTEMPTS) {
      return res.status(429).json({ message: "Too many attempts, try again later" });
    }
    next();
  } catch (err) {
    // Fail open — allow request if Redis is down
    next();
  }
};

const router = Router();

router.post("/register", authRateLimit, register);
router.post("/login", authRateLimit, login);

export default router;
