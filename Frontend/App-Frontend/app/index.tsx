import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ImageBackground,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message"; // Import Toast
import { CustomText, Heading } from "./components/customText";

// Replace with your actual backend URL
// For Android Emulator: use 172.18.9.231 instead of localhost
// For iOS Simulator: use localhost or 127.0.0.1
// For Physical Device: use your computer's IP address

// Change this to your computer's IP address for mobile testing
const API_BASE_URL =
  Platform.OS === "android"
    ? "http://192.168.18.226:3000/api" //YOUR COMPUTER'S IP ADDRESS HERE
    : "http://localhost:3000/api";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);


  const handleLogin = async () => {
    // Basic validation
    if (!email || !password) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please fill in all fields",
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

    setIsLoading(true);

    try {
      console.log("Attempting login with URL:", `${API_BASE_URL}/auth/login`);
      console.log("Request payload:", {
        email: email.toLowerCase().trim(),
        password: "***hidden***",
      });

      // Add timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log("Response status:", response.status);

      // Check if response has content
      const contentType = response.headers.get("content-type");
      let data;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
        console.log("Response data:", data);
      } else {
        const textResponse = await response.text();
        console.log("Non-JSON response:", textResponse);
        data = { message: textResponse || "Server error" };
      }

      if (response.ok) {
        // Store the token and user data
        await AsyncStorage.setItem("authToken", data.token);
        await AsyncStorage.setItem("userData", JSON.stringify(data.user));
        console.log(data.user);

        // Fetch irrigation alert data
        let alertMsg = "No irrigation alert available.";
        try {
          let { status } = await import("expo-location").then(m => m.requestForegroundPermissionsAsync());
          if (status === "granted") {
            let loc = await import("expo-location").then(m => m.getCurrentPositionAsync({}));
            const res = await fetch(`${API_BASE_URL}/irrigation/alert`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${data.token}`,
              },
              body: JSON.stringify({ lat: loc.coords.latitude, lon: loc.coords.longitude, crop: "wheat" }),
            });
            const alertData = await res.json();
            alertMsg = alertData.alert || "No irrigation alert available.";
            // Save to AsyncStorage for notification dropdown
            try {
              const existing = await AsyncStorage.getItem("irrigationAlerts");
              let alerts = existing ? JSON.parse(existing) : [];
              alerts.unshift({ message: alertMsg, timestamp: new Date().toISOString() });
              await AsyncStorage.setItem("irrigationAlerts", JSON.stringify(alerts));
            } catch (e) {}
          }
        } catch (e) {
          // Optionally show error toast
        }

        // Navigate to home screen
        router.push("/(tab)/Home");

        // Show success message
        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Login successful!",
        });
        // Show irrigation alert after 7 seconds
        setTimeout(() => {
          Toast.show({ type: "irrigation", text1: "Irrigation Alert", text2: alertMsg });
        }, 7000);
      } else {
        // Handle error response
        Toast.show({
          type: "error",
          text1: "Login Failed",
          text2: data.message || `Server error (${response.status})`,
        });
      }
    } catch (error: any) {
      console.error("Login error:", error);


      if (error.name === "AbortError") {
        Toast.show({
          type: "error",
          text1: "Timeout Error",
          text2:
            "Request timed out. Please check your connection and try again.",
        });
      } else if (
        error.message &&
        error.message.includes("Network request failed")
      ) {
        Toast.show({
          type: "error",
          text1: "Connection Error",
          text2: `Cannot connect to server at ${API_BASE_URL}/auth/login. Please check:\n1. Backend server is running\n2. IP address is correct\n3. Phone and server are on same network`,
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
          <View style={styles.container}>
            <Heading style={styles.title}>Login</Heading>
            <TextInput
              placeholder="Email"
              style={[styles.input, { fontFamily: "RobotoRegular" }]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
            <TextInput
              placeholder="Password"
              secureTextEntry
              style={[styles.input, { fontFamily: "RobotoRegular" }]}
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <CustomText style={styles.buttonText}>
                {isLoading ? "Logging in..." : "Login"}
              </CustomText>
            </TouchableOpacity>
            <CustomText style={styles.newUser}>
              Not a user?{" "}
              <CustomText
                onPress={() => router.replace("/Singup")} // Fixed typo: Singup → Signup
                style={styles.link}
                variant="medium"
              >
                Register Now!
              </CustomText>
            </CustomText>
          </View>
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
    backgroundColor: "rgba(255,255,255,0.3)", // Match SignupScreen
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? Constants.statusBarHeight : 0,
  },
  container: {
    marginVertical: "auto",
  },
  title: {
    height: 80,
    fontSize: 44,
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
  button: {
    backgroundColor: "#36ba1c",
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: "#36ba1c80", // Semi-transparent when disabled
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
