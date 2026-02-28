"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = void 0;
const product_service_1 = require("../services/product.service");
class ProductController {
    // GET /api/products
    static async getProducts(req, res, next) {
        try {
            const { page, limit, search, category, brand, siteName, minPrice, maxPrice, inStock, sortBy, order } = req.query;
            const options = {
                page: typeof page === "string" ? Number(page) : undefined,
                limit: typeof limit === "string" ? Number(limit) : undefined,
                search: typeof search === "string" ? search : undefined,
                category: typeof category === "string" ? category : undefined,
                brand: typeof brand === "string" ? brand : undefined,
                siteName: typeof siteName === "string" ? siteName : undefined,
                minPrice: typeof minPrice === "string" ? Number(minPrice) : undefined,
                maxPrice: typeof maxPrice === "string" ? Number(maxPrice) : undefined,
                inStock: typeof inStock === "string" ? inStock === "true" : undefined,
                sortBy: sortBy,
                order: order === "asc" || order === "desc"
                    ? order
                    : undefined
            };
            const result = await product_service_1.ProductService.getProducts(options);
            res.status(200).json({
                success: true,
                ...result
            });
        }
        catch (error) {
            next(error);
        }
    }
    // GET /api/products/:uniqueId
    static async getProductByUniqId(req, res, next) {
        try {
            const { uniqId } = req.params;
            const product = await product_service_1.ProductService.getProductByUniqId(uniqId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }
            res.status(200).json({
                success: true,
                data: product
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ProductController = ProductController;
