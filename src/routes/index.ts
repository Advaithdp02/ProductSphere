import { Router } from "express";
import authRoutes from "./auth.routes";
import productRoutes from "./product.route"

const router = Router();

router.use("/auth", authRoutes);
router.use("/product",productRoutes);

export default router;
