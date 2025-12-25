import Listing from "../models/marketplace.model.js";
import User from "../models/user.model.js";

// Create a new listing
export const createListing = async (req, res) => {
  console.log("🔵 Create listing request started at:", new Date().toISOString());
  console.log("🔵 Request body:", req.body);
  console.log("🔵 User ID:", req.user._id);

  try {
    const { title, description, price, image, contactNumber, location } = req.body;

    // Validate required fields
    if (!title || !description || !price || !contactNumber || !location) {
      return res.status(400).json({ 
        message: "Missing required fields" 
      });
    }

    if (!location.province || !location.city || !location.area) {
      return res.status(400).json({ 
        message: "Complete location (province, city, area) is required" 
      });
    }

    console.log("🔵 Creating listing in database...");
    const startCreate = Date.now();
    
    const listing = await Listing.create({
      title: title.trim(),
      description: description.trim(),
      price: parseFloat(price),
      image: image || null,
      contactNumber: contactNumber.trim(),
      location: {
        province: location.province.trim(),
        city: location.city.trim(),
        area: location.area.trim(),
      },
      createdBy: req.user._id,
    });

    console.log("🔵 Listing created in:", Date.now() - startCreate, "ms");

    // Populate creator info
    await listing.populate('createdBy', 'name email');

    console.log("🟢 Listing created successfully with ID:", listing._id);
    res.status(201).json({
      message: "Listing created successfully",
      listing,
    });
  } catch (err) {
    console.error("🔴 Create listing error:", err);
    
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((error) => error.message);
      return res.status(400).json({ message: errors.join(", ") });
    }
    
    res.status(500).json({ message: "Server error" });
  }
};

// Get all listings with optional filters
export const getListings = async (req, res) => {
  console.log("🔵 Get listings request started at:", new Date().toISOString());
  
  try {
    const { 
      page = 1, 
      limit = 10, 
      province, 
      city, 
      status = 'active',
      minPrice,
      maxPrice,
      search
    } = req.query;

    console.log("🔵 Query parameters:", { page, limit, province, city, status, minPrice, maxPrice, search });

    // Build filter object
    const filter = { status };
    
    if (province) filter['location.province'] = new RegExp(province, 'i');
    if (city) filter['location.city'] = new RegExp(city, 'i');
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    
    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    console.log("🔵 Filter object:", filter);

    const startQuery = Date.now();
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get listings with pagination
    const listings = await Listing.find(filter)
      .populate('createdBy', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Listing.countDocuments(filter);

    console.log("🔵 Query completed in:", Date.now() - startQuery, "ms");
    console.log("🟢 Found", listings.length, "listings out of", total, "total");

    res.status(200).json({
      listings,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalListings: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error("🔴 Get listings error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get a single listing by ID
export const getListingById = async (req, res) => {
  console.log("🔵 Get listing by ID request:", req.params.id);
  
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('createdBy', 'name email phone');

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    console.log("🟢 Listing found:", listing._id);
    res.status(200).json({ listing });
  } catch (err) {
    console.error("🔴 Get listing by ID error:", err);
    
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid listing ID" });
    }
    
    res.status(500).json({ message: "Server error" });
  }
};

// Update a listing (only by creator)
export const updateListing = async (req, res) => {
  console.log("🔵 Update listing request:", req.params.id);
  console.log("🔵 Update data:", req.body);
  console.log("🔵 User ID:", req.user._id);

  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Check if user is the creator
    if (listing.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: "Access denied. You can only update your own listings" 
      });
    }

    console.log("🔵 User authorized to update listing");

    const updateData = {};
    const allowedFields = ['title', 'description', 'price', 'image', 'contactNumber', 'location', 'status'];
    
    // Only update provided fields
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    console.log("🔵 Fields to update:", Object.keys(updateData));

    const startUpdate = Date.now();
    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email phone');

    console.log("🔵 Listing updated in:", Date.now() - startUpdate, "ms");
    console.log("🟢 Listing updated successfully");

    res.status(200).json({
      message: "Listing updated successfully",
      listing: updatedListing,
    });
  } catch (err) {
    console.error("🔴 Update listing error:", err);
    
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((error) => error.message);
      return res.status(400).json({ message: errors.join(", ") });
    }
    
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid listing ID" });
    }
    
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a listing (only by creator)
export const deleteListing = async (req, res) => {
  console.log("🔵 Delete listing request:", req.params.id);
  console.log("🔵 User ID:", req.user._id);

  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Check if user is the creator
    if (listing.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: "Access denied. You can only delete your own listings" 
      });
    }

    console.log("🔵 User authorized to delete listing");

    const startDelete = Date.now();
    await Listing.findByIdAndDelete(req.params.id);
    console.log("🔵 Listing deleted in:", Date.now() - startDelete, "ms");

    console.log("🟢 Listing deleted successfully");
    res.status(200).json({
      message: "Listing deleted successfully",
    });
  } catch (err) {
    console.error("🔴 Delete listing error:", err);
    
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid listing ID" });
    }
    
    res.status(500).json({ message: "Server error" });
  }
};

// Get user's own listings
export const getUserListings = async (req, res) => {
  console.log("🔵 Get user listings request for user:", req.user._id);

  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const filter = { createdBy: req.user._id };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    
    const startQuery = Date.now();
    const listings = await Listing.find(filter)
      .populate('createdBy', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Listing.countDocuments(filter);
    console.log("🔵 User listings query completed in:", Date.now() - startQuery, "ms");

    console.log("🟢 Found", listings.length, "listings for user");

    res.status(200).json({
      listings,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalListings: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error("🔴 Get user listings error:", err);
    res.status(500).json({ message: "Server error" });
  }
};