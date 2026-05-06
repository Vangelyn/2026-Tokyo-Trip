import axios from "axios";
import * as cheerio from "cheerio";

async function run() {
    const res = await axios.get("https://steam.oxxostudio.tw/category/python/spider/current-weather.html");
    const $ = cheerio.load(res.data);
    console.log($("pre code").text());
}
run();
