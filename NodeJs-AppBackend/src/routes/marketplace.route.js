import express from "express";
import {
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
  getUserListings,
} from "../controllers/marketplace.controller.js";
import {
  authenticateToken,
  optionalAuth,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public routes (no authentication required)
router.get("/listings", getListings);
router.get("/listings/:id", getListingById);

// Protected routes (authentication required)
router.post("/listings", authenticateToken, createListing);
router.put("/listings/:id", authenticateToken, updateListing);
router.delete("/listings/:id", authenticateToken, deleteListing);
router.get("/my-listings", authenticateToken, getUserListings);

export default router;
