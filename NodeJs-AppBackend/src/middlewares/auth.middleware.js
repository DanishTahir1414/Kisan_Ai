import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const authenticateToken = async (req, res, next) => {
  console.log("🔵 Token authentication started at:", new Date().toISOString());
  
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    console.log("🔵 Auth header present:", !!authHeader);
    console.log("🔵 Token extracted:", !!token);

    if (!token) {
      console.log("🔴 No token provided");
      return res.status(401).json({ message: "Access token required" });
    }

    console.log("🔵 Verifying JWT token...");
    const startVerify = Date.now();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🔵 Token verified in:", Date.now() - startVerify, "ms");
    console.log("🔵 Decoded user ID:", decoded.id);
    
    // Get user from database
    console.log("🔵 Checking if user still exists...");
    const startUserCheck = Date.now();
    const user = await User.findById(decoded.id);
    console.log("🔵 User check completed in:", Date.now() - startUserCheck, "ms");
    
    if (!user) {
      console.log("🔴 User not found in database");
      return res.status(401).json({ message: "Invalid token - user not found" });
    }

    // Add user to request object
    req.user = user;
    console.log("🟢 Authentication successful for user:", decoded.id);
    next();
  } catch (error) {
    console.error("🔴 Auth middleware error:", error);
    
    if (error.name === "JsonWebTokenError") {
      console.log("🔴 Invalid token");
      return res.status(401).json({ message: "Invalid token" });
    }
    if (error.name === "TokenExpiredError") {
      console.log("🔴 Token expired");
      return res.status(401).json({ message: "Token expired" });
    }
    
    console.log("🔴 Server error during authentication");
    return res.status(500).json({ message: "Server error in authentication" });
  }
};

export const optionalAuth = async (req, res, next) => {
  console.log("🔵 Optional auth started at:", new Date().toISOString());
  
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    console.log("🔵 Optional auth - token present:", !!token);

    if (token) {
      console.log("🔵 Verifying optional token...");
      const startVerify = Date.now();
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("🔵 Optional token verified in:", Date.now() - startVerify, "ms");
      
      const startUserCheck = Date.now();
      const user = await User.findById(decoded.id);
      console.log("🔵 Optional user check completed in:", Date.now() - startUserCheck, "ms");
      
      if (user) {
        req.user = user;
        console.log("🟢 Optional auth successful for user:", decoded.id);
      } else {
        console.log("🔴 Optional auth - user not found");
      }
    } else {
      console.log("🔵 No token in optional auth, continuing without user");
    }
    
    next();
  } catch (error) {
    console.log("🔴 Optional auth error (continuing anyway):", error.message);
    // For optional auth, we continue even if token is invalid
    next();
  }
};