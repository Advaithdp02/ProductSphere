import { Request, Response, NextFunction } from "express";
import { IUser, User } from "../models/user.model";
import { redis } from "../config/redis";

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

const CACHE_TTL = 60; // seconds

export const apiKeyAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.header("x-api-key");

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: "API KEY IS MISSING!!",
      });
    }

    // 1. Check Redis cache
    const cached = await redis.get(`apikey:${apiKey}`);
    if (cached) {
      req.user = JSON.parse(String(cached));
      return next();
    }

    // 2. Cache miss — query MongoDB
    const user = await User.findOne({ apiKey });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "API KEY IS INVALID!!",
      });
    }

    // 3. Cache the result for 60s
    // ponytail: fire-and-forget set — don't block the request on cache writes
    redis.set(`apikey:${apiKey}`, JSON.stringify(user), { EX: CACHE_TTL });

    req.user = user;
    next();
  } catch (_e) {
    return res.status(500).json({
      success: false,
      message: "Authentication Failed",
    });
  }
};
