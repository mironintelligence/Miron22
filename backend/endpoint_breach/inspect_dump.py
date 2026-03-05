from bs4 import BeautifulSoup
import re

with open("aym_response.html", "r") as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')
scripts = soup.find_all('script')

print(f"Found {len(scripts)} scripts.")

for i, s in enumerate(scripts):
    if s.string:
        # Look for JSON objects or URLs
        if "var " in s.string or "const " in s.string or "let " in s.string:
             print(f"--- Script {i} ---")
             # Print first 200 chars
             print(s.string[:200].strip())
             
             # Look for specific keywords
             if "url:" in s.string or "action:" in s.string or "endpoint" in s.string:
                 print("!!! POTENTIAL ENDPOINT FOUND !!!")
                 matches = re.findall(r'(url|action)\s*:\s*["\']([^"\']+)["\']', s.string)
                 for m in matches:
                     print(f"  Match: {m}")
