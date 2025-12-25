import express from "express";
import {
  createPost,
  deletePost,
  editPost,
  getPosts,
} from "../controllers/post.controller.js";

const router = express.Router();

router.post("/createPost", createPost);
router.put("/editPost", editPost);
router.delete("deletePost", deletePost);
router.get("/getPosts", getPosts);

export default router;
