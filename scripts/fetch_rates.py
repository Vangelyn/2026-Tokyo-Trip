import urllib.request
import json
import re
import sys

def fetch_rates():
    url = "https://rate.bot.com.tw/xrt?Lang=zh-TW"
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8')
        
        rates = {"TWD": 1.0}
        
        # We look for rows in the table
        # A typical row looks like: ... <div class="visible-phone print_show">美金 (USD)</div> ... <td data-table="本行即期賣出"...>32.12</td>
        
        # First, split by rows to avoid cross-row matching
        rows = html.split('<tr')
        
        for row in rows[1:]: # skip the first part before the first <tr>
            # Extract currency code
            code_match = re.search(r'\(([A-Z]{3})\)', row)
            if not code_match:
                continue
            code = code_match.group(1)
            
            # Extract spot sell rate
            # Look for td with data-table="本行即期賣出" or just the position
            # Pattern: <td ... data-table="本行即期賣出" ... class="text-right ...">32.12</td>
            rate_match = re.search(r'data-table="本行即期賣出"[^>]*>([\d\.]+)<', row)
            if rate_match:
                try:
                    rates[code] = float(rate_match.group(1))
                except ValueError:
                    pass
        
        return {"rates": rates, "updatedAt": ""}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    result = fetch_rates()
    print(json.dumps(result))
