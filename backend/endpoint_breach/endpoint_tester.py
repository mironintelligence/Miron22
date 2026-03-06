import time
import json
import httpx
import sys
import os

# Adjust path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from endpoint_breach.bootstrap_session import BootstrapSession
from endpoint_breach.diagnostic_logger import logger

class EndpointTester:
    def __init__(self):
        self.base_url = "https://kararlarbilgibankasi.anayasa.gov.tr"
        self.bootstrap = BootstrapSession(self.base_url)
        
    def run_breach(self):
        print("\n--- 🛡️ ENDPOINT BREACH TEST: AYM ---")
        
        # 1. Bootstrap
        if not self.bootstrap.run():
            logger.log_finding("Bootstrap failed. Aborting.", False)
            return
            
        client = self.bootstrap.get_client()
        tokens = self.bootstrap.get_tokens()
        
        # 2. Construct Surgical Request
        # Target: /Home/Index (POST) - This is the standard MVC pattern for this site
        # Based on manual inspection, AYM uses a POST to load the table.
        # It accepts JSON payload.
        
        target_url = f"{self.base_url}/Home/Index"
        
        # Headers update for AJAX
        client.headers.update({
            "Accept": "*/*",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
            "Origin": self.base_url,
            "Referer": f"{self.base_url}/"
        })
        
        # Payload
        # We need to send form data usually for these .NET apps, sometimes JSON.
        # Let's try Form Data first as it's default for jQuery.ajax
        
        payload = {
            "KararTarihiBaslangic": "01.01.2024",
            "KararTarihiBitis": "31.12.2024",
            "Kelime": "",
            "Page": "1"
        }
        
        # Inject Token if exists
        if '__RequestVerificationToken' in tokens:
            payload['__RequestVerificationToken'] = tokens['__RequestVerificationToken']
            
        logger.log_request("POST", target_url, dict(client.headers), dict(client.cookies), payload)
        
        try:
            # Try 1: Form Data
            logger.logger.info("👉 Attempt 1: Form Data POST")
            response = client.post(target_url, data=payload)
            logger.log_response(response)
            
            if self.validate_success(response):
                return
                
            # Try 2: JSON Payload
            logger.logger.info("👉 Attempt 2: JSON Payload POST")
            client.headers["Content-Type"] = "application/json"
            response = client.post(target_url, json=payload)
            logger.log_response(response)
            
            if self.validate_success(response):
                return
                
            # Try 3: GET /Ara (Search URL directly)
            logger.logger.info("👉 Attempt 3: GET /Ara with Query Params")
            client.headers.pop("Content-Type", None)
            search_url = f"{self.base_url}/Ara?BaslangicTarihi=01.01.2024&BitisTarihi=31.12.2024&Page=1"
            response = client.get(search_url)
            logger.log_response(response)
            
            # DUMP HTML
            with open("aym_response.html", "w") as f:
                f.write(response.text)
            logger.log_finding("Dumped GET response to aym_response.html", True)
            
            # Parse Form Action
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(response.text, 'html.parser')
            form = soup.find('form')
            if form:
                action = form.get('action')
                logger.log_finding(f"Found Form Action: {action}", True)
                
                # Try POSTing to this action
                if action:
                    post_url = f"{self.base_url}{action}" if action.startswith("/") else action
                    logger.logger.info(f"👉 Attempt 5: POST to Form Action {post_url}")
                    
                    # Re-attach content type
                    client.headers.update({
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Referer": search_url
                    })
                    
                    # Add hidden inputs to payload
                    for input_tag in form.find_all('input'):
                        if input_tag.get('name') and input_tag.get('name') not in payload:
                            payload[input_tag.get('name')] = input_tag.get('value', '')
                            
                    response = client.post(post_url, data=payload)
                    logger.log_response(response)
                    if self.validate_success(response):
                        return
                        
        except Exception as e:
            logger.logger.error(f"Breach Execution Error: {e}")

        # Try 6: GET /Ara with CORRECT Query Params (KararTarihiBaslangic)
        logger.logger.info("👉 Attempt 6: GET /Ara with Correct Params")
        search_url = f"{self.base_url}/Ara?KararTarihiBaslangic=01.01.2024&KararTarihiBitis=31.12.2024"
        response = client.get(search_url)
        logger.log_response(response)
        
        # Try 7: GET /?page=2 (Pagination Test)
        logger.logger.info("👉 Attempt 7: GET /?page=2")
        response = client.get(f"{self.base_url}/?page=2")
        logger.log_response(response)
        
        if self.inspect_html_for_data(response.text):
            return

    def inspect_html_for_data(self, html: str) -> bool:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, 'html.parser')
        
        # Check for Result Table
        table = soup.find('table')
        if table:
            rows = table.find_all('tr')
            logger.log_finding(f"Found HTML Table with {len(rows)} rows", True)
            if len(rows) > 2:
                logger.log_finding("🏆 SUCCESS: HTML Table has data!", True)
                return True
                
        # Check for Script JSON
        scripts = soup.find_all('script')
        for s in scripts:
            if s.string and ("Results" in s.string or "initialState" in s.string):
                logger.log_finding(f"Found suspicious script: {s.string[:100]}...", True)
                
        return False

    def validate_success(self, response) -> bool:
        # Check 1: Status 200
        if response.status_code != 200:
            logger.log_finding(f"Status {response.status_code} is not 200", False)
            return False
            
        # Check 2: Content
        # If JSON, great. If HTML table, also acceptable if it contains data.
        if "application/json" in response.headers.get("content-type", ""):
            try:
                data = response.json()
                # Check if list
                if isinstance(data, list) and len(data) > 0:
                    logger.log_finding("🏆 SUCCESS: Valid JSON Array returned!", True)
                    print(json.dumps(data[0], indent=2))
                    return True
                elif isinstance(data, dict) and "data" in data:
                     logger.log_finding("🏆 SUCCESS: Valid JSON Object returned!", True)
                     return True
            except:
                pass
                
        # HTML Check
        if "Karar/Detay" in response.text:
             logger.log_finding("🏆 SUCCESS: HTML contains decision links!", True)
             return True
             
        if "bulunamadı" in response.text:
            logger.log_finding("Empty Results (Logic works, just no data)", True)
            return True
            
        logger.log_finding("Response valid but no data found or unknown format", False)
        return False

if __name__ == "__main__":
    tester = EndpointTester()
    tester.run_breach()
