jest.mock("../../src/config/redis", () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(null),
    incr: jest.fn().mockResolvedValue(1), // under rate limit
    expire: jest.fn().mockResolvedValue(null),
  },
}));

import request from "supertest";
import app from "../testApp";
import Product from "../../src/models/product.model";

describe("Full Flow Integration Test", () => {

  let apiKey: string;
  let token: string;

  beforeEach(async () => {
    await Product.create({
      uniqId: "prod-1",
      title: "Integration Product",
      price: 999,
      inStock: true
    });
  });
  

  it("Register → Login → Access Product API", async () => {

    // 1️⃣ Register
    const registerRes = await request(app)
      .post("/api/auth/register")
      .send({
        email: "integration@test.com",
        password: "12345678"
      });

    expect(registerRes.status).toBe(201);
    apiKey = registerRes.body.apiKey;

    
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "integration@test.com",
        password: "12345678"
      });

    expect(loginRes.status).toBe(200);
    token = loginRes.body.token;

    // 3️⃣ Access product
    const productRes = await request(app)
      .get("/api/product")
      .set("Authorization", `Bearer ${token}`)
      .set("x-api-key", apiKey);

    expect(productRes.status).toBe(200);
    expect(productRes.body.success).toBe(true);
    expect(productRes.body.data.length).toBe(1);
  });

});