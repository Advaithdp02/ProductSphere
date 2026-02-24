import { Router } from "express";
import { ProductController } from "../controllers/product.controller";


const router=Router();

router.get("/",ProductController.getProducts);
router.get("/:uniqId",ProductController.getProductByUniqId);

export default router