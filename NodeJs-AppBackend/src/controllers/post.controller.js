import Post from "../models/post.model.js";

export const createPost = async (req, res) => {
  try {
    const { postTitle, postDescription, images } = req.body;
    const userId = req.user._id;

    const newPost = new Post({
      postTitle,
      postDescription,
      user: userId,
      images: images || [],
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (err) {
    res.status(500).json({ error: "Failed to create post" });
  }
};

export const editPost = async (req, res) => {
  try {
    const { postId, postTitle, postDescription, images } = req.body;

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { postTitle, postDescription, images },
      { new: true }
    );

    if (!updatedPost) return res.status(404).json({ error: "Post not found" });

    res.status(200).json(updatedPost);
  } catch (err) {
    res.status(500).json({ error: "Failed to update post" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { postId } = req.body;

    const deleted = await Post.findByIdAndDelete(postId);
    if (!deleted) return res.status(404).json({ error: "Post not found" });

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete post" });
  }
};

export const getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("user", "name email")
      .populate("comments");

    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
};
