import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../../../src/models/user.model";
import { registerUser, loginUser } from "../../../src/services/auth.service";
import { generateApiKey } from "../../../src/utils/generateApiKey";

jest.mock("bcrypt");
jest.mock("jsonwebtoken");
jest.mock("../../../src/models/user.model");
jest.mock("../../../src/utils/generateApiKey");

describe("Auth Service - Unit Test",()=>{


    afterEach(()=>{
        jest.clearAllMocks();
    });

    describe("register user",()=>{
        it("Should throw error if user already exists",async()=>{
            (User.findOne as jest.Mock).mockResolvedValue({email:"test@testing.com"});
            await expect(registerUser("test@testing.com","pass123")).rejects.toThrow("User already exists");


        });


        it("should create  new user successfully",async ()=>{
        (User.findOne as jest.Mock).mockResolvedValue(null);
        (bcrypt.hash as jest.Mock).mockResolvedValue("hashedPassword");
        (generateApiKey as jest.Mock).mockReturnValue("apiKey");

        (User.create as jest.Mock).mockResolvedValue({
            email: "test@mail.com",
            password: "hashedPassword",
            apiKey: "fakeApiKey",
        });

        const result =await registerUser("test@mail.com", "password123");

        expect(result.apiKey).toBe("apiKey");
        expect(User.create).toHaveBeenCalled();
        expect(bcrypt.hash).toHaveBeenCalledWith("password123",10);

    });
    
    })
    describe("login user",()=>{
        it("Should throw error if user not found",async ()=>{

            (User.findOne as jest.Mock).mockResolvedValue(null);
            await expect(loginUser("test@testing.com","password123")).rejects.toThrow("Invalid Credentials");
        })
        it("Should throw error if passwords doesnt match",async ()=>{
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);
            (User.findOne as jest.Mock).mockResolvedValue({
                email: "test@mail.com",
                password: "hashedPassword",
            })
            
            await expect(loginUser("test@testing.com","password123")).rejects.toThrow("Invalid Credentials");

        })
        it("Should login user and return token and apiKey on success",async ()=>{
            (User.findOne as jest.Mock).mockResolvedValue({
                _id: "userId123",
                password: "hashedPassword",
                apiKey: "fakeApiKey",
            });

            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (jwt.sign as jest.Mock).mockReturnValue("fakeToken");

            process.env.JWT_SECRET = "secret";

            const result = await loginUser("test@mail.com", "password123")

            expect(result.token).toBe("fakeToken");
            expect(result.apiKey).toBe("fakeApiKey");
            expect(jwt.sign).toHaveBeenCalledWith({userId:"userId123"},
                "secret",
                {"expiresIn":"1d"}
            );
        })
    })

   

});
