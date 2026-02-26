import { tierRateLimiter } from "../../../src/middleware/rateLimiter"
import { redis } from "../../../src/config/redis"

jest.mock("../../../src/config/redis", () => ({
    redis: {
        incr: jest.fn(),
        expire: jest.fn(),
    },
}));

describe('Rate Limiter', () => {

    const req: any = {
        user: { apiKey: "test", plan: "free" },

    };
    const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    };


    const next = jest.fn();

    it("Should allow request under limit", async () => {
        (redis.incr as jest.Mock).mockResolvedValue(1);
        await tierRateLimiter(req, res, next);

        expect(next).toHaveBeenCalled();
    })

    it("Should block request over the limit ", async () => {
        (redis.incr as jest.Mock).mockResolvedValue(101);

        await tierRateLimiter(req, res, next);

        expect(res.status).toHaveBeenCalledWith(429);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });


});
