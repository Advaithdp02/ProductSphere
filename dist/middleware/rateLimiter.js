"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tierRateLimiter = void 0;
const redis_1 = require("../config/redis");
const PLAN_LIMITS = {
    free: 100,
    basic: 500,
    pro: 1000,
    enterprise: 10000
};
const WINDOW_SECONDS = 24 * 60 * 60; //1 DAY
const tierRateLimiter = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(403).json({
                success: false,
                message: "USER NOT AUTHENTICATED"
            });
        }
        const limit = PLAN_LIMITS[user.plan] || 100;
        const redisKey = `rate:${user.apiKey}`;
        const requestCount = await redis_1.redis.incr(redisKey);
        if (requestCount === 1) {
            await redis_1.redis.expire(redisKey, WINDOW_SECONDS);
        }
        if (requestCount > limit) {
            return res.status(429).json({
                success: false,
                message: "RATE LIMIT EXCEEDED"
            });
        }
        next();
    }
    catch (e) {
        return res.status(500).json({
            success: false,
            message: "RATE LIMITING FAILED"
        });
    }
};
exports.tierRateLimiter = tierRateLimiter;
