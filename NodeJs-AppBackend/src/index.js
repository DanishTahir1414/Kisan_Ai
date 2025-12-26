import express from "express";
import { connectDB } from "./configs/db.js";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.route.js";
import marketplaceRoutes from "./routes/marketplace.route.js";
import postingRoutes from "./routes/posting.route.js";
import communityRoutes from "./routes/community.route.js";
import diagnosisRoutes from "./routes/diagnosisHistory.route.js";
import irrigationRoutes from "./routes/irrigation.route.js";
import ttsRoutes from "./routes/tts.route.js";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Add CORS middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/posting", postingRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/diagnosis", diagnosisRoutes);
app.use("/api/irrigation", irrigationRoutes);
app.use("/api/tts", ttsRoutes);

app.listen(PORT, () => {
  console.log("serever 3000 pe dor raha hai");
  connectDB();
});
