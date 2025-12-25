import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, View, ActivityIndicator, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts, Lato_400Regular, Lato_700Bold } from "@expo-google-fonts/lato";
import { Roboto_400Regular, Roboto_500Medium } from "@expo-google-fonts/roboto";
import * as NavigationBar from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import toastConfig from "./toastconfig";
import { Picker } from '@react-native-picker/picker';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../translations/en.json';
import ur from '../translations/ur.json';
import * as Updates from 'expo-updates';
import { I18nextProvider } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { I18nManager } from 'react-native';

i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ur: { translation: ur },
  },
  lng: 'en', // Default language
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes values
  },
});

const RootLayout = () => {
  const [fontsLoaded, fontError] = useFonts({
    LatoRegular: Lato_400Regular,
    LatoBold: Lato_700Bold,
    RobotoRegular: Roboto_400Regular,
    RobotoMedium: Roboto_500Medium,
  });

  const [language, setLanguage] = React.useState(i18next.language);
  const [isLanguageLoaded, setIsLanguageLoaded] = React.useState(false);

  // Load saved language preference on app startup
  React.useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
        if (savedLanguage && savedLanguage !== i18next.language) {
          await i18next.changeLanguage(savedLanguage);
          const isRTL = savedLanguage === 'ur';
          I18nManager.forceRTL(isRTL);
          I18nManager.allowRTL(isRTL);
          setLanguage(savedLanguage);
        }
      } catch (error) {
        console.warn('Failed to load saved language:', error);
      } finally {
        setIsLanguageLoaded(true);
      }
    };
    
    loadSavedLanguage();
  }, []);

  const changeLanguage = (lang: string) => {
    i18next.changeLanguage(lang).then(async () => {
      const isRTL = lang === 'ur';
      I18nManager.forceRTL(isRTL);
      I18nManager.allowRTL(isRTL);
      setLanguage(lang);
      
      // Save language preference
      try {
        await AsyncStorage.setItem('selectedLanguage', lang);
      } catch (error) {
        console.warn('Failed to save language preference:', error);
      }
      
      if (Platform.OS === 'android') {
        Updates.reloadAsync(); // Reload the app to apply RTL changes
      }
    });
  };

  useEffect(() => {
    i18next.on('languageChanged', (lng) => {
      const isRTL = lng === 'ur';
      I18nManager.forceRTL(isRTL);
      I18nManager.allowRTL(isRTL);
      if (Platform.OS === 'android') {
        Updates.reloadAsync(); // Reload the app to apply RTL changes
      }
    });
  }, []);

  // Configure navigation bar and status bar on mount
  useEffect(() => {
    const configureUI = async () => {
      if (Platform.OS === 'android') {
        try {
          // Set navigation bar color and visibility
          await NavigationBar.setBackgroundColorAsync("#000000");
          await NavigationBar.setVisibilityAsync("hidden");
        } catch (error) {
          console.warn("Navigation bar configuration failed:", error);
        }
      }
    };
    configureUI();

    // Irrigation alert check on app startup
    const checkIrrigationAlert = async () => {
      try {
        const AsyncStorage = (
          await import("@react-native-async-storage/async-storage")
        ).default;
        const alertsRaw = await AsyncStorage.getItem("irrigationAlerts");
        let alerts = alertsRaw ? JSON.parse(alertsRaw) : [];
        let lastAlertTime =
          alerts.length > 0 ? new Date(alerts[0].timestamp) : null;
        let now = new Date();
        let shouldFetch = true;
        if (lastAlertTime) {
          const hoursDiff =
            (now.getTime() - lastAlertTime.getTime()) / (1000 * 60 * 60);
          if (hoursDiff < 24) {
            shouldFetch = false;
          }
        }
        if (!shouldFetch) return;

        // Try to get location and token
        let token = await AsyncStorage.getItem("authToken");
        let lat = null,
          lon = null;
        try {
          let { status } = await import("expo-location").then((m) =>
            m.requestForegroundPermissionsAsync()
          );
          if (status === "granted") {
            let loc = await import("expo-location").then((m) =>
              m.getCurrentPositionAsync({})
            );
            lat = loc.coords.latitude;
            lon = loc.coords.longitude;
          }
        } catch (e) {}
        if (!token || lat === null || lon === null) return;

        // Fetch irrigation alert
        // Change this to your computer's IP address for mobile testing
        const API_BASE_URL =
          Platform.OS === "android"
            ? "http://192.168.18.226:3000/api"
            : "http://localhost:3000/api"; //YOUR COMPUTER'S IP ADDRESS HERE
        const res = await fetch(`${API_BASE_URL}/irrigation/alert`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ lat, lon }),
        });
        const data = await res.json();
        const alertMsg = data.alert || "No irrigation alert available.";
        alerts.unshift({
          message: alertMsg,
          timestamp: new Date().toISOString(),
        });
        await AsyncStorage.setItem("irrigationAlerts", JSON.stringify(alerts));
        // DO NOT show Toast here. Only update history.
      } catch (e) {}
    };
    checkIrrigationAlert();
  }, []);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#039116" />
      </View>
    );
  }

  // Show loading until language is loaded
  if (!isLanguageLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#039116" />
      </View>
    );
  }

  if (fontError) {
    console.error("Font loading error:", fontError);
  }

  return (
    <I18nextProvider i18n={i18next}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="Tabs" />
          </Stack>
          <Toast config={toastConfig} />
        </SafeAreaView>
      </GestureHandlerRootView>
    </I18nextProvider>
  );
};

export default RootLayout;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
});