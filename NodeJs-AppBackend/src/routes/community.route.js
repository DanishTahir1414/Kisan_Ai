import express from "express";
import {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  toggleLike,
  addComment,
  deleteComment,
  getUserPosts,
} from "../controllers/community.controller.js";        
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public routes (no authentication required)
router.get("/posts", getPosts); 
router.get("/posts/:id", getPostById); 

// Protected routes (authentication required)
router.post("/posts", authenticateToken, createPost); 
router.put("/posts/:id", authenticateToken, updatePost);
router.delete("/posts/:id", authenticateToken, deletePost);
router.post("/posts/:id/like", authenticateToken, toggleLike);
router.post("/posts/:id/comments", authenticateToken, addComment);
router.delete("/posts/:id/comments/:commentId", authenticateToken, deleteComment);
router.get("/my-posts", authenticateToken, getUserPosts); 

export default router;