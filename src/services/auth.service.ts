import bcrypt from "bcrypt";
import { User } from "../models/user.model";
import { generateApiKey } from "../utils/generateApiKey";

export const registerUser = async (email: string, password: string) => {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email format");
  }
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const apiKey = generateApiKey();

  const user = await User.create({
    email,
    password: hashedPassword,
    apiKey,
  });

  return { user, apiKey };
};

export const loginUser = async (email: string, password: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("Invalid Credentials");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid Credentials");
  }
  return { apiKey: user.apiKey };
};
