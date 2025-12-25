import React, { useEffect, useState } from "react";
import Toast from "react-native-toast-message";
import { View, Text, Button, ActivityIndicator, TouchableOpacity, Platform } from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScrollView } from "react-native";
import { useTranslation } from "react-i18next";

export default function Irrigation() {
  const { t } = useTranslation();
  // Platform-aware API base URL
  // Change this to your computer's IP address for mobile testing
  const API_BASE_URL =
    Platform.OS === "android" || Platform.OS === "ios"
      ? "http://192.168.18.226:3000" // your computer's IP for mobile
      : "http://localhost:3000"; // localhost for web
  // Next irrigation timestamp and type from backend
  const [nextIrrigationTimestamp, setNextIrrigationTimestamp] = useState<number | null>(null);
  const [countdownText, setCountdownText] = useState("");
  const [irrigationType, setIrrigationType] = useState<string>("Normal");

  // Update countdown every minute
  useEffect(() => {
    const updateCountdown = () => {
      if (!nextIrrigationTimestamp) {
        setCountdownText("");
        return;
      }
      const now = Date.now();
      const diffMs = nextIrrigationTimestamp - now;
      if (diffMs > 0) {
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        let text = t('irrigation.next_in') + " ";
        if (diffDays > 0) text += `${diffDays} ${t('common.days')} `;
        if (diffHours > 0 || diffDays > 0) text += `${diffHours} ${t('common.hours')} `;
        text += `${diffMinutes} ${t('common.minutes')}`;
        setCountdownText(text);
      } else {
        setCountdownText(t('irrigation.due_now'));
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // update every minute
    return () => clearInterval(interval);
  }, [nextIrrigationTimestamp]);
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [alert, setAlert] = useState("");
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg(t('irrigation.permission_denied'));
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords as Location.LocationObjectCoords);
      fetchWeather(loc.coords.latitude, loc.coords.longitude);
    })();
  }, []);
  // Weather description and icon mapping
  const getWeatherDescription = (code: number) => {
    // Example mapping, expand as needed
    if (code === 0) return { icon: "☀️", text: t('weather.sunny') };
    if (code === 1 || code === 2) return { icon: "⛅", text: t('weather.partly_cloudy') };
    if (code === 3) return { icon: "☁️", text: t('weather.cloudy') };
    if (code >= 45 && code <= 48) return { icon: "🌫️", text: t('weather.foggy') };
    if (code >= 51 && code <= 67) return { icon: "🌦️", text: t('weather.drizzle') };
    if (code >= 80 && code <= 82) return { icon: "🌧️", text: t('weather.rainy') };
    if (code >= 95) return { icon: "⛈️", text: t('weather.storm') };
    return { icon: "❓", text: t('weather.unknown') };
  };

  // Refresh weather only
  const handleRefreshWeather = async () => {
    if (!location) return;
    setRefreshing(true);
    await fetchWeather(location.latitude, location.longitude);
    setRefreshing(false);
  };
  // Only wheat/rice supported, default to wheat
  const [selectedCrop] = useState<string>('wheat');
  // Fetch weather data (dummy API for demo)
  const fetchWeather = async (lat: number, lon: number) => {
    try {
      // Use your backend API for weather and irrigation scheduling
      const token = await getAuthToken();
      if (!token) return setWeather(null);
      const res = await fetch(`${API_BASE_URL}/api/irrigation/alert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ lat, lon, crop: selectedCrop }),
      });
      const data = await res.json();
      setWeather(data.weather || null);
    } catch (err) {
      setWeather(null);
    }
  };

  // Automatically fetch alert when location is available
  useEffect(() => {
    if (location) {
      fetchAlert();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const fetchAlert = async () => {
    if (!location) return;
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        setAlert(t('irrigation.auth_error'));
        setLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/irrigation/alert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ lat: location.latitude, lon: location.longitude, crop: selectedCrop }),
      });
      const data = await res.json();
      // Backend should return: { alert, weather, nextIrrigationTimestamp, type }
      const alertMsg = data.alert || t('irrigation.no_alert');
      setAlert(alertMsg);
      if (data.nextIrrigationTimestamp) {
        setNextIrrigationTimestamp(data.nextIrrigationTimestamp);
      }
      if (data.type) {
        setIrrigationType(data.type);
      }
      // Check last saved alert
      const existing = await AsyncStorage.getItem("irrigationAlerts");
      let alerts = existing ? JSON.parse(existing) : [];
    alerts = alerts.map((a: any) => ({ ...a, read: typeof a.read === "boolean" ? a.read : false }));
      const lastAlert = alerts.length > 0 ? alerts[0] : null;
      const now = Date.now();
      let showToast = false;
      if (!lastAlert) {
        showToast = true;
      } else {
        const lastMsg = lastAlert.message;
        const lastTime = new Date(lastAlert.timestamp).getTime();
        // Show if message changed or last alert older than 24h
        if (alertMsg !== lastMsg || (now - lastTime) > 24 * 60 * 60 * 1000) {
          showToast = true;
        }
      }
      if (showToast) {
        alerts.unshift({ message: alertMsg, timestamp: new Date().toISOString(), read: false });
        await AsyncStorage.setItem("irrigationAlerts", JSON.stringify(alerts));
        if (typeof Toast !== "undefined") {
          Toast.show({ type: "info", text1: t('irrigation.title'), text2: alertMsg });
        }
      }
    } catch (err) {
      setAlert(t('irrigation.failed_fetch'));
    }
    setLoading(false);
  };

  const getAuthToken = async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem("authToken");
    } catch (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <ScrollView contentContainerStyle={{ alignItems: 'center', padding: 16 }}>
        <Text style={{ fontSize: 26, fontWeight: "bold", marginBottom: 18, textAlign: 'center', color: '#388e3c' }}>{t('irrigation.title')}</Text>
        {/* Show crop type info (wheat/rice only) */}
        <View style={{ marginBottom: 12, width: '100%', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#388e3c' }}>{t('irrigation.crop_type')}</Text>
        </View>
        {errorMsg ? (
          <Text style={{ color: "red" }}>{errorMsg}</Text>
        ) : location ? (
          <>
            {/* Weather Card */}
            {weather && (
              <View style={{ backgroundColor: '#e0f7fa', borderRadius: 18, padding: 18, marginBottom: 18, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 32, marginRight: 10 }}>{getWeatherDescription(weather.weathercode).icon}</Text>
                  <View>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#039116' }}>{t('irrigation.current_weather')}</Text>
                    <Text style={{ fontSize: 16 }}>{getWeatherDescription(weather.weathercode).text}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 16 }}>{t('irrigation.temp')}: {weather.temperature}°C</Text>
                  <Text style={{ fontSize: 16 }}>{t('irrigation.wind')}: {weather.windspeed} km/h</Text>
                  <TouchableOpacity onPress={handleRefreshWeather} style={{ marginTop: 6, backgroundColor: '#b2dfdb', borderRadius: 8, padding: 6 }}>
                    <Text style={{ fontSize: 16 }}>{t('irrigation.refresh')}</Text>
                  </TouchableOpacity>
                  {refreshing && <ActivityIndicator size="small" color="#039116" />}
                </View>
              </View>
            )}

            {/* Next Irrigation Schedule Card */}
            <View style={{ backgroundColor: '#fffbe7', borderRadius: 18, padding: 18, marginBottom: 18, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: '#ffe082', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#d84315', marginBottom: 6, textAlign: 'center' }}>{t('irrigation.next_schedule')}</Text>
              <Text style={{ fontSize: 16, marginBottom: 4, textAlign: 'center' }}>{countdownText}</Text>
              <Text style={{ fontSize: 16, color: '#039116', fontWeight: 'bold', textAlign: 'center' }}>{t('irrigation.type')}: {irrigationType}</Text>
              <Text style={{ fontSize: 16, marginTop: 8, textAlign: 'center' }}>{alert || t('irrigation.no_alert')}</Text>
            </View>

            <Button title={t('irrigation.get_alert')} onPress={fetchAlert} color="#388e3c" />
            {loading && <ActivityIndicator size="large" color="#388e3c" />}
          </>
        ) : (
          <Text>{t('irrigation.fetching_location')}</Text>
        )}
      </ScrollView>
    </View>
  );
}
