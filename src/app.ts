import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import router from "./routes";
import morgan from "morgan";

const app = express();

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "http://localhost:3000",
    credentials: true,
}));
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev", {
    skip: (req) => req.url === "/api/health",
}));
app.use(express.json());

app.use('/api',router)

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error" });
});

export default app;
