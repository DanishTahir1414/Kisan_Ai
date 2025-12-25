import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { CustomText, Heading } from "../components/customText";

// API Configuration
// Change this to your computer's IP address for mobile testing
const API_BASE_URL = Platform.OS === 'android' 
  ? "http://192.168.18.226:3000/api"  //YOUR COMPUTER'S IP ADDRESS HERE
  : "http://192.168.18.226:3000/api";  //YOUR COMPUTER'S IP ADDRESS HERE

interface Comment {
  _id?: string;
  id?: string;
  userId?: string;
  text: string;
  author: {
    _id: string;
    id?: string;
    name: string;
    email?: string;
  };
  name?: string;
  avatar?: string;
  timestamp?: Date;
  createdAt?: string;
}

interface Post {
  _id?: string;
  id?: string;
  text: string;
  image?: string | null;
  author?: {
    _id: string;
    id?: string;
    name: string;
    email?: string;
  };
  name?: string;
  avatar?: string;
  timestamp?: Date;
  createdAt?: string;
  likes?: any[];
  likeCount?: number;
  comments: Comment[];
  commentCount: number;
  status?: string;
}

interface UserData {
  profilePic?: string;
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
}

const timeAgo = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

const CommunityScreen = ({ onPost }: { onPost?: (newPost: Post) => void }) => {
  const [commentText, setCommentText] = useState<string>("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [commenting, setCommenting] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(Date.now());

  useEffect(() => {
    loadCurrentUser();
    fetchPosts();
  }, []);

  // Listen for new posts and refresh more frequently
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !refreshing) {
        const now = Date.now();
        if (now - lastFetchTime > 5000) {
          fetchPosts();
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [loading, refreshing, lastFetchTime]);

  const handleNewPost = (newPost: Post) => {
    setPosts(prevPosts => [newPost, ...prevPosts]);
    setTimeout(() => {
      fetchPosts();
    }, 1000);
  };

  useEffect(() => {
    if (onPost) {
      (onPost as any).forceRefresh = forceRefresh;
    }
  }, [onPost]);

  const getUserId = (user: any): string | null => {
    return user?.id || user?._id || null;
  };

  const getPostId = (post: Post): string => {
    return post._id || post.id || "";
  };

  const loadCurrentUser = async () => {
    try {
      const userDataString = await AsyncStorage.getItem("userData");
      if (userDataString) {
        const userData: UserData = JSON.parse(userDataString);
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const getAuthToken = async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem("authToken");
    } catch (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      console.log("🔵 Fetching posts...");
      const response = await fetch(`${API_BASE_URL}/community/posts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      console.log("🔵 Posts response:", data);

      if (response.ok) {
        setPosts(data.posts || []);
        setLastFetchTime(Date.now());
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: data.message || "Failed to fetch posts",
        });
      }
    } catch (error: any) {
      console.error("🔴 Fetch posts error:", error);
      Toast.show({
        type: "error",
        text1: "Network Error",
        text2: "Unable to fetch posts. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const forceRefresh = () => {
    console.log("🔵 Force refreshing posts...");
    fetchPosts();
  };

  const handleLike = async (postId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        Toast.show({
          type: "error",
          text1: "Authentication Error",
          text2: "Please login to like posts",
        });
        return;
      }

      console.log("🔵 Toggling like for post:", postId);
      const response = await fetch(`${API_BASE_URL}/community/posts/${postId}/like`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setPosts(posts.map(post => 
          getPostId(post) === postId ? {
            ...post,
            likes: data.post.likes,
            likeCount: data.post.likeCount
          } : post
        ));
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: data.message || "Failed to toggle like",
        });
      }
    } catch (error: any) {
      console.error("🔴 Like error:", error);
      Toast.show({
        type: "error",
        text1: "Network Error",
        text2: "Unable to like post. Please try again.",
      });
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || !selectedPostId) return;

    setCommenting(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        Toast.show({
          type: "error",
          text1: "Authentication Error",
          text2: "Please login to comment",
        });
        return;
      }

      console.log("🔵 Adding/Editing comment:", commentText, "to post:", selectedPostId);
      const url = editingCommentId 
        ? `${API_BASE_URL}/community/posts/${selectedPostId}/comments/${editingCommentId}`
        : `${API_BASE_URL}/community/posts/${selectedPostId}/comments`;
      const method = editingCommentId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: commentText.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPosts(posts.map(post => 
          getPostId(post) === selectedPostId ? {
            ...post,
            comments: data.post.comments,
            commentCount: data.post.commentCount
          } : post
        ));
        setCommentText("");
        setEditingCommentId(null);
        Toast.show({
          type: "success",
          text1: "Success",
          text2: editingCommentId ? "Comment updated successfully" : "Comment added successfully",
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: data.message || `Failed to ${editingCommentId ? 'update' : 'add'} comment`,
        });
      }
    } catch (error: any) {
      console.error("🔴 Comment error:", error);
      Toast.show({
        type: "error",
        text1: "Network Error",
        text2: `Unable to ${editingCommentId ? 'update' : 'add'} comment. Please try again.`,
      });
    } finally {
      setCommenting(false);
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment._id || comment.id || "");
    setCommentText(comment.text);
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => performDeleteComment(postId, commentId)
        },
      ]
    );
  };

  const performDeleteComment = async (postId: string, commentId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        Toast.show({
          type: "error",
          text1: "Authentication Error",
          text2: "Please login to delete comment",
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/community/posts/${postId}/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setPosts(posts.map(post => 
          getPostId(post) === postId ? {
            ...post,
            comments: data.post.comments,
            commentCount: data.post.commentCount
          } : post
        ));
        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Comment deleted successfully",
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: data.message || "Failed to delete comment",
        });
      }
    } catch (error: any) {
      console.error("🔴 Delete comment error:", error);
      Toast.show({
        type: "error",
        text1: "Network Error",
        text2: "Unable to delete comment. Please try again.",
      });
    }
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => performDeletePost(postId)
        },
      ]
    );
  };

  const performDeletePost = async (postId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        Toast.show({
          type: "error",
          text1: "Authentication Error",
          text2: "Please login to delete post",
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/community/posts/${postId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setPosts(posts.filter(post => getPostId(post) !== postId));
        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Post deleted successfully",
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: data.message || "Failed to delete post",
        });
      }
    } catch (error: any) {
      console.error("🔴 Delete post error:", error);
      Toast.show({
        type: "error",
        text1: "Network Error",
        text2: "Unable to delete post. Please try again.",
      });
    }
  };

  const isUserPost = (post: Post): boolean => {
    const postAuthorId = post.author?._id || post.author?.id;
    const currentUserId = getUserId(currentUser);
    return !!currentUser && postAuthorId === currentUserId;
  };

  const isPostLikedByUser = (post: Post): boolean => {
    const currentUserId = getUserId(currentUser);
    return !!currentUser && !!post.likes && !!currentUserId && post.likes.includes(currentUserId);
  };

  const openCommentModal = (postId: string) => {
    console.log("Opening modal for post:", postId);
    setSelectedPostId(postId);
    setModalVisible(true);
    setEditingCommentId(null);
    setCommentText("");
  };

  const closeCommentModal = () => {
    console.log("Closing modal");
    setModalVisible(false);
    setSelectedPostId(null);
    setCommentText("");
    setEditingCommentId(null);
  };

  const renderComment = ({ item }: { item: Comment }) => {
    const isCurrentUserComment = (item.author?._id || item.author?.id) === getUserId(currentUser);
    const commentAvatar = isCurrentUserComment && currentUser?.profilePic 
      ? currentUser.profilePic 
      : item.avatar || "https://randomuser.me/api/portraits/lego/1.jpg";

    return (
      <View style={styles.commentItem}>
        <Image 
          source={{ uri: commentAvatar }} 
          style={styles.commentAvatar} 
        />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <CustomText style={styles.commentName} variant="medium">
              {item.name || item.author?.name || "Unknown User"}
            </CustomText>
            <View style={styles.commentActions}>
              <CustomText style={styles.commentTimestamp}>
                {timeAgo(item.timestamp || item.createdAt || new Date())}
              </CustomText>
              {isCurrentUserComment && (
                <View style={styles.commentButtons}>
                 
                  <TouchableOpacity
                    onPress={() => handleDeleteComment(selectedPostId!, item._id || item.id || "")}
                    style={styles.commentActionBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color="#e91e63" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          <CustomText style={styles.commentText}>{item.text}</CustomText>
        </View>
      </View>
    );
  };

  const renderPost = ({ item }: { item: Post }) => {
    const postId = getPostId(item);
    const isCurrentUserPost = isUserPost(item);
    const authorName = item.author?.name || item.name || "Unknown User";
    const avatar = isCurrentUserPost && currentUser?.profilePic 
      ? currentUser.profilePic 
      : item.avatar || "https://randomuser.me/api/portraits/lego/1.jpg";
    const timestamp = item.createdAt || item.timestamp || new Date();
    const likes = item.likeCount || item.likes?.length || 0;
    
    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <Image source={{ uri: avatar }} style={styles.avatar} />
          <View style={styles.headerContent}>
            <CustomText style={styles.postName} variant="medium">
              {authorName}
            </CustomText>
            <CustomText style={styles.timestamp}>
              {timeAgo(timestamp)}
            </CustomText>
          </View>
          {isUserPost(item) && (
            <TouchableOpacity
              onPress={() => handleDeletePost(postId)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={20} color="#e91e63" />
            </TouchableOpacity>
          )}
        </View>
        <CustomText style={styles.postText}>{item.text}</CustomText>
        {item.image && (
          <Image source={{ uri: item.image }} style={styles.postImage} />
        )}
        <View style={styles.postActions}>
          <TouchableOpacity 
            style={[
              styles.actionBtn,
              isPostLikedByUser(item) && styles.likedButton
            ]} 
            onPress={() => handleLike(postId)}
          >
            <Ionicons 
              name={isPostLikedByUser(item) ? "heart" : "heart-outline"} 
              size={22} 
              color="#e91e63" 
            />
            <CustomText style={[
              styles.actionText,
              isPostLikedByUser(item) && styles.likedText
            ]}>
              {likes}
            </CustomText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openCommentModal(postId)}
          >
            <Ionicons name="chatbubble-outline" size={22} color="#039116" />
            <CustomText style={styles.actionText}>{item.commentCount}</CustomText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const selectedPost = posts.find((post) => getPostId(post) === selectedPostId);

  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id || item.id || Math.random().toString()}
        renderItem={renderPost}
        contentContainerStyle={{ paddingBottom: 100 }}
        scrollEnabled={false}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
              <CustomText style={styles.emptyText}>No posts found</CustomText>
              <CustomText style={styles.emptySubText}>
                Be the first to share something!
              </CustomText>
            </View>
          ) : null
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeCommentModal}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 40}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Heading style={styles.modalTitle}>
                  Comments ({selectedPost ? selectedPost.commentCount : 0})
                </Heading>
                <TouchableOpacity onPress={closeCommentModal}>
                  <Ionicons name="close" size={24} color="#1F2A44" />
                </TouchableOpacity>
              </View>
              {selectedPost && selectedPost.comments.length > 0 ? (
                <FlatList
                  data={selectedPost.comments}
                  keyExtractor={(item) => item._id || item.id || Math.random().toString()}
                  renderItem={renderComment}
                  contentContainerStyle={styles.commentList}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <CustomText style={styles.noCommentsText}>
                  No comments yet.
                </CustomText>
              )}
              <View style={styles.commentInputContainer}>
                <TextInput
                  placeholder={editingCommentId ? "Edit your comment..." : "Write a comment..."}
                  value={commentText}
                  onChangeText={setCommentText}
                  style={styles.commentInput}
                  placeholderTextColor="#999"
                  editable={!commenting}
                />
                <TouchableOpacity
                  onPress={handleComment}
                  disabled={!commentText.trim() || commenting}
                >
                  <View
                    style={[
                      styles.sendBtn,
                      {
                        backgroundColor: commentText.trim() && !commenting ? "#039116" : "#D1D5DB"
                      }
                    ]}
                  >
                    <Ionicons
                      name={commenting ? "time-outline" : editingCommentId ? "checkmark" : "send"}
                      size={20}
                      color={commentText.trim() && !commenting ? "#FFFFFF" : "#9CA3AF"}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#F9FAFB",
  },
  postCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  headerContent: {
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },
  deleteButton: {
    padding: 8,
  },
  postName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
  },
  postText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: "row",
    gap: 24,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  likedButton: {
    backgroundColor: "#fce7f3",
  },
  actionText: {
    fontSize: 13,
    fontWeight: "500",
  },
  likedText: {
    color: "#e91e63",
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginTop: 16,
    fontWeight: "600",
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 300,
    maxHeight: "70%",
  },
  modalContent: {
    flex: 1,
    paddingBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  commentList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    flexGrow: 1,
  },
  commentItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
  },
  commentContent: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    padding: 10,
    borderRadius: 12,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  commentName: {
    fontSize: 14,
    fontWeight: "600",
  },
  commentTimestamp: {
    fontSize: 11,
  },
  commentText: {
    fontSize: 13,
    lineHeight: 18,
  },
  noCommentsText: {
    fontSize: 14,
    textAlign: "center",
    padding: 16,
  },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    padding: 10,
    borderRadius: 20,
    fontSize: 14,
    color: "#1F2A44",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontFamily: "RobotoRegular",
  },
  sendBtn: {
    padding: 10,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentButtons: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 8,
  },
  commentActionBtn: {
    padding: 4,
  },
});

export default CommunityScreen;