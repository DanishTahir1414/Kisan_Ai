import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export const getIrrigationAlert = async (req, res) => {
  // Helper for rounding
  const round = (val) => val !== null ? Number(val.toFixed(2)) : null;
  try {
    const { lat, lon, crop } = req.body; // expects latitude, longitude, crop from frontend
    if (!lat || !lon || !crop) {
      return res.status(400).json({ error: "Latitude, longitude, and crop required" });
    }
    const apiKey = process.env.WEATHER_API_KEY;
    // Fetch current weather
    const currentUrl = `http://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const currentRes = await axios.get(currentUrl);
    const weather = currentRes.data;
    // Fetch forecast (5-day/3-hour)
    const forecastUrl = `http://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const forecastRes = await axios.get(forecastUrl);
    const forecast = forecastRes.data;
    // Crop coefficients (Pakistan-specific, typical)
    // FAO-based Kc values for more realistic separation
    const cropCoefficients = {
      wheat: { Kc: 0.95 },      // mid-season: 1.15, but average: 0.95
      rice: { Kc: 1.20 },       // high water demand
      maize: { Kc: 1.10 },      // moderate-high
      cotton: { Kc: 0.80 },     // lower than cereals
      vegetables: { Kc: 0.85 }  // average for mixed vegetables
    };
    const cropData = cropCoefficients[crop] || cropCoefficients['wheat'];
    // Extract weather values
    const temperature = weather.main && typeof weather.main.temp === 'number' ? weather.main.temp : null;
    const humidity = weather.main && typeof weather.main.humidity === 'number' ? weather.main.humidity : null;
    const windspeed = weather.wind && typeof weather.wind.speed === 'number' ? weather.wind.speed : null;
    // Forecast rainfall (next 5 days, Pakistan region-adaptive)
    let forecastRain = 0;
    const now = Date.now();
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
    for (const entry of forecast.list) {
      if (entry.dt * 1000 < now || entry.dt * 1000 > now + fiveDaysMs) continue;
      if (entry.rain && entry.rain['3h']) forecastRain += entry.rain['3h'];
    }
    // Current rain (last hour)
    const currentRain = weather.rain && weather.rain['1h'] ? weather.rain['1h'] : 0;
    const effectiveRain = currentRain + forecastRain;
    // Penman-Monteith (simplified, Pakistan region)
    // Use Tmean = temp, Tmax = temp+2, Tmin = temp-2 for estimation
    const Tmean = temperature;
    const Tmax = temperature !== null ? temperature + 2 : null;
    const Tmin = temperature !== null ? temperature - 2 : null;
    const daylight_hours = 9; // Pakistan average
    const Ra = 0.408 * daylight_hours;
    let ET0 = null;
    if (Tmean !== null && Tmax !== null && Tmin !== null) {
      ET0 = 0.0023 * (Tmean + 17.8) * Math.sqrt(Tmax - Tmin) * Ra;
    }
    // Adjust ET0 for humidity and wind
    let ETadjusted = ET0;
    if (ET0 !== null && windspeed !== null && humidity !== null) {
      ETadjusted = ET0 * (1 + (windspeed / 100) - (humidity / 100));
      if (ETadjusted < 0) ETadjusted = Math.abs(ETadjusted); // Clamp to positive
    }
    ETadjusted = round(ETadjusted);
    // Crop ETc
    let ETc = ETadjusted !== null ? ETadjusted * cropData.Kc : null;
    ETc = round(ETc);
    // Soil moisture capacity (Pakistan average)
    const soilCapacity = 40;
    // Days to next irrigation (dynamic, region-adaptive)
    let nextIrrigationInDays = null;
    if (ETc !== null && ETc > 0) {
      // If forecastRain > 5mm in next 5 days, delay irrigation
      if (forecastRain > 5) {
        nextIrrigationInDays = Math.max(7, round((soilCapacity - effectiveRain) / ETc)); // delay to 7 days minimum
      } else {
        nextIrrigationInDays = round((soilCapacity - effectiveRain) / ETc);
        if (nextIrrigationInDays < 3) nextIrrigationInDays = 3; // minimum 3 days for most crops
        if (nextIrrigationInDays > 10) nextIrrigationInDays = 10; // maximum 10 days for most crops
      }
    }
    // Next irrigation timestamp
    let nextIrrigationTimestamp = null;
    if (nextIrrigationInDays !== null) {
      nextIrrigationTimestamp = Date.now() + nextIrrigationInDays * 24 * 60 * 60 * 1000;
    }
    // Round forecastRain
    forecastRain = round(forecastRain);
    // Weather code mapping
    let weathercode = 0;
    if (weather.weather && Array.isArray(weather.weather) && weather.weather.length > 0) {
      const id = weather.weather[0].id;
      if (id >= 200 && id < 300) weathercode = 95;
      else if (id >= 300 && id < 400) weathercode = 51;
      else if (id >= 500 && id < 600) weathercode = 80;
      else if (id >= 600 && id < 700) weathercode = 45;
      else if (id === 800) weathercode = 0;
      else if (id === 801 || id === 802) weathercode = 1;
      else if (id === 803 || id === 804) weathercode = 3;
      else weathercode = 0;
    }
    // Recommendation message
    let alert = `Next irrigation due in ${nextIrrigationInDays} days based on weather and crop type.`;
    let type = "Normal";
    if (forecastRain > 5) {
      alert = `Rain expected in next 5 days — irrigation delayed to ${nextIrrigationInDays} days.`;
      type = "skip";
    } else if (temperature > 35 || humidity < 30) {
      alert = `High evapotranspiration detected — next irrigation in ${nextIrrigationInDays} days.`;
      type = "increase";
    }
    // Debug: Log crop and Kc used for calculation
    console.log('Irrigation Debug:', { crop, Kc: cropData.Kc, ETadjusted, ETc, effectiveRain, nextIrrigationInDays });
    return res.json({
      crop,
      temperature,
      humidity,
      windSpeed: windspeed,
      forecastRain,
      ETadjusted,
      ETc,
      nextIrrigationInDays,
      nextIrrigationTimestamp,
      alert,
      type,
      weather: {
        ...weather,
        weathercode,
        temperature,
        windspeed,
        humidity,
        forecastRain,
        ETadjusted,
        ETc
      }
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch weather data." });
  }
};
