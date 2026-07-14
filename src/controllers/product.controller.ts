import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ProductService } from '../services/product.service';
import { getProductsOptions } from '../services/product.service';

const ProductQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    category: z.string().optional(),
    brand: z.string().optional(),
    siteName: z.string().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    inStock: z.enum(["true", "false"]).optional(),
    sortBy: z.string().default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    search: z.string().optional(),
});

export class ProductController {

    // GET /api/products
    static async getProducts(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const parsed = ProductQuerySchema.safeParse(req.query);
            if (!parsed.success) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid query parameters",
                    errors: parsed.error.flatten(),
                });
            }

            const q = parsed.data;
            const options: getProductsOptions = {
                page: q.page,
                limit: q.limit,
                search: q.search,
                category: q.category,
                brand: q.brand,
                siteName: q.siteName,
                minPrice: q.minPrice,
                maxPrice: q.maxPrice,
                inStock: q.inStock === "true" ? true : q.inStock === "false" ? false : undefined,
                sortBy: q.sortBy as any,
                order: q.sortOrder,
            };

            const result = await ProductService.getProducts(options);

            res.status(200).json({
                success: true,
                ...result
            });

        } catch (error) {
            next(error);
        }
    }

    // GET /api/products/:uniqueId

    static async getProductByUniqId(
        req: Request<{ uniqId: string }>,
        res: Response,
        next: NextFunction
    ) {
        try {
            const { uniqId } = req.params;

            const product = await ProductService.getProductByUniqId(uniqId);
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

        } catch (error) {
            next(error);
        }
    }
}