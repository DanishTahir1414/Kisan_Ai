import express from "express";
import { getIrrigationAlert } from "../controllers/irrigation.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Get irrigation alert for user's location
router.post("/alert", authenticateToken, getIrrigationAlert);

export default router;
