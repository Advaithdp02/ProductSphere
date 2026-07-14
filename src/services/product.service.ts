import crypto from "crypto";
import Product, { IProduct } from '../models/product.model';
import { redis } from "../config/redis"


type SortField = "price" | "createdAt" | "title";

export interface getProductsOptions {
    page?: number;
    limit?: number;

    search?: string;
    category?: string;
    brand?: string;
    siteName?: string;

    minPrice?: number;
    maxPrice?: number;

    inStock?: boolean;

    sortBy?: SortField;
    order?: "asc" | "desc"
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}


export class ProductService {
    static async getProducts(
        options: getProductsOptions
    ): Promise<PaginatedResponse<IProduct>> {

        const page: number = Math.max(options.page || 1, 1);
        const limit: number = Math.min(Math.max(options.limit || 20, 1), 100);
        const skip = (page - 1) * limit;

        const sortField: SortField = options.sortBy ?? "createdAt";

        const sortOrder: 1 | -1 = options.order === "asc" ? 1 : -1;

        const filters: Record<string, any> = {};

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
            filters.$text = { $search: options.search };
        }

        // ponytail: md5 hex is collision-resistant enough for cache keys; add salt/algorithm upgrade if key space grows
        const cachekey = `products:${crypto.createHash("md5").update(JSON.stringify(options)).digest("hex")}`;

        const cachedData = await redis.get(cachekey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
        const [total, products] = await Promise.all([
            Product.countDocuments(filters),
            Product.find(filters)
                .sort({ [sortField]: sortOrder })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        const response: PaginatedResponse<IProduct> = {
            data: products,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)

            }

        };

        await redis.set(cachekey, JSON.stringify(response), {
            EX: 60
        });

        return response;


    }
    static async getProductByUniqId(
        uniqId: string
    ): Promise<IProduct | null> {

        const cacheKey = `product:${uniqId}`;

        const cached = await redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const product = await Product.findOne({ uniqId }).lean();

        if (product) {
            await redis.set(cacheKey, JSON.stringify(product), {
                EX: 300, // 5 minutes
            });
        }

        return product;
    }
}