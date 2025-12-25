import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

export const signup = async (req, res) => {
  console.log("🔵 Signup request started at:", new Date().toISOString());
  console.log("🔵 Request body:", req.body);

  try {
    const { name, email, phone, city, password, profilePic } = req.body;

    console.log("🔵 Extracted fields:", {
      name,
      email,
      phone,
      city,
      passwordLength: password?.length,
      profilePic,
    });

    // Check if user already exists
    console.log("🔵 Checking for existing user with email:", email);
    const startUserCheck = Date.now();
    const existingUser = await User.findOne({ email });
    console.log(
      "🔵 User check completed in:",
      Date.now() - startUserCheck,
      "ms"
    );
    console.log(
      "🔵 Existing user check result:",
      existingUser ? "User exists" : "User not found"
    );

    if (existingUser) {
      console.log("🔴 User already exists, returning error");
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    console.log("🔵 Starting password hash...");
    const startHash = Date.now();
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("🔵 Password hashed in:", Date.now() - startHash, "ms");

    // Create user with all fields
    console.log("🔵 Creating user in database...");
    const startCreate = Date.now();
    const user = await User.create({
      name,
      email,
      phone,
      city,
      password: hashedPassword,
      profilePic
    });
    console.log("🔵 User created in:", Date.now() - startCreate, "ms");
    console.log("🟢 User created successfully with ID:", user._id);

    console.log("🔵 Sending success response...");
    res.status(201).json({ message: "User created successfully" });
    console.log(
      "🟢 Signup completed successfully at:",
      new Date().toISOString()
    );
  } catch (err) {
    console.error("🔴 Signup error occurred:", err);
    console.error("🔴 Error stack:", err.stack);

    // Handle validation errors
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((error) => error.message);
      console.log("🔴 Validation errors:", errors);
      return res.status(400).json({ message: errors.join(", ") });
    }

    console.log("🔴 Sending server error response");
    res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req, res) => {
  console.log("🔵 Login request started at:", new Date().toISOString());
  console.log("🔵 Request body:", {
    email: req.body.email,
    passwordLength: req.body.password?.length,
  });

  try {
    const { email, password } = req.body;

    console.log("🔵 Finding user with email:", email);
    const startUserFind = Date.now();
    const user = await User.findOne({ email });
    console.log("🔵 User find completed in:", Date.now() - startUserFind, "ms");

    if (!user) {
      console.log("🔴 User not found");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log("🔵 Comparing password...");
    const startPasswordCheck = Date.now();
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(
      "🔵 Password comparison completed in:",
      Date.now() - startPasswordCheck,
      "ms"
    );

    if (!isMatch) {
      console.log("🔴 Password does not match");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log("🔵 Generating JWT token...");
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    console.log("🟢 Login successful for user:", user._id);
    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        profilePic:user.profilePic,
      },
    });
    console.log(
      "🟢 Login completed successfully at:",
      new Date().toISOString()
    );
  } catch (err) {
    console.error("🔴 Login error occurred:", err);
    console.error("🔴 Error stack:", err.stack);
    res.status(500).json({ message: "Server error" });
  }
};

export const logout = async (req, res) => {
  console.log("🔵 Logout request started at:", new Date().toISOString());

  try {
    console.log("🟢 Logout successful - client should clear local storage");
    res.status(200).json({
      message: "Logged out successfully",
      success: true,
    });
    console.log(
      "🟢 Logout completed successfully at:",
      new Date().toISOString()
    );
  } catch (err) {
    console.error("🔴 Logout error occurred:", err);
    console.error("🔴 Error stack:", err.stack);
    res.status(500).json({ message: "Server error" });
  }
};

export const editUser = async (req, res) => {
  console.log("🔵 Edit user request started at:", new Date().toISOString());
  console.log("🔵 Request body:", req.body);
  console.log("🔵 User ID from token:", req.user.id);

  try {
    const {
      name,
      email,
      phone,
      city,
      currentPassword,
      newPassword,
      profilePic,
    } = req.body;
    const userId = req.user.id;

    console.log("🔵 Extracted fields:", {
      name,
      email,
      phone,
      city,
      hasCurrentPassword: !!currentPassword,
      hasNewPassword: !!newPassword,
    });

    // Find the user
    console.log("🔵 Finding user with ID:", userId);
    const startUserFind = Date.now();
    const user = await User.findById(userId);
    console.log("🔵 User find completed in:", Date.now() - startUserFind, "ms");

    if (!user) {
      console.log("🔴 User not found");
      return res.status(404).json({ message: "User not found" });
    }

    // If email is being changed, check if new email already exists
    if (email && email !== user.email) {
      console.log("🔵 Checking if new email already exists:", email);
      const startEmailCheck = Date.now();
      const existingUser = await User.findOne({ email });
      console.log(
        "🔵 Email check completed in:",
        Date.now() - startEmailCheck,
        "ms"
      );

      if (existingUser) {
        console.log("🔴 Email already exists");
        return res.status(400).json({ message: "Email already exists" });
      }
    }

    // Prepare update object
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (city) updateData.city = city;
    if (profilePic) updateData.profilePic = profilePic;

    // Handle password change
    if (newPassword) {
      if (!currentPassword) {
        console.log("🔴 Current password required for password change");
        return res.status(400).json({
          message: "Current password is required to change password",
        });
      }

      console.log("🔵 Verifying current password...");
      const startPasswordCheck = Date.now();
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );
      console.log(
        "🔵 Current password verification completed in:",
        Date.now() - startPasswordCheck,
        "ms"
      );

      if (!isCurrentPasswordValid) {
        console.log("🔴 Current password is invalid");
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      console.log("🔵 Hashing new password...");
      const startNewPasswordHash = Date.now();
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      console.log(
        "🔵 New password hashed in:",
        Date.now() - startNewPasswordHash,
        "ms"
      );

      updateData.password = hashedNewPassword;
    }

    // Update user
    console.log("🔵 Updating user in database...");
    const startUpdate = Date.now();
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });
    console.log("🔵 User updated in:", Date.now() - startUpdate, "ms");
    console.log("🟢 User updated successfully");

    // Return updated user data (excluding password)
    const userResponse = {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      city: updatedUser.city,
      profilePic:updatedUser.profilePic
    };

    console.log("🟢 Sending updated user data");
    res.status(200).json({
      message: "User updated successfully",
      user: userResponse,
    });
    console.log(
      "🟢 Edit user completed successfully at:",
      new Date().toISOString()
    );
  } catch (err) {
    console.error("🔴 Edit user error occurred:", err);
    console.error("🔴 Error stack:", err.stack);

    // Handle validation errors
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((error) => error.message);
      console.log("🔴 Validation errors:", errors);
      return res.status(400).json({ message: errors.join(", ") });
    }

    console.log("🔴 Sending server error response");
    res.status(500).json({ message: "Server error" });
  }
};
