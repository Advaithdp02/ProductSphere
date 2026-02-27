import crypto from "crypto";
import { generateApiKey } from "../../../src/utils/generateApiKey";

jest.mock("crypto");

describe("generateApiKey", () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return api key with correct prefix", () => {

  
    (crypto.randomBytes as jest.Mock).mockReturnValue(
      Buffer.from("123456789012345678901234")
    );

    const apiKey = generateApiKey();

    expect(apiKey.startsWith("sk_live_")).toBe(true);
  });


  it("should generate 48 hex characters after prefix", () => {

    (crypto.randomBytes as jest.Mock).mockReturnValue(
      Buffer.alloc(24) 
    );

    const apiKey = generateApiKey();

    const hexPart = apiKey.replace("sk_live_", "");

    
    expect(hexPart.length).toBe(48);
  });


  it("should call crypto.randomBytes with 24", () => {

    (crypto.randomBytes as jest.Mock).mockReturnValue(
      Buffer.alloc(24)
    );

    generateApiKey();

    expect(crypto.randomBytes).toHaveBeenCalledWith(24);
  });


  

});