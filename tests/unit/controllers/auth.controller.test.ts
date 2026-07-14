import { register, login } from "../../../src/controllers/auth.controller";
import * as authService from "../../../src/services/auth.service";

jest.mock("../../../src/services/auth.service");

describe("Auth Controller Unit Tests", () => {

  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    mockRequest = {
      body: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    jest.clearAllMocks();
  });



  describe("register", () => {

    it("should return 201 and apiKey on successful registration", async () => {

      mockRequest.body = {
        email: "test@mail.com",
        password: "password123"
      };

      (authService.registerUser as jest.Mock).mockResolvedValue({
        apiKey: "fakeApiKey"
      });

      await register(mockRequest, mockResponse);

      expect(authService.registerUser).toHaveBeenCalledWith(
        "test@mail.com",
        "password123"
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "User registered",
        apiKey: "fakeApiKey"
      });
    });


    it("should return 400 if registration fails", async () => {

      mockRequest.body = {
        email: "test@mail.com",
        password: "password123"
      };

      (authService.registerUser as jest.Mock).mockRejectedValue(
        new Error("User already exists")
      );

      await register(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "User already exists"
      });
    });

  });



  describe("login", () => {

    it("should return apiKey on successful login", async () => {

      mockRequest.body = {
        email: "test@mail.com",
        password: "password123"
      };

      (authService.loginUser as jest.Mock).mockResolvedValue({
        apiKey: "fakeApiKey"
      });

      await login(mockRequest, mockResponse);

      expect(authService.loginUser).toHaveBeenCalledWith(
        "test@mail.com",
        "password123"
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        apiKey: "fakeApiKey"
      });
    });


    it("should return 400 if login fails", async () => {

      mockRequest.body = {
        email: "test@mail.com",
        password: "wrongPassword"
      };

      (authService.loginUser as jest.Mock).mockRejectedValue(
        new Error("Invalid credentials")
      );

      await login(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Invalid credentials"
      });
    });

  });

});