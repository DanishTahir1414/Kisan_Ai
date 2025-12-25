import Post from "../models/post.model.js";
import User from "../models/user.model.js";

// Create a new post
export const createPost = async (req, res) => {
  console.log("🔵 Create post request started at:", new Date().toISOString());
  console.log("🔵 Request body:", req.body);
  console.log("🔵 User ID:", req.user._id);

  try {
    const { text, image } = req.body;

    // Validate required fields
    if (!text || !text.trim()) {
      return res.status(400).json({ 
        message: "Post text is required" 
      });
    }

    console.log("🔵 Creating post in database...");
    const startCreate = Date.now();
    
    const post = await Post.create({
      text: text.trim(),
      image: image || null,
      author: req.user._id,
    });

    console.log("🔵 Post created in:", Date.now() - startCreate, "ms");

    // Populate author info
    await post.populate('author', 'name email');

    console.log("🟢 Post created successfully with ID:", post._id);
    res.status(201).json({
      message: "Post created successfully",
      post,
    });
  } catch (err) {
    console.error("🔴 Create post error:", err);
    
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((error) => error.message);
      return res.status(400).json({ message: errors.join(", ") });
    }
    
    res.status(500).json({ message: "Server error" });
  }
};

// Get all posts with pagination
export const getPosts = async (req, res) => {
  console.log("🔵 Get posts request started at:", new Date().toISOString());
  
  try {
    const { 
      page = 1, 
      limit = 10, 
      userId,
      status = 'active'
    } = req.query;

    console.log("🔵 Query parameters:", { page, limit, userId, status });

    // Build filter object
    const filter = { status };
    
    if (userId) filter.author = userId;

    console.log("🔵 Filter object:", filter);

    const startQuery = Date.now();
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get posts with pagination
    const posts = await Post.find(filter)
      .populate('author', 'name email')
      .populate('comments.author', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Post.countDocuments(filter);

    console.log("🔵 Query completed in:", Date.now() - startQuery, "ms");
    console.log("🟢 Found", posts.length, "posts out of", total, "total");

    res.status(200).json({
      posts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error("🔴 Get posts error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get a single post by ID
export const getPostById = async (req, res) => {
  console.log("🔵 Get post by ID request:", req.params.id);
  
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'name email')
      .populate('comments.author', 'name email');

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    console.log("🟢 Post found:", post._id);
    res.status(200).json({ post });
  } catch (err) {
    console.error("🔴 Get post by ID error:", err);
    
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    
    res.status(500).json({ message: "Server error" });
  }
};

// Update a post (only by author)
export const updatePost = async (req, res) => {
  console.log("🔵 Update post request:", req.params.id);
  console.log("🔵 Update data:", req.body);
  console.log("🔵 User ID:", req.user._id);

  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user is the author
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: "Access denied. You can only update your own posts" 
      });
    }

    console.log("🔵 User authorized to update post");

    const updateData = {};
    const allowedFields = ['text', 'image', 'status'];
    
    // Only update provided fields
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    console.log("🔵 Fields to update:", Object.keys(updateData));

    const startUpdate = Date.now();
    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'name email')
     .populate('comments.author', 'name email');

    console.log("🔵 Post updated in:", Date.now() - startUpdate, "ms");
    console.log("🟢 Post updated successfully");

    res.status(200).json({
      message: "Post updated successfully",
      post: updatedPost,
    });
  } catch (err) {
    console.error("🔴 Update post error:", err);
    
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((error) => error.message);
      return res.status(400).json({ message: errors.join(", ") });
    }
    
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a post (only by author)
export const deletePost = async (req, res) => {
  console.log("🔵 Delete post request:", req.params.id);
  console.log("🔵 User ID:", req.user._id);

  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user is the author
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: "Access denied. You can only delete your own posts" 
      });
    }

    console.log("🔵 User authorized to delete post");

    const startDelete = Date.now();
    await Post.findByIdAndDelete(req.params.id);
    console.log("🔵 Post deleted in:", Date.now() - startDelete, "ms");

    console.log("🟢 Post deleted successfully");
    res.status(200).json({
      message: "Post deleted successfully",
    });
  } catch (err) {
    console.error("🔴 Delete post error:", err);
    
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    
    res.status(500).json({ message: "Server error" });
  }
};

