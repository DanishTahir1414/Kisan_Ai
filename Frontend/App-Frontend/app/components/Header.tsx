import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ImageStyle,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import Modal from "react-native-modal";
import Toast from "react-native-toast-message";
import { CustomText, Heading } from "./customText";
import { useTranslation } from "react-i18next";


// API Configuration
// Change this to your computer's IP address for mobile testing
const API_BASE_URL =
  Platform.OS === "android"
    ? "http://192.168.18.226:3000/api" //YOUR COMPUTER'S IP ADDRESS HERE
    : "http://192.168.18.226:3000/api"; //YOUR COMPUTER'S IP ADDRESS HERE

interface Post {
  id: string;
  name: string;
  avatar: string;
  image: string | null;
  text: string;
  timestamp: Date;
  likes: number;
  comments: any[];
  commentCount: number;
}

interface UserData {
  profilePic?: string;
  // Add other user data fields as needed
}

const Header = ({ onPost }: { onPost: (newPost: Post) => void }) => {
  const router = useRouter();
  const segments = useSegments();
  const { t } = useTranslation();

  type TabName =
    | "Home"
    | "Community"
    | "Marketplace"
    | "Camera"
    | "Weather"
    | "Profile";
  const currentTab = segments[segments.length - 1] as TabName;
  const tabName = [
    "Home",
    "Community",
    "Marketplace",
    "Camera",
    "Weather",
    "Profile",
  ].includes(currentTab)
    ? currentTab
    : "Home";

  const titleMap: Record<TabName, string> = {
    Home: t("tabNames.home"),
    Community: t("tabNames.community"),
    Marketplace: t("tabNames.marketplace"),
    Camera: t("tabNames.cropDiagnosis"),
    Weather: t("tabNames.weather"),
    Profile: t("tabNames.profile"),
  };

  const title = titleMap[tabName] || t("appName");

  const [modalVisible, setModalVisible] = useState(false);
  const [postText, setPostText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  // Load user avatar from AsyncStorage when on Home tab
  useEffect(() => {
    if (tabName === "Home") {
      const loadAvatar = async () => {
        try {
          const userDataString = await AsyncStorage.getItem("userData");
          if (userDataString) {
            const userData: UserData = JSON.parse(userDataString);
            if (userData.profilePic) {
              setUserAvatar(userData.profilePic);
            }
          }
        } catch (error) {
          console.error("Error loading user avatar:", error);
        }
      };
      loadAvatar();
    }
  }, [tabName]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Toast.show({
        type: "error",
        text1: t("permissions.denied"),
        text2: t("permissions.grantMediaLibraryAccess"),
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      base64: false,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  const removeImage = () => {
    setImage(null);
  };

  const handlePost = async () => {
    if (!postText.trim()) {
      Toast.show({
        type: "error",
        text1: t("post.required"),
        text2: t("post.enterText"),
      });
      return;
    }

    setIsCreatingPost(true);

    try {
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        Toast.show({
          type: "error",
          text1: t("auth.error"),
          text2: t("auth.loginToCreatePost"),
        });
        setIsCreatingPost(false);
        return;
      }

      console.log("🔵 Creating post...");
      console.log("🔵 Post text:", postText.trim());
      console.log("🔵 Image URI:", image);

      const postData = {
        text: postText.trim(),
        image: image,
      };

      console.log("🔵 Sending request to:", `${API_BASE_URL}/community/posts`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log("🔴 Request timed out");
        controller.abort();
      }, 30000);

      const response = await fetch(`${API_BASE_URL}/community/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(postData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("🔵 Response status:", response.status);
      console.log("🔵 Response headers:", response.headers);

      const data = await response.json();
      console.log("🔵 Response data:", data);

      if (response.ok) {
        const newPost: Post = {
          id: data.post._id,
          name: data.post.author.name,
          avatar: "https://randomuser.me/api/portraits/lego/1.jpg",
          image,
          text: postText,
          timestamp: new Date(data.post.createdAt),
          likes: data.post.likeCount || 0,
          commentCount: data.post.commentCount || 0,
          comments: [],
        };

        if (onPost) {
          onPost(newPost);

          if ((onPost as any).forceRefresh) {
            setTimeout(() => {
              (onPost as any).forceRefresh();
            }, 1000);
          }
        }

        setPostText("");
        setImage(null);
        setModalVisible(false);

        Toast.show({
          type: "success",
          text1: t("post.created"),
          text2: t("post.successMessage"),
        });
      } else {
        console.log("🔴 Server responded with error:", data);
        Toast.show({
          type: "error",
          text1: t("error.generic"),
          text2: data.message || `Server error: ${response.status}`,
        });
      }
    } catch (error: any) {
      console.error("🔴 Create post error:", error);

      if (error.name === "AbortError") {
        Toast.show({
          type: "error",
          text1: t("error.timeout"),
          text2: t("error.requestTimedOut"),
        });
      } else if (
        error.message &&
        error.message.includes("Network request failed")
      ) {
        Toast.show({
          type: "error",
          text1: t("error.network"),
          text2: t("error.cannotConnect"),
        });
      } else {
        Toast.show({
          type: "error",
          text1: t("error.network"),
          text2: t("error.unableToCreatePost"),
        });
      }
    } finally {
      setIsCreatingPost(false);
    }
  };

  const handleBackPress = () => {
    router.push("/(tab)/Home");
  };

  const handleAddPress = () => {
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setPostText("");
    setImage(null);
  };

  const handleLogout = async () => {
    Alert.alert(
      t("logout.title"),
      t("logout.message"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("common.confirm"),
          onPress: () => performLogout(),
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  const performLogout = async () => {
    setIsLoggingOut(true);

    try {
      console.log("🔵 Starting logout process...");

      const token = await AsyncStorage.getItem("authToken");

      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      const data = await response.json();
      console.log("🔵 Logout API response:", data);

      if (response.ok) {
        await AsyncStorage.multiRemove(["authToken", "userData"]);
        console.log("🟢 Local storage cleared");

        router.replace("/");

        Toast.show({
          type: "success",
          text1: t("logout.success"),
          text2: t("logout.loggedOutMessage"),
        });
      } else {
        await AsyncStorage.multiRemove(["authToken", "userData"]);
        console.log("🟡 API failed but local storage cleared for security");

        router.replace("/");
        Toast.show({
          type: "success",
          text1: t("logout.loggedOut"),
          text2: t("logout.loggedOutMessage"),
        });
      }
    } catch (error: any) {
      console.error("🔴 Logout error:", error);

      try {
        await AsyncStorage.multiRemove(["authToken", "userData"]);
        console.log("🟡 Local storage cleared despite API error");
        router.replace("/");
        Toast.show({
          type: "success",
          text1: t("logout.loggedOut"),
          text2: t("logout.loggedOutMessage"),
        });
      } catch (storageError) {
        console.error("🔴 Failed to clear storage:", storageError);
        Toast.show({
          type: "error",
          text1: t("error.generic"),
          text2: t("error.failedToLogout"),
        });
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  // NotificationBell component for irrigation alerts (basic, no badge, no clear/manage)
  const NotificationBell = () => {
    const [visible, setVisible] = useState(false);
    const [alerts, setAlerts] = useState<{ message: string; timestamp: string }[]>([]);

    // Fetch alerts
    const fetchAlerts = async () => {
      try {
        const existing = await AsyncStorage.getItem("irrigationAlerts");
        setAlerts(existing ? JSON.parse(existing) : []);
      } catch (error) {
        setAlerts([]);
      }
    };

    const toggleDropdown = async () => {
      if (!visible) await fetchAlerts();
      setVisible(!visible);
    };

    return (
      <View>
        <TouchableOpacity onPress={toggleDropdown} style={{ marginRight: 12 }}>
          <MaterialCommunityIcons name="bell-outline" size={26} color="#039116" />
        </TouchableOpacity>
        {visible && (
          <View style={{ position: "absolute", top: 36, right: 0, backgroundColor: "#fff", borderRadius: 8, elevation: 4, minWidth: 220, zIndex: 999 }}>
            <CustomText style={{ fontWeight: "bold", fontSize: 16, margin: 8 }}>{t("notifications.title")}</CustomText>
            {alerts.length === 0 ? (
              <CustomText style={{ margin: 8 }}>{t("notifications.noAlerts")}</CustomText>
            ) : (
              alerts.slice(0, 5).map((alert, idx) => (
                <View key={idx} style={{ borderBottomWidth: idx < alerts.length - 1 ? 1 : 0, borderBottomColor: "#eee", padding: 8 }}>
                  <CustomText style={{ fontSize: 14 }}>{alert.message}</CustomText>
                  <CustomText style={{ fontSize: 12, color: "#888" }}>{new Date(alert.timestamp).toLocaleString()}</CustomText>
                </View>
              ))
            )}
            <TouchableOpacity onPress={() => setVisible(false)} style={{ padding: 8, alignItems: "center" }}>
              <CustomText style={{ color: "#039116", fontWeight: "bold" }}>{t("common.close")}</CustomText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.leftContainer}>
          {tabName === "Home" ? (
            <>
              {userAvatar ? (
                <Image source={{ uri: userAvatar }} style={styles.avatar} />
              ) : (
                <Ionicons
                  name="person-circle-outline"
                  size={32}
                  color="black"
                />
              )}
            </>
          ) : (
            <TouchableOpacity style={styles.backIcon} onPress={handleBackPress}>
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.titleContainer}>
          <CustomText style={styles.title}>{title}</CustomText>
        </View>

        <View style={styles.iconContainer}>
          {/* Notification Bell Icon - always visible */}
          <NotificationBell />
          {tabName === "Community" && (
            <TouchableOpacity
              style={styles.addIcon}
              onPress={handleAddPress}
              disabled={isCreatingPost}
            >
              <Ionicons
                name="add"
                size={24}
                color={isCreatingPost ? "gray" : "black"}
              />
            </TouchableOpacity>
          )}
          {tabName === "Home" && (
            <TouchableOpacity onPress={handleLogout} disabled={isLoggingOut}>
              <Ionicons
                name="log-out-outline"
                size={24}
                color={isLoggingOut ? "gray" : "black"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal
        isVisible={modalVisible}
        onBackdropPress={closeModal}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        animationInTiming={300}
        animationOutTiming={300}
        backdropTransitionOutTiming={0}
        style={styles.modal}
      >
        <View style={styles.modalContainer}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Heading style={styles.modalTitle}>{t("post.createPost")}</Heading>
                <TouchableOpacity onPress={closeModal}>
                  <Ionicons name="close" size={24} color="#1F2A44" />
                </TouchableOpacity>
              </View>
              <TextInput
                placeholder={t("post.whatsOnYourMind")}
                value={postText}
                onChangeText={setPostText}
                style={styles.input}
                multiline
                placeholderTextColor="#999"
                textAlignVertical="top"
                editable={!isCreatingPost}
              />
              {image && (
                <View style={styles.imageContainer}>
                  <Image source={{ uri: image }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={removeImage}
                    disabled={isCreatingPost}
                  >
                    <Ionicons name="close-circle" size={24} color="#e91e63" />
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[
                    styles.imageBtn,
                    isCreatingPost && styles.disabledBtn,
                  ]}
                  onPress={pickImage}
                  disabled={isCreatingPost}
                >
                  <Ionicons name="image-outline" size={20} color="#039116" />
                  <CustomText style={styles.imageBtnText}>{t("post.addImage")}</CustomText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handlePost}
                  disabled={!postText.trim() || isCreatingPost}
                >
                  <LinearGradient
                    colors={
                      postText.trim() && !isCreatingPost
                        ? ["#039116", "#06D001"]
                        : ["#D1D5DB", "#D1D5DB"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.postBtn}
                  >
                    <CustomText style={styles.postBtnText}>
                      {isCreatingPost ? t("post.posting") : t("post.post")}
                    </CustomText>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    height: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  } as ViewStyle,
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    minWidth: 48, // Minimum width to accommodate avatar or icon
    paddingRight: 8, // Add padding to ensure spacing from title
  } as ViewStyle,
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    resizeMode: "cover",
  } as ImageStyle,
  iconContainer: {
    minWidth: 48, // Minimum width to balance with left container
    height: 40,
    justifyContent: "flex-end",
    alignItems: "center",
    flexDirection: "row",
    paddingLeft: 8, // Add padding to ensure spacing from title
    gap: 8,
  } as ViewStyle,
  backIcon: {
    position: "absolute",
    left: 2,
    minWidth: 48, // Minimum width to balance with left container
    height: 40,
    marginTop: 15,
  } as ViewStyle,
  addIcon: {
    marginRight: 8,
  } as ViewStyle,
  titleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "black",
    textTransform: "capitalize",
    textAlign: "center",
  } as TextStyle,
  modal: {
    margin: 0,
    justifyContent: "flex-end",
  } as ViewStyle,
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    justifyContent: "flex-end",
  } as ViewStyle,
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  } as ViewStyle,
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  } as ViewStyle,
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  } as ViewStyle,
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "LatoBold",
  } as TextStyle,
  input: {
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 12,
    minHeight: 120,
    fontSize: 16,
    color: "#1F2A44",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontFamily: "RobotoRegular",
  } as TextStyle,
  imageContainer: {
    position: "relative",
    marginBottom: 16,
  } as ViewStyle,
  previewImage: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    resizeMode: "cover",
  } as ImageStyle,
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 12,
    padding: 2,
  } as ViewStyle,
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
  } as ViewStyle,
  imageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  } as ViewStyle,
  disabledBtn: {
    opacity: 0.6,
  } as ViewStyle,
  imageBtnText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "RobotoMedium",
  } as TextStyle,
  postBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 100,
  } as ViewStyle,
  postBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "RobotoMedium",
  } as TextStyle,
});

export default Header;
