import { Router } from "express";
import { ProductController } from "../controllers/product.controller";
import { apiKeyAuth } from "../middleware/apiKeyAuth";
import { tierRateLimiter } from "../middleware/rateLimiter";
 
const router=Router();

router.get("/",apiKeyAuth,tierRateLimiter,ProductController.getProducts);
router.get("/:uniqId",apiKeyAuth,tierRateLimiter,ProductController.getProductByUniqId);

export default router