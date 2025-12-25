import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');

const WEATHER_API_KEY = '252b3d3ece3a47a285d101321251806';
const WEATHER_URL = 'https://api.weatherapi.com/v1';

interface WeatherData {
  name: string;
  main: {
    temp: number;
    temp_max: number;
    temp_min: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
  };
  visibility: number;
}

interface ForecastItem {
  dt: number;
  main: {
    temp: number;
    temp_max: number;
    temp_min: number;
  };
  weather: Array<{
    icon: string;
  }>;
}

interface ForecastData {
  list: ForecastItem[];
}

interface HourlyForecastItem {
  time: string;
  temp: number;
  icon: string;
}

interface DailyForecastItem {
  day: string;
  icon: string;
  high: number;
  low: number;
}

interface WeatherAPIResponse {
  location: { name: string };
  current: {
    temp_c: number;
    feelslike_c: number;
    humidity: number;
    pressure_mb: number;
    wind_kph: number;
    vis_km: number;
    condition: { text: string; code: number };
    is_day: number;
  };
  forecast: {
    forecastday: Array<{
      date: string;
      day: {
        maxtemp_c: number;
        mintemp_c: number;
        avgtemp_c: number;
        condition: { text: string; code: number };
      };
      hour: Array<{
        time: string;
        temp_c: number;
        condition: { code: number };
        is_day: number;
      }>;
    }>;
  };
}

const WeatherScreen: React.FC = () => {
  const { t } = useTranslation();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    getLocationAndWeather();
  }, []);

  const getLocationAndWeather = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: t('toast.permission_denied'),
          text2: t('toast.location_permission_required'),
        });
        return;
      }
      const currentLocation = await Location.getCurrentPositionAsync({});
      await getWeatherData(currentLocation.coords.latitude, currentLocation.coords.longitude);
    } catch (error) {
      console.error(error);
      Toast.show({
        type: 'error',
        text1: t('toast.error'),
        text2: t('toast.location_error'),
      });
      setLoading(false);
    }
  };

  const getWeatherData = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `${WEATHER_URL}/forecast.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&days=10&aqi=yes&alerts=yes`
      );
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const data: WeatherAPIResponse = await response.json();

      const transformedWeather: WeatherData = {
        name: data.location.name,
        main: {
          temp: data.current.temp_c,
          temp_max: data.forecast.forecastday[0].day.maxtemp_c,
          temp_min: data.forecast.forecastday[0].day.mintemp_c,
          feels_like: data.current.feelslike_c,
          humidity: data.current.humidity,
          pressure: data.current.pressure_mb,
        },
        weather: [
          {
            main: data.current.condition.text,
            description: data.current.condition.text,
            icon: getWeatherAPIIcon(data.current.condition.code, data.current.is_day),
          },
        ],
        wind: { speed: data.current.wind_kph / 3.6 },
        visibility: data.current.vis_km * 1000,
      };

      const transformedForecast: ForecastData = { list: [] };
      data.forecast.forecastday[0].hour.forEach((hour, i) => {
        if (i % 2 === 0) {
          transformedForecast.list.push({
            dt: new Date(hour.time).getTime() / 1000,
            main: { temp: hour.temp_c, temp_max: hour.temp_c, temp_min: hour.temp_c },
            weather: [{ icon: getWeatherAPIIcon(hour.condition.code, hour.is_day) }],
          });
        }
      });
      data.forecast.forecastday.forEach((day) => {
        transformedForecast.list.push({
          dt: new Date(day.date).getTime() / 1000,
          main: {
            temp: day.day.avgtemp_c,
            temp_max: day.day.maxtemp_c,
            temp_min: day.day.mintemp_c,
          },
          weather: [{ icon: getWeatherAPIIcon(day.day.condition.code, 1) }],
        });
      });

      setWeatherData(transformedWeather);
      setForecastData(transformedForecast);
      setLoading(false);
    } catch (error) {
      console.error(error);
      Toast.show({
        type: 'error',
        text1: t('toast.error'),
        text2: t('toast.fetch_error'),
      });
      setLoading(false);
    }
  };

  const getWeatherAPIIcon = (code: number, isDay: number): string => {
    const icons: Record<number, string> = {
      1000: isDay ? 'sunny' : 'moon',
      1003: isDay ? 'partly-sunny' : 'cloudy-night',
      1006: 'cloud',
      1009: 'cloudy',
      1030: 'cloudy',
      1063: 'rainy',
      1066: 'snow',
      1069: 'rainy',
      1072: 'rainy',
      1087: 'thunderstorm',
      1114: 'snow',
      1117: 'snow',
      1135: 'cloudy',
      1147: 'cloudy',
      1150: 'rainy',
      1153: 'rainy',
      1168: 'rainy',
      1171: 'rainy',
      1180: 'rainy',
      1183: 'rainy',
      1186: 'rainy',
      1189: 'rainy',
      1192: 'rainy',
      1195: 'rainy',
      1198: 'rainy',
      1201: 'rainy',
      1204: 'rainy',
      1207: 'rainy',
      1210: 'snow',
      1213: 'snow',
      1216: 'snow',
      1219: 'snow',
      1222: 'snow',
      1225: 'snow',
      1237: 'snow',
      1240: 'rainy',
      1243: 'rainy',
      1246: 'rainy',
      1249: 'rainy',
      1252: 'rainy',
      1255: 'snow',
      1258: 'snow',
      1261: 'snow',
      1264: 'snow',
      1273: 'thunderstorm',
      1276: 'thunderstorm',
      1279: 'thunderstorm',
      1282: 'thunderstorm',
    };
    return icons[code] || (isDay ? 'partly-sunny' : 'cloudy-night');
  };

  const getGradientColors = (weatherMain?: string): [string, string, ...string[]] => {
    switch (weatherMain?.toLowerCase()) {
      case 'clear': return ['#4A90E2', '#5D9CEC', '#87CEEB'];
      case 'clouds': return ['#6C7B7F', '#9CA3AF', '#B0B7C3'];
      case 'rain': return ['#4A5568', '#667080', '#718096'];
      case 'snow': return ['#E2E8F0', '#F7FAFC', '#CBD5E0'];
      case 'thunderstorm': return ['#2D3748', '#4A5568', '#718096'];
      default: return ['#4A90E2', '#5D9CEC', '#87CEEB'];
    }
  };

  const getHourlyForecast = (): HourlyForecastItem[] => {
    if (!forecastData) return [];
    return forecastData.list.slice(0, 6).map(item => ({
      time: new Date(item.dt * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
      temp: Math.round(item.main.temp),
      icon: item.weather[0].icon,
    }));
  };

  const getDailyForecast = (): DailyForecastItem[] => {
    if (!forecastData) return [];
    const days: DailyForecastItem[] = [];
    const seenDates = new Set<number>();

    // Start from index 6 to skip hourly data
    for (let i = 6; i < forecastData.list.length && days.length < 10; i++) {
      const item = forecastData.list[i];
      const date = new Date(item.dt * 1000);
      const dateKey = date.getDate();

      // Only add if we haven't seen this date yet
      if (!seenDates.has(dateKey)) {
        days.push({
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          icon: item.weather[0].icon,
          high: Math.round(item.main.temp_max),
          low: Math.round(item.main.temp_min),
        });
        seenDates.add(dateKey);
      }
    }
    return days.slice(0, 10);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#4A90E2', '#5D9CEC']} style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>{t('loading.getting_weather_data')}</Text>
          <Toast position="top" />
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (!weatherData) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#4A90E2', '#5D9CEC']} style={styles.loadingContainer}>
          <Text style={styles.errorText}>{t('error.unable_to_load_weather_data')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={getLocationAndWeather}>
            <Text style={styles.retryText}>{t('error.retry')}</Text>
          </TouchableOpacity>
          <Toast position="top" />
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const hourlyForecast = getHourlyForecast();
  const dailyForecast = getDailyForecast();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={getGradientColors(weatherData.weather[0].main)} style={styles.gradient}>
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          <View style={styles.header}>
            <Text style={styles.locationLabel}>{t('weather.my_location')}</Text>
            <Text style={styles.location}>{weatherData.name}</Text>
          </View>
          <View style={styles.mainWeather}>
            <Text style={styles.temperature}>{Math.round(weatherData.main.temp)}°</Text>
            <Text style={styles.weatherDescription}>{weatherData.weather[0].description}</Text>
            <Text style={styles.highLow}>
              {t('weather.high')}: {Math.round(weatherData.main.temp_max)}° {t('weather.low')}: {Math.round(weatherData.main.temp_min)}°
            </Text>
          </View>
          <View style={styles.currentConditions}>
            <Text style={styles.conditionsText}>
              {weatherData.weather[0].description}. {t('weather.wind_gusts')} {Math.round(weatherData.wind.speed * 3.6)} km/h.
            </Text>
          </View>
          <View style={styles.hourlyContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourlyScroll}>
              {hourlyForecast.map((hour, index) => (
                <View key={index} style={styles.hourlyItem}>
                  <Text style={styles.hourlyTime}>{index === 0 ? t('weather.now') : hour.time}</Text>
                  <Ionicons 
                    name={hour.icon as keyof typeof Ionicons.glyphMap} 
                    size={24} 
                    color="white" 
                    style={styles.hourlyIcon}
                  />
                  <Text style={styles.hourlyTemp}>{hour.temp}°</Text>
                </View>
              ))}
            </ScrollView>
          </View>
          <View style={styles.forecastContainer}>
            <View style={styles.forecastHeader}>
              <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={styles.forecastTitle}>{t('weather.ten_day_forecast')}</Text>
            </View>
            <View style={styles.forecastItem}>
              <Text style={styles.forecastDay}>{t('weather.today')}</Text>
              <Ionicons 
                name={weatherData.weather[0].icon as keyof typeof Ionicons.glyphMap} 
                size={24} 
                color="white" 
              />
              <Text style={styles.forecastLow}>{Math.round(weatherData.main.temp_min)}°</Text>
              <View style={styles.tempBar}>
                <View style={styles.tempBarFill} />
              </View>
              <Text style={styles.forecastHigh}>{Math.round(weatherData.main.temp_max)}°</Text>
            </View>
            {dailyForecast.map((day, index) => (
              <View key={index} style={styles.forecastItem}>
                <Text style={styles.forecastDay}>{day.day}</Text>
                <Ionicons 
                  name={day.icon as keyof typeof Ionicons.glyphMap} 
                  size={24} 
                  color="white" 
                />
                <Text style={styles.forecastLow}>{day.low}°</Text>
                <View style={styles.tempBar}>
                  <View style={[styles.tempBarFill, { backgroundColor: index < 2 ? '#FFD700' : '#FFA500' }]} />
                </View>
                <Text style={styles.forecastHigh}>{day.high}°</Text>
              </View>
            ))}
          </View>
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="eye-outline" size={20} color="rgba(255,255,255,0.7)" />
                <Text style={styles.detailLabel}>{t('weather.visibility')}</Text>
                <Text style={styles.detailValue}>{(weatherData.visibility / 1000).toFixed(1)} km</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="water-outline" size={20} color="rgba(255,255,255,0.7)" />
                <Text style={styles.detailLabel}>{t('weather.humidity')}</Text>
                <Text style={styles.detailValue}>{weatherData.main.humidity}%</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="thermometer-outline" size={20} color="rgba(255,255,255,0.7)" />
                <Text style={styles.detailLabel}>{t('weather.feels_like')}</Text>
                <Text style={styles.detailValue}>{Math.round(weatherData.main.feels_like)}°</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="speedometer-outline" size={20} color="rgba(255,255,255,0.7)" />
                <Text style={styles.detailLabel}>{t('weather.pressure')}</Text>
                <Text style={styles.detailValue}>{weatherData.main.pressure} hPa</Text>
              </View>
            </View>
          </View>
          <View style={styles.bottomPadding} />
        </ScrollView>
      </LinearGradient>
      <Toast position="top" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'white', fontSize: 16, marginTop: 10 },
  errorText: { color: 'white', fontSize: 18, textAlign: 'center' },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 20,
  },
  retryText: { color: 'white', fontSize: 16, fontWeight: '600' },
  header: { alignItems: 'center', marginTop: 60, marginBottom: 20 },
  locationLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500', letterSpacing: 1 },
  location: { color: 'white', fontSize: 32, fontWeight: '300', marginTop: 5 },
  mainWeather: { alignItems: 'center', marginVertical: 30 },
  temperature: { color: 'white', fontSize: 100, fontWeight: '100', lineHeight: 100 },
  weatherDescription: { color: 'white', fontSize: 22, fontWeight: '300', marginTop: 5, textTransform: 'uppercase' },
  highLow: { color: 'white', fontSize: 18, fontWeight: '300', marginTop: 5 },
  currentConditions: {
    marginHorizontal: 20,
    marginBottom: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 20,
  },
  conditionsText: {
    color: 'white',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  hourlyContainer: { marginBottom: 30 },
  hourlyScroll: { paddingLeft: 20 },
  hourlyItem: { alignItems: 'center', marginRight: 35 },
  hourlyTime: { color: 'white', fontSize: 14, fontWeight: '500', marginBottom: 10 },
  hourlyIcon: { marginBottom: 10 },
  hourlyTemp: { color: 'white', fontSize: 18, fontWeight: '500' },
  forecastContainer: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  forecastTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1,
    marginLeft: 5,
  },
  forecastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  forecastDay: {
    color: 'white',
    fontSize: 16,
    fontWeight: '400',
    width: 50,
  },
  forecastLow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginLeft: 'auto',
    marginRight: 10,
    width: 35,
    textAlign: 'right',
  },
  tempBar: {
    height: 4,
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginHorizontal: 10,
  },
  tempBarFill: {
    height: '100%',
    width: '70%',
    backgroundColor: '#FFD700',
    borderRadius: 2,
  },
  forecastHigh: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    width: 35,
  },
  detailsContainer: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 5,
    marginBottom: 5,
  },
  detailValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 30,
  },
});

export default WeatherScreen;