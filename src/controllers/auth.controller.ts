import { Request, Response } from "express";
import { registerUser, loginUser } from "../services/auth.service";

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

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
    const { email, password } = req.body;

    const { token,apiKey } = await loginUser(email, password);

    res.json({ token,apiKey });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
