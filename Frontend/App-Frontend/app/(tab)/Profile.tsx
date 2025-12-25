import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { CustomText } from "../components/customText";
import { Picker } from "@react-native-picker/picker";
import { useTranslation } from "react-i18next";
import i18next from "i18next";


// Change this to your computer's IP address for mobile testing
const API_BASE_URL =
  Platform.OS === "android"
    ? "http://192.168.18.226:3000/api" //YOUR COMPUTER'S IP ADDRESS HERE
    : "http://192.168.18.226:3000/api"; //YOUR COMPUTER'S IP ADDRESS HERE

interface UserData {
  name: string;
  email: string;
  phone: string;
  city: string;
  profilePic: string;
  password?: string;
}

const ProfileScreen = () => {
  const { t } = useTranslation();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [language, setLanguage] = useState(i18next.language);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDataString = await AsyncStorage.getItem("userData");
        if (userDataString) {
          const parsedData: UserData = JSON.parse(userDataString);
          setUserData(parsedData);
          setFullName(parsedData.name || "");
          setEmail(parsedData.email || "");
          setPhone(parsedData.phone || "");
          setCity(parsedData.city || "");
          setProfilePic(parsedData.profilePic || "");
        } else {
          Toast.show({
            type: "error",
            text1: "Error",
            text2: "No user data found. Please log in again.",
          });
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to load user data.",
        });
      }
    };

    fetchUserData();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Toast.show({
        type: "error",
        text1: "Permission Denied",
        text2: "Camera roll access is needed to upload profile picture.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setProfilePic(base64Img);
    }
  };

  const handleUpdate = async () => {
    if (!fullName || !email || !phone || !city) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please fill in all required fields",
      });
      return;
    }

    if (!email.includes("@")) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please enter a valid email address",
      });
      return;
    }

    if (password && password.length < 6) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Password must be at least 6 characters long",
      });
      return;
    }

    if (password && password !== confirmPassword) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Passwords don't match",
      });
      return;
    }

    setIsUpdating(true);

    try {
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        Toast.show({
          type: "error",
          text1: "Authentication Error",
          text2: "Please log in again",
        });
        setIsUpdating(false);
        return;
      }

      const updateData: UserData = {
        name: fullName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        city: city.trim(),
        profilePic,
      };
      if (password) {
        updateData.password = password;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_BASE_URL}/auth/edit-user`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const textResponse = await response.text();
        data = { message: textResponse || "Server error" };
      }

      if (response.ok) {
        await AsyncStorage.setItem("userData", JSON.stringify(data.user || updateData));
        setUserData(data.user || updateData);
        setPassword("");
        setConfirmPassword("");
        setIsEditing(false);
        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Profile updated successfully",
        }); // Success toast added here
      } else {
        Toast.show({
          type: "error",
          text1: "Update Failed",
          text2: data.message || `Server error (${response.status})`,
        });
      }
    } catch (error: any) {
      console.error("Update error:", error);
      if (error.name === "AbortError") {
        Toast.show({
          type: "error",
          text1: "Timeout Error",
          text2: "Request timed out. Please check your connection and try again.",
        });
      } else if (error.message && error.message.includes("Network request failed")) {
        Toast.show({
          type: "error",
          text1: "Connection Error",
          text2: "Cannot connect to server. Please check your connection.",
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: error?.message || "An unexpected error occurred",
        });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const changeLanguage = async (lang: string) => {
    i18next.changeLanguage(lang);
    setLanguage(lang);
    try {
      await AsyncStorage.setItem("appLanguage", lang);
    } catch (error) {
      console.error("Failed to save language preference:", error);
    }
  };

  useEffect(() => {
    const loadLanguagePreference = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem("appLanguage");
        if (savedLanguage) {
          i18next.changeLanguage(savedLanguage);
          setLanguage(savedLanguage);
        }
      } catch (error) {
        console.error("Failed to load language preference:", error);
      }
    };

    loadLanguagePreference();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headingContent}>
        <CustomText style={styles.headerSubtitle}>
          {t('profile.view_update_info')}
        </CustomText>
      </View>
      <View style={styles.languageSelectorContainer}>
        <CustomText style={styles.languageLabel}>{t('profile.select_language')}</CustomText>
        <Picker
          selectedValue={language}
          onValueChange={(itemValue) => changeLanguage(itemValue)}
          style={styles.languagePicker}
        >
          <Picker.Item label={t('profile.language_english')} value="en" />
          <Picker.Item label={t('profile.language_urdu')} value="ur" />
        </Picker>
      </View>
      <View style={styles.content}>
        {userData ? (
          <>
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              {profilePic ? (
                <Image
                  source={{ uri: profilePic }}
                  style={{ width: 100, height: 100, borderRadius: 50 }}
                />
              ) : (
                <View
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: "#ccc",
                  }}
                />
              )}
              {isEditing && (
                <TouchableOpacity onPress={pickImage}>
                  <CustomText style={{ color: "#036D1A", marginTop: 10 }}>
                    {profilePic ? t('profile.change_picture') : t('profile.upload_picture')}
                  </CustomText>
                </TouchableOpacity>
              )}
            </View>

            {/* Name and rest of the fields */}
            <View style={styles.fieldContainer}>
              <CustomText style={styles.label}>{t('profile.full_name')}</CustomText>
              <TextInput
                style={[styles.input, !isEditing && styles.disabledInput]}
                value={fullName}
                onChangeText={setFullName}
                editable={isEditing}
                placeholder={t('profile.enter_full_name')}
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.fieldContainer}>
              <CustomText style={styles.label}>{t('profile.email')}</CustomText>
              <TextInput
                style={[styles.input, !isEditing && styles.disabledInput]}
                value={email}
                onChangeText={setEmail}
                editable={isEditing}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder={t('profile.enter_email')}
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.fieldContainer}>
              <CustomText style={styles.label}>{t('profile.phone_number')}</CustomText>
              <TextInput
                style={[styles.input, !isEditing && styles.disabledInput]}
                value={phone}
                onChangeText={setPhone}
                editable={isEditing}
                keyboardType="phone-pad"
                placeholder={t('profile.enter_phone_number')}
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.fieldContainer}>
              <CustomText style={styles.label}>{t('profile.city')}</CustomText>
              <TextInput
                style={[styles.input, !isEditing && styles.disabledInput]}
                value={city}
                onChangeText={setCity}
                editable={isEditing}
                placeholder={t('profile.enter_city')}
                placeholderTextColor="#999"
              />
            </View>
            {isEditing && (
              <>
                <View style={styles.fieldContainer}>
                  <CustomText style={styles.label}>{t('profile.new_password')} (optional)</CustomText>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder={t('profile.enter_new_password')}
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.fieldContainer}>
                  <CustomText style={styles.label}>{t('profile.confirm_new_password')}</CustomText>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    placeholder={t('profile.confirm_new_password_placeholder')}
                    placeholderTextColor="#999"
                  />
                </View>
              </>
            )}
            <TouchableOpacity
              style={[styles.button, isUpdating && styles.buttonDisabled]}
              onPress={isEditing ? handleUpdate : () => setIsEditing(true)}
              disabled={isUpdating}
            >
              <LinearGradient
                colors={isUpdating ? ["#D1D5DB", "#D1D5DB"] : ["#039116", "#06D001"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <CustomText style={styles.buttonText}>
                  {isUpdating ? t('profile.updating') : isEditing ? t('profile.save_changes') : t('profile.edit_profile')}
                </CustomText>
              </LinearGradient>
            </TouchableOpacity>
            {isEditing && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsEditing(false);
                  setFullName(userData.name);
                  setEmail(userData.email);
                  setPhone(userData.phone);
                  setCity(userData.city);
                  setProfilePic(userData.profilePic);
                  setPassword("");
                  setConfirmPassword("");
                }}
              >
                <CustomText style={styles.cancelButtonText}>{t('profile.cancel')}</CustomText>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <CustomText style={styles.placeholderText}>
            {t('profile.loading_user_data')}
          </CustomText>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#F9FAFB",
    flexGrow: 1,
  },
  headingContent: {
    alignItems: "center",
  },
  headerSubtitle: {
    fontSize: 20,
    color: "#039116",
    textAlign: "center",
    fontWeight: "bold",
    paddingBottom: 30,
    paddingTop: 20,
  },
  content: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flex: 1,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2A44",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#1F2A44",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontFamily: "RobotoRegular",
  },
  disabledInput: {
    backgroundColor: "#E5E7EB",
    color: "#666",
  },
  button: {
    borderRadius: 12,
    marginTop: 16,
    overflow: "hidden",
  },
  buttonGradient: {
    padding: 14,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "RobotoMedium",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButton: {
    marginTop: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#777",
    fontFamily: "RobotoRegular",
  },
  placeholderText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#1F2A44",
    textAlign: "center",
  },
  languageSelectorContainer: {
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  languageLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  languagePicker: {
    height: 50,
    width: 150,
  },
});

export default ProfileScreen;