import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { after } from "node:test";

let mongo: MongoMemoryServer;

beforeAll(async ()=>{
    mongo=await MongoMemoryServer.create();
    const uri= mongo.getUri();

    await mongoose.connect(uri);
});
beforeAll(async () => {
  process.env.JWT_SECRET = "testsecret";
});
afterAll(async ()=>{
    await mongoose.disconnect();
    await mongo.stop();
});

afterEach(async ()=>{
    const collections=mongoose.connection.collections;
    for(const key in collections){
        await collections[key].deleteMany({});
    }

});