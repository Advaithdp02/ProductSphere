"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectRedis = exports.redis = void 0;
const redis_1 = require("redis");
exports.redis = (0, redis_1.createClient)({
    url: process.env.REDIS_URL
});
exports.redis.on("error", (err) => console.error("Redis Error", err));
const connectRedis = async () => {
    await exports.redis.connect();
};
exports.connectRedis = connectRedis;
