"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const redis_1 = require("../config/redis");
class HealthController {
    static async check(req, res) {
        const services = {};
        // Check MongoDB
        try {
            const dbState = mongoose_1.default.connection.readyState;
            // readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
            if (dbState === 1) {
                services.database = { status: "ok" };
            }
            else {
                services.database = {
                    status: "error",
                    message: `Mongoose readyState: ${dbState}`
                };
            }
        }
        catch (err) {
            services.database = { status: "error", message: err?.message };
        }
        // Check Redis
        try {
            await redis_1.redis.ping();
            services.redis = { status: "ok" };
        }
        catch (err) {
            services.redis = { status: "error", message: err?.message };
        }
        const allHealthy = Object.values(services).every((s) => s.status === "ok");
        res.status(200).json({
            status: allHealthy ? "ok" : "degraded",
            timestamp: new Date().toISOString(),
            services
        });
    }
}
exports.HealthController = HealthController;
