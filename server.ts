import express from "express";
import path from "path";
import axios from "axios";
import axiosRetry from "axios-retry";
import * as cheerio from "cheerio";

const app = express();
const PORT = 3000;

// Configure axios retry
axiosRetry(axios, { 
  retries: 3, 
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Retry on 5xx errors or network issues
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
           (error.response?.status ? error.response.status >= 500 : false);
  }
});

app.use(express.json());

// API: Exchange Rates
app.get("/api/rates", async (req, res) => {
  try {
    const response = await axios.get("https://open.er-api.com/v6/latest/TWD", {
      timeout: 10000
    });
    
    const apiRates = response.data?.rates || {};
    const rates: Record<string, number> = { TWD: 1 };
    
    // open.er-api gives rates as 1 TWD = X Foreign
    // We need 1 Foreign = X TWD, so we inverse the rate
    for (const [currency, rate] of Object.entries(apiRates)) {
      if (typeof rate === "number" && rate > 0) {
        rates[currency] = 1 / rate;
      }
    }

    res.json({ rates, updatedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error("Fetch rates error:", error.message);
    res.status(500).json({ error: "Failed to fetch exchange rates" });
  }
});

// Weather Locations (Taiwan Counties)
const TAIWAN_LOCATIONS = [
  { name: '基隆市', value: 'Keelung' },
  { name: '臺北市', value: 'Taipei' },
  { name: '新北市', value: 'New_Taipei' },
  { name: '桃園市', value: 'Taoyuan' },
  { name: '新竹市', value: 'Hsinchu_City' },
  { name: '新竹縣', value: 'Hsinchu_County' },
  { name: '苗栗縣', value: 'Miaoli' },
  { name: '臺中市', value: 'Taichung' },
  { name: '彰化縣', value: 'Changhua' },
  { name: '南投縣', value: 'Nantou' },
  { name: '雲林縣', value: 'Yunlin' },
  { name: '嘉義市', value: 'Chiayi_City' },
  { name: '嘉義縣', value: 'Chiayi_County' },
  { name: '臺南市', value: 'Tainan' },
  { name: '高雄市', value: 'Kaohsiung' },
  { name: '屏東縣', value: 'Pingtung' },
  { name: '宜蘭縣', value: 'Yilan' },
  { name: '花蓮縣', value: 'Hualien' },
  { name: '臺東縣', value: 'Taitung' },
  { name: '澎湖縣', value: 'Penghu' },
  { name: '金門縣', value: 'Kinmen' },
  { name: '連江縣', value: 'Matsu' },
];

// Common Coordinates to bypass geocoding limit/errors
const COMMON_COORDINATES: Record<string, { lat: number, lng: number }> = {
  'keelung': { lat: 25.1276, lng: 121.7392 },
  'taipei': { lat: 25.0330, lng: 121.5654 },
  'new_taipei': { lat: 25.0112, lng: 121.4589 },
  'taoyuan': { lat: 24.9936, lng: 121.3010 },
  'hsinchu_city': { lat: 24.8138, lng: 120.9675 },
  'hsinchu_county': { lat: 24.8383, lng: 121.0150 },
  'miaoli': { lat: 24.5602, lng: 120.8214 },
  'taichung': { lat: 24.1477, lng: 120.6736 },
  'changhua': { lat: 24.0809, lng: 120.5385 },
  'nantou': { lat: 23.9103, lng: 120.6865 },
  'yunlin': { lat: 23.7092, lng: 120.4313 },
  'chiayi_city': { lat: 23.4800, lng: 120.4491 },
  'chiayi_county': { lat: 23.4518, lng: 120.2555 },
  'tainan': { lat: 22.9997, lng: 120.2270 },
  'kaohsiung': { lat: 22.6273, lng: 120.3014 },
  'pingtung': { lat: 22.6687, lng: 120.4862 },
  'yilan': { lat: 24.7551, lng: 121.7510 },
  'hualien': { lat: 23.9772, lng: 121.6033 },
  'taitung': { lat: 22.7561, lng: 121.1444 },
  'penghu': { lat: 23.5711, lng: 119.5793 },
  'kinmen': { lat: 24.4327, lng: 118.3344 },
  'matsu': { lat: 26.1505, lng: 119.9328 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  'osaka': { lat: 34.6937, lng: 135.5023 },
  'kyoto': { lat: 35.0116, lng: 135.7681 },
  'seoul': { lat: 37.5665, lng: 126.9780 },
  'bangkok': { lat: 13.7563, lng: 100.5018 },
  'singapore': { lat: 1.3521, lng: 103.8198 },
  'new york': { lat: 40.7128, lng: -74.0060 },
  'london': { lat: 51.5074, lng: -0.1278 },
  'paris': { lat: 48.8566, lng: 2.3522 },
};

app.get("/api/weather-locations", (req, res) => {
  res.json(TAIWAN_LOCATIONS);
});

app.get("/api/weather", async (req, res) => {
  const { region, date } = req.query;
  if (!region || !date || typeof region !== 'string') {
    return res.status(400).json({ error: "Missing region or date" });
  }

  const commonHeaders = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json"
  };

  try {
    let latitude: number | null = null;
    let longitude: number | null = null;

    let normalizedRegion = region.toLowerCase().trim();
    // try to find matching TAIWAN_LOCATIONS by name and use its value
    const matchLoc = TAIWAN_LOCATIONS.find(loc => loc.name === region.trim() || loc.name.replace('臺', '台') === region.trim() || loc.name.replace('台', '臺') === region.trim());
    if (matchLoc) {
      normalizedRegion = matchLoc.value.toLowerCase();
    }

    if (COMMON_COORDINATES[normalizedRegion]) {
      latitude = COMMON_COORDINATES[normalizedRegion].lat;
      longitude = COMMON_COORDINATES[normalizedRegion].lng;
    } else {
      // Step 1: Geocoding with retry logic
      let geoSuccess = false;
      try {
        const geoRes = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(region)}&count=1&language=en&format=json`, {
          headers: commonHeaders,
          timeout: 12000
        });
        const geoData = geoRes.data;
        if (geoData && geoData.results && geoData.results[0]) {
          latitude = geoData.results[0].latitude;
          longitude = geoData.results[0].longitude;
          geoSuccess = true;
        }
      } catch (e: any) {
        console.error("Primary geocoding failed:", e.message);
      }

      if (!geoSuccess) {
        try {
          // Fallback to OpenStreetMap Nominatim API
          const geoResFall = await axios.get(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(region)}&format=json&limit=1`, {
            headers: {
              "User-Agent": "TravelPlannerApp/1.0",
              "Accept": "application/json"
            },
            timeout: 12000
          });
          const geoDataFall = geoResFall.data;
          if (geoDataFall && geoDataFall.length > 0) {
            latitude = parseFloat(geoDataFall[0].lat);
            longitude = parseFloat(geoDataFall[0].lon);
          } else {
             return res.json({ error: "Geocoding location not found" });
          }
        } catch (e2: any) {
          console.error("Fallback geocoding failed:", e2.message);
          return res.json({ error: "Geocoding service unavailable" });
        }
      }
    }

    if (latitude !== null && longitude !== null) {
      try {
        const weatherRes = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`, {
          headers: commonHeaders,
          timeout: 12000
        });
        const weatherData = weatherRes.data;

        if (weatherData.daily && weatherData.daily.time) {
          const dateIdx = weatherData.daily.time.indexOf(date);
          if (dateIdx !== -1) {
            return res.json({
              code: weatherData.daily.weathercode[dateIdx],
              max: weatherData.daily.temperature_2m_max[dateIdx],
              min: weatherData.daily.temperature_2m_min[dateIdx]
            });
          }
        }
        return res.json({ error: "No data for date" });
      } catch (e) {
        console.error("Weather forecast failed:", (e as any).message);
        return res.json({ error: "Forecast service unavailable" });
      }
    } else {
      return res.json({ error: "Region not found" });
    }
  } catch (error: any) {
    console.error("Critical weather api error:", error.message);
    return res.json({ error: "Internal weather error" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
