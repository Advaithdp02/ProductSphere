import mongoose, { Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string;
  plan: "free" | "basic" | "pro" | "enterprise";
  apiKey: string;
  createdAt: Date;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    plan: {
      type: String,
      enum: ["free", "basic", "pro", "enterprise"],
      default: "free",
    },
    apiKey: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", userSchema);
