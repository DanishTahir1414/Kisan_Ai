import { BlurView } from "expo-blur";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  ImageBackground,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { CustomText, Heading } from "./components/customText";

// Change this to your computer's IP address for mobile testing
const API_BASE_URL =
  Platform.OS === "android"
    ? "http://192.168.18.226:3000/api" //YOUR COMPUTER'S IP ADDRESS HERE
    : "http://localhost:3000/api";

export default function SignupScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profilePic, setProfilePic] = useState(""); // base64
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSignup = async () => {
    if (
      !fullName ||
      !email ||
      !phone ||
      !city ||
      !password ||
      !confirmPassword ||
      !profilePic
    ) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please fill in all fields including profile picture",
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

    if (password.length < 6) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Password must be at least 6 characters",
      });
      return;
    }

    if (password !== confirmPassword) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Passwords don't match",
      });
      return;
    }

    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.toLowerCase().trim(),
          phone: phone.trim(),
          city: city.trim(),
          password,
          profilePic,
        }),
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
        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Account created successfully! Please login.",
          onHide: () => router.replace("/"),
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Signup Failed",
          text2: data.message || `Server error (${response.status})`,
        });
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        Toast.show({
          type: "error",
          text1: "Timeout Error",
          text2: "Request timed out. Please try again.",
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: error?.message || "An unexpected error occurred",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("../assets/images/formBgImage2.jpg")}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar
        animated={true}
        backgroundColor="transparent"
        barStyle="dark-content"
        translucent={true}
      />

      <BlurView intensity={50} style={styles.blurContainer}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollViewContent}>
            <Heading style={styles.title}>Register Now!</Heading>
      

            {profilePic && (
              <View style={{ alignItems: "center", marginBottom: 10 }}>
                <Image
                  source={{ uri: profilePic }}
                  style={{ width: 100, height: 100, borderRadius: 50 }}
                />
              </View>
            )}

            <TouchableOpacity
              style={styles.imagePicker}
              onPress={pickImage}
              disabled={isLoading}
            >
              <CustomText style={styles.imagePickerText}>
                {profilePic
                  ? "Change Profile Picture"
                  : "Upload Profile Picture"}
              </CustomText>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { fontFamily: "RobotoRegular" }]}
              placeholder="Full Name"
              value={fullName}
              onChangeText={setFullName}
              editable={!isLoading}
            />
            <TextInput
              style={[styles.input, { fontFamily: "RobotoRegular" }]}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
            />
            <TextInput
              style={[styles.input, { fontFamily: "RobotoRegular" }]}
              placeholder="Phone Number"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              editable={!isLoading}
            />
            <TextInput
              style={[styles.input, { fontFamily: "RobotoRegular" }]}
              placeholder="City"
              value={city}
              onChangeText={setCity}
              editable={!isLoading}
            />
            <TextInput
              style={[styles.input, { fontFamily: "RobotoRegular" }]}
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
            />
            <TextInput
              style={[styles.input, { fontFamily: "RobotoRegular" }]}
              placeholder="Confirm Password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!isLoading}
            />

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={isLoading}
            >
              <CustomText style={styles.buttonText}>
                {isLoading ? "Creating Account..." : "Sign Up"}
              </CustomText>
            </TouchableOpacity>

            <CustomText style={styles.newUser}>
              Already have an account?
              <CustomText
                onPress={() => router.replace("/")}
                style={styles.link}
                variant="medium"
              >
                Login
              </CustomText>
            </CustomText>
          </ScrollView>
        </SafeAreaView>
      </BlurView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  blurContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? Constants.statusBarHeight : 0,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 20,
  },
  title: {
    fontSize: 40,
    marginBottom: 20,
    textAlign: "center",
    color: "rgba(0, 0, 0, 0.7)",
    textTransform: "capitalize",
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.4)",
    marginVertical: 10,
    padding: 8,
    color: "#333",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 5,
    fontSize: 16,
  },
  imagePicker: {
    marginVertical: 10,
    padding: 12,
    backgroundColor: "#ccc",
    borderRadius: 8,
  },
  imagePickerText: {
    textAlign: "center",
    color: "#000",
  },
  button: {
    backgroundColor: "#36ba1c",
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: "#36ba1c80",
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 18,
  },
  newUser: {
    fontSize: 18,
    textAlign: "center",
    marginTop: 20,
    color: "#111827",
  },
  link: {
    color: "#2e4a07",
  },
});
