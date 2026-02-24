"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
const product_model_1 = __importDefault(require("../models/product.model"));
const redis_1 = require("../config/redis");
class ProductService {
    static async getProducts(options) {
        const page = Math.max(options.page || 1, 1);
        const limit = Math.max(options.limit || 20, 1);
        const skip = (page - 1) * limit;
        const sortField = options.sortBy ?? "createdAt";
        const sortOrder = options.order === "asc" ? 1 : -1;
        const filters = {};
        if (options.category) {
            filters.category = options.category;
        }
        if (options.brand) {
            filters.brand = options.brand;
        }
        if (options.siteName) {
            filters.siteName = options.siteName;
        }
        if (options.inStock !== undefined) {
            filters.inStock = options.inStock;
        }
        if (options.minPrice !== undefined || options.maxPrice !== undefined) {
            if (options.minPrice !== undefined || options.maxPrice !== undefined) {
                filters.price = {
                    ...(options.minPrice !== undefined && { $gte: options.minPrice }),
                    ...(options.maxPrice !== undefined && { $lte: options.maxPrice }),
                };
            }
        }
        if (options.search) {
            filters.$or = [
                { title: { $regex: options.search, $options: "i" } },
                { description: { $regex: options.search, $options: "i" } },
                { brand: { $regex: options.search, $options: "i" } },
            ];
        }
        const cachekey = `products:page=${page}:limit=${limit}:category=${options.category || "all"}:brand=${options.brand || "all"}:site=${options.siteName || "all"}:min=${options.minPrice || 0}:max=${options.maxPrice || 0}:stock=${options.inStock ?? "all"}:sort=${sortField}:${sortOrder}:search=${options.search || "none"}`;
        const cachedData = await redis_1.redis.get(cachekey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
        const [total, products] = await Promise.all([
            product_model_1.default.countDocuments(filters),
            product_model_1.default.find(filters)
                .sort({ [sortField]: sortOrder })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);
        const response = {
            data: products,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
        await redis_1.redis.set(cachekey, JSON.stringify(response), {
            EX: 60
        });
        return response;
    }
    static async getProductByUniqId(uniqId) {
        const cacheKey = `product:${uniqId}`;
        const cached = await redis_1.redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        const product = await product_model_1.default.findOne({ uniqId }).lean();
        if (product) {
            await redis_1.redis.set(cacheKey, JSON.stringify(product), {
                EX: 300, // 5 minutes
            });
        }
        return product;
    }
}
exports.ProductService = ProductService;
