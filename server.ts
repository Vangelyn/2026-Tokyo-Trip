import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
const PORT = 3000;

app.use(express.json());

import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

// API: Exchange Rates from Bank of Taiwan
app.get("/api/rates", async (req, res) => {
  try {
    const { stdout } = await execPromise("python3 scripts/fetch_rates.py");
    const result = JSON.parse(stdout);
    
    if (result.error) {
      throw new Error(result.error);
    }

    res.json({ rates: result.rates, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Fetch rates error:", error);
    res.status(500).json({ error: "Failed to fetch exchange rates via python" });
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

app.get("/api/weather-locations", (req, res) => {
  res.json(TAIWAN_LOCATIONS);
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
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

startServer();