// Like/Unlike a post
export const toggleLike = async (req, res) => {
  console.log("🔵 Toggle like request:", req.params.id);
  console.log("🔵 User ID:", req.user._id);

  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const userId = req.user._id;
    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      // Remove like
      post.likes = post.likes.filter(id => id.toString() !== userId.toString());
      console.log("🔵 Like removed");
    } else {
      // Add like
      post.likes.push(userId);
      console.log("🔵 Like added");
    }

    await post.save();
    await post.populate('author', 'name email');
    await post.populate('comments.author', 'name email');

    console.log("🟢 Like toggled successfully");
    res.status(200).json({
      message: isLiked ? "Post unliked" : "Post liked",
      post,
      isLiked: !isLiked,
    });
  } catch (err) {
    console.error("🔴 Toggle like error:", err);
    
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    
    res.status(500).json({ message: "Server error" });
  }
};

// Add a comment to a post
export const addComment = async (req, res) => {
  console.log("🔵 Add comment request:", req.params.id);
  console.log("🔵 Comment data:", req.body);
  console.log("🔵 User ID:", req.user._id);

  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const newComment = {
      text: text.trim(),
      author: req.user._id,
    };

    post.comments.push(newComment);
    await post.save();
    
    // Populate the post with author and comment author info
    await post.populate('author', 'name email');
    await post.populate('comments.author', 'name email');

    // Get the newly added comment
    const addedComment = post.comments[post.comments.length - 1];

    console.log("🟢 Comment added successfully");
    res.status(201).json({
      message: "Comment added successfully",
      comment: addedComment,
      post,
    });
  } catch (err) {
    console.error("🔴 Add comment error:", err);
    
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((error) => error.message);
      return res.status(400).json({ message: errors.join(", ") });
    }
    
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a comment (only by comment author or post author)
export const editComment = async (req, res) => {
  console.log("🔵 Edit comment request:", req.params.id, req.params.commentId);
  console.log("🔵 Comment data:", req.body);
  console.log("🔵 User ID:", req.user._id);

  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if user is the comment author or post author
    const isCommentAuthor = comment.author.toString() === req.user._id.toString();
    const isPostAuthor = post.author.toString() === req.user._id.toString();

    if (!isCommentAuthor && !isPostAuthor) {
      return res.status(403).json({ 
        message: "Access denied. You can only edit your own comments or comments on your posts" 
      });
    }

    console.log("🔵 User authorized to edit comment");

    // Update comment text
    comment.text = text.trim();
    comment.updatedAt = new Date();

    await post.save();
    await post.populate('author', 'name email');
    await post.populate('comments.author', 'name email');

    console.log("🟢 Comment edited successfully");
    res.status(200).json({
      message: "Comment edited successfully",
      post,
    });
  } catch (err) {
    console.error("🔴 Edit comment error:", err);
    
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((error) => error.message);
      return res.status(400).json({ message: errors.join(", ") });
    }
    
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid post or comment ID" });
    }
    
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a comment (only by comment author or post author)
export const deleteComment = async (req, res) => {
  console.log("🔵 Delete comment request:", req.params.id, req.params.commentId);
  console.log("🔵 User ID:", req.user._id);

  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = post.comments.find(
      (c) => c._id.toString() === req.params.commentId
    );

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const isCommentAuthor = comment.author.toString() === req.user._id.toString();
    const isPostAuthor = post.author.toString() === req.user._id.toString();

    if (!isCommentAuthor && !isPostAuthor) {
      return res.status(403).json({
        message: "Access denied. You can only delete your own comments or comments on your posts",
      });
    }

    // Remove the comment by filtering
    post.comments = post.comments.filter(
      (c) => c._id.toString() !== req.params.commentId
    );

    await post.save();

    await post.populate('author', 'name email');
    await post.populate('comments.author', 'name email');

    console.log("🟢 Comment deleted successfully");
    res.status(200).json({
      message: "Comment deleted successfully",
      post,
    });
  } catch (err) {
    console.error("🔴 Delete comment error:", err);

    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid post or comment ID" });
    }

    res.status(500).json({ message: "Server error" });
  }
};



// Get user's own posts
export const getUserPosts = async (req, res) => {
  console.log("🔵 Get user posts request for user:", req.user._id);

  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const filter = { author: req.user._id };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    
    const startQuery = Date.now();
    const posts = await Post.find(filter)
      .populate('author', 'name email')
      .populate('comments.author', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Post.countDocuments(filter);
    console.log("🔵 User posts query completed in:", Date.now() - startQuery, "ms");

    console.log("🟢 Found", posts.length, "posts for user");

    res.status(200).json({
      posts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error("🔴 Get user posts error:", err);
    res.status(500).json({ message: "Server error" });
  }
};