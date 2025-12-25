import express from "express";
import { login, logout, signup, editUser } from "../controllers/auth.controller.js";
import {authenticateToken} from "../middlewares/auth.middleware.js"

const router = express.Router();

router.post("/signup", signup);

router.post("/login", login);

router.post("/logout", logout);

router.put("/edit-user", authenticateToken, editUser);

export default router;
