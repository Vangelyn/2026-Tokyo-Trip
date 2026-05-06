import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
const PORT = 3000;

app.use(express.json());

// API: Exchange Rates from Bank of Taiwan
app.get("/api/rates", async (req, res) => {
  try {
    const response = await axios.get("https://rate.bot.com.tw/xrt?Lang=zh-TW", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      },
      timeout: 10000
    });
    const $ = cheerio.load(response.data);
    const rates: Record<string, number> = { TWD: 1 };

    $("table tbody tr").each((_, element) => {
      const currencyText = $(element).find(".visible-phone").text().trim();
      const spotSellRate = $(element).find("td[data-table='本行即期賣出']").text().trim();
      
      const currencyCodeMatch = currencyText.match(/\(([A-Z]+)\)/);
      if (currencyCodeMatch && spotSellRate && spotSellRate !== "-") {
        const code = currencyCodeMatch[1];
        const val = parseFloat(spotSellRate);
        if (!isNaN(val)) {
          rates[code] = val;
        }
      }
    });

    res.json({ rates, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Fetch rates error:", error);
    res.status(500).json({ error: "Failed to fetch exchange rates from Bank of Taiwan" });
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
