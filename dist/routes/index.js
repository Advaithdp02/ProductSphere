"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const product_route_1 = __importDefault(require("./product.route"));
const health_route_1 = __importDefault(require("./health.route"));
const router = (0, express_1.Router)();
router.use("/auth", auth_routes_1.default);
router.use("/product", product_route_1.default);
router.use("/health", health_route_1.default);
exports.default = router;
