import { HealthController } from "../../../src/controllers/health.controller";
import mongoose from "mongoose";
import { redis } from "../../../src/config/redis";

jest.mock("mongoose", () => ({
  connection: {
    readyState: 1
  }
}));

jest.mock("../../../src/config/redis", () => ({
  redis: {
    ping: jest.fn()
  }
}));

describe("HealthController Unit Tests", () => {

  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    mockReq = {};

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    jest.clearAllMocks();
  });

  describe("check", () => {

    it("should return status 'ok' when both DB and Redis are healthy", async () => {

      (mongoose.connection as any).readyState = 1;
      (redis.ping as jest.Mock).mockResolvedValue("PONG");

      await HealthController.check(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "ok",
          services: {
            database: { status: "ok" },
            redis: { status: "ok" }
          }
        })
      );
    });


    it("should return status 'degraded' when DB is disconnected", async () => {

      (mongoose.connection as any).readyState = 0;
      (redis.ping as jest.Mock).mockResolvedValue("PONG");

      await HealthController.check(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "degraded",
          services: expect.objectContaining({
            database: expect.objectContaining({ status: "error" }),
            redis: { status: "ok" }
          })
        })
      );
    });


    it("should return status 'degraded' when Redis is down", async () => {

      (mongoose.connection as any).readyState = 1;
      (redis.ping as jest.Mock).mockRejectedValue(new Error("Redis connection refused"));

      await HealthController.check(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "degraded",
          services: expect.objectContaining({
            database: { status: "ok" },
            redis: expect.objectContaining({ status: "error", message: "Redis connection refused" })
          })
        })
      );
    });


    it("should return status 'degraded' when both DB and Redis are down", async () => {

      (mongoose.connection as any).readyState = 0;
      (redis.ping as jest.Mock).mockRejectedValue(new Error("Redis offline"));

      await HealthController.check(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "degraded",
          services: expect.objectContaining({
            database: expect.objectContaining({ status: "error" }),
            redis: expect.objectContaining({ status: "error" })
          })
        })
      );
    });


    it("should always include a timestamp in the response", async () => {

      (mongoose.connection as any).readyState = 1;
      (redis.ping as jest.Mock).mockResolvedValue("PONG");

      await HealthController.check(mockReq, mockRes);

      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall).toHaveProperty("timestamp");
      expect(new Date(jsonCall.timestamp).toISOString()).toBe(jsonCall.timestamp);
    });

  });

});
