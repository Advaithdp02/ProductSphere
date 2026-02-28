"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyAuth = void 0;
const user_model_1 = require("../models/user.model");
const apiKeyAuth = async (req, res, next) => {
    try {
        const apiKey = req.header("x-api-key");
        if (!apiKey) {
            return res.status(401).json({
                success: false,
                message: "API KEY IS MISSING!!"
            });
        }
        const user = await user_model_1.User.findOne({ apiKey });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "API KEY IS INVALID!!"
            });
        }
        req.user = user;
        next();
    }
    catch (e) {
        return res.status(500).json({
            success: false,
            message: "Authentication Failed"
        });
    }
};
exports.apiKeyAuth = apiKeyAuth;
