"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const auth_service_1 = require("../services/auth.service");
const register = async (req, res) => {
    try {
        const { email, password } = req.body;
        const { apiKey } = await (0, auth_service_1.registerUser)(email, password);
        res.status(201).json({
            message: "User registered",
            apiKey,
        });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const { token, apiKey } = await (0, auth_service_1.loginUser)(email, password);
        res.json({ token, apiKey });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.login = login;
