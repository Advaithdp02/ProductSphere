"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = exports.registerUser = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = require("../models/user.model");
const generateApiKey_1 = require("../utils/generateApiKey");
const registerUser = async (email, password) => {
    const existingUser = await user_model_1.User.findOne({ email });
    if (existingUser) {
        throw new Error("User already exists");
    }
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
    const apiKey = (0, generateApiKey_1.generateApiKey)();
    const user = await user_model_1.User.create({
        email,
        password: hashedPassword,
        apiKey,
    });
    return { user, apiKey };
};
exports.registerUser = registerUser;
const loginUser = async (email, password) => {
    const user = await user_model_1.User.findOne({ email });
    if (!user) {
        throw new Error("Invalid credentials");
    }
    const isMatch = await bcrypt_1.default.compare(password, user.password);
    if (!isMatch) {
        throw new Error("Invalid credentials");
    }
    const token = jsonwebtoken_1.default.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    return { token };
};
exports.loginUser = loginUser;
