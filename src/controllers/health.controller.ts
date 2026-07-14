import { Request, Response } from "express";
import mongoose from "mongoose";
import { redis } from "../config/redis";

export class HealthController {
  static async check(req: Request, res: Response): Promise<void> {
    const services: Record<string, { status: string; message?: string }> = {};

    // Check MongoDB
    try {
      const dbState = mongoose.connection.readyState;
      // readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
      if (dbState === 1) {
        services.database = { status: "ok" };
      } else {
        services.database = {
          status: "error",
          message: `Mongoose readyState: ${dbState}`
        };
      }
    } catch (err: any) {
      services.database = { status: "error", message: err?.message };
    }

    // Check Redis
    try {
      await redis.ping();
      services.redis = { status: "ok" };
    } catch (err: any) {
      services.redis = { status: "error", message: err?.message };
    }

    const allHealthy = Object.values(services).every(
      (s) => s.status === "ok"
    );

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      services
    });
  }
}
