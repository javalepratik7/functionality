import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import productRoutes from "./routes/productRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import rateLimiter from "./middleware/rateLimiter.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

app.use(rateLimiter); // GLOBAL RATE LIMITING

app.use("/api/products", productRoutes);
app.use("/api/session", sessionRoutes);

app.listen(process.env.PORT, () => console.log(`Server running on ${process.env.PORT}`));