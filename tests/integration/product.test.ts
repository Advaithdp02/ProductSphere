import request from "supertest"
import app from "../testApp"
import {User} from "../../src/models/user.model"


describe("Product API",()=>{
    let apiKey:string;

    beforeEach(async ()=>{
        const user=await User.create({
            email: "test@test.com",
            password: "123456",
            apiKey: "integration_key",
            plan: "free",
        });
        apiKey=user.apiKey;



    });

    it("Should return 401 without api Key",async ()=>{
        const res=await request(app).get("/api/product");
        expect(res.status).toBe(401);
    });

    it("Should allow valid api key",async ()=>{
        const res=await request(app).get("/api/product").set("x-api-key",apiKey);
        expect(res.status).not.toBe(401);
    })
})