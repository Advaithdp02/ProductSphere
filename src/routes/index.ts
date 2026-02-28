import { Router } from "express";
import authRoutes from "./auth.routes";
import productRoutes from "./product.route";
import healthRoutes from "./health.route";

const router = Router();

router.use("/auth", authRoutes);
router.use("/product", productRoutes);
router.use("/health", healthRoutes);

export default router;
