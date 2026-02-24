import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service';
import { getProductsOptions } from '../services/product.service';





export class ProductController {

    // GET /api/products
    static async getProducts(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        type SortField = "price" | "createdAt" | "name";
        function isSortField(value: any): value is SortField {
            return ["price", "createdAt", "name"].includes(value);
        }
        try {
            const {
                page,
                limit,
                search,
                category,
                brand,
                siteName,
                minPrice,
                maxPrice,
                inStock,
                sortBy,
                order
            } = req.query;

            const options: getProductsOptions = {
                page: typeof page === "string" ? Number(page) : undefined,
                limit: typeof limit === "string" ? Number(limit) : undefined,
                search: typeof search === "string" ? search : undefined,
                category: typeof category === "string" ? category : undefined,
                brand: typeof brand === "string" ? brand : undefined,
                siteName: typeof siteName === "string" ? siteName : undefined,
                minPrice: typeof minPrice === "string" ? Number(minPrice) : undefined,
                maxPrice: typeof maxPrice === "string" ? Number(maxPrice) : undefined,
                inStock:typeof inStock === "string"? inStock === "true": undefined,
                sortBy: sortBy as any,
                order:
                    order === "asc" || order === "desc"
                        ? order
                        : undefined
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