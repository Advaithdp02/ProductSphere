import { z } from "zod";
import { Request, Response } from "express";
import { registerUser, loginUser } from "../services/auth.service";

const RegisterSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const register = async (req: Request, res: Response) => {
  try {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;
    const { apiKey } = await registerUser(email, password);

    res.status(201).json({
      message: "User registered",
      apiKey,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;
    const { apiKey } = await loginUser(email, password);

    res.json({ apiKey });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
