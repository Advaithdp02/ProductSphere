import { ProductController } from "../../../src/controllers/product.controller";
import { ProductService } from "../../../src/services/product.service";

jest.mock("../../../src/services/product.service");

describe("ProductController Unit Tests", () => {

  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    mockReq = {
      query: {},
      params: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });


  describe("getProducts", () => {

    it("should parse query params and return products", async () => {

      mockReq.query = {
        page: "2",
        limit: "10",
        search: "iphone",
        inStock: "true",
        order: "asc"
      };

      (ProductService.getProducts as jest.Mock).mockResolvedValue({
        data: [{ title: "iPhone 15" }],
        pagination: {
          total: 1,
          page: 2,
          limit: 10,
          totalPages: 1
        }
      });

      await ProductController.getProducts(mockReq, mockRes, mockNext);

      expect(ProductService.getProducts).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        search: "iphone",
        category: undefined,
        brand: undefined,
        siteName: undefined,
        minPrice: undefined,
        maxPrice: undefined,
        inStock: true,
        sortBy: "createdAt",
        order: "desc"
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [{ title: "iPhone 15" }],
        pagination: {
          total: 1,
          page: 2,
          limit: 10,
          totalPages: 1
        }
      });
    });


    it("should call next on error", async () => {

      (ProductService.getProducts as jest.Mock).mockRejectedValue(
        new Error("DB error")
      );

      await ProductController.getProducts(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

  });



  describe("getProductByUniqId", () => {

    it("should return 200 if product found", async () => {

      mockReq.params = { uniqId: "abc123" };

      (ProductService.getProductByUniqId as jest.Mock).mockResolvedValue({
        uniqId: "abc123",
        title: "Test Product"
      });

      await ProductController.getProductByUniqId(mockReq, mockRes, mockNext);

      expect(ProductService.getProductByUniqId)
        .toHaveBeenCalledWith("abc123");

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          uniqId: "abc123",
          title: "Test Product"
        }
      });
    });


    it("should return 404 if product not found", async () => {

      mockReq.params = { uniqId: "notfound" };

      (ProductService.getProductByUniqId as jest.Mock)
        .mockResolvedValue(null);

      await ProductController.getProductByUniqId(
        mockReq,
        mockRes,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Product not found"
      });
    });


    it("should call next if error occurs", async () => {

      mockReq.params = { uniqId: "abc123" };

      (ProductService.getProductByUniqId as jest.Mock)
        .mockRejectedValue(new Error("DB failure"));

      await ProductController.getProductByUniqId(
        mockReq,
        mockRes,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

  });

});