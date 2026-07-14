import { Router, Request, Response, NextFunction } from "express";
import { register, login } from "../controllers/auth.controller";

// ponytail: in-memory rate limiter, good enough for single-instance deployments
const authAttempts = new Map<string, { count: number; resetTime: number }>();
const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_MAX_ATTEMPTS = 10;

const authRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const record = authAttempts.get(ip);

  if (!record || now > record.resetTime) {
    authAttempts.set(ip, { count: 1, resetTime: now + AUTH_WINDOW_MS });
    return next();
  }

  record.count++;
  if (record.count > AUTH_MAX_ATTEMPTS) {
    return res.status(429).json({ message: "Too many attempts, try again later" });
  }
  next();
};

const router = Router();

router.post("/register", authRateLimit, register);
router.post("/login", authRateLimit, login);

export default router;
