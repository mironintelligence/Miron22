import logging
import json
import datetime

class DiagnosticLogger:
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.DEBUG)
        
        # Console Handler
        ch = logging.StreamHandler()
        ch.setLevel(logging.DEBUG)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        ch.setFormatter(formatter)
        self.logger.addHandler(ch)
        
    def log_request(self, method: str, url: str, headers: dict, cookies: dict, data: dict = None):
        self.logger.info(f"🚀 REQUEST: {method} {url}")
        self.logger.debug(f"   Headers: {json.dumps(headers, indent=2, default=str)}")
        self.logger.debug(f"   Cookies: {json.dumps(cookies, indent=2, default=str)}")
        if data:
            self.logger.debug(f"   Payload: {json.dumps(data, indent=2, default=str)}")
            
    def log_response(self, response):
        status = response.status_code
        try:
            content_sample = response.text[:500]
        except:
            content_sample = "[Binary/Unreadable]"
            
        level = logging.INFO if status == 200 else logging.WARNING
        if status in [403, 429]: level = logging.CRITICAL
        
        self.logger.log(level, f"📥 RESPONSE: {status} {response.http_version}")
        self.logger.debug(f"   Headers: {json.dumps(dict(response.headers), indent=2)}")
        self.logger.info(f"   Content Preview: {content_sample}...")
        
    def log_finding(self, message: str, success: bool = True):
        icon = "✅" if success else "❌"
        self.logger.info(f"{icon} FINDING: {message}")

logger = DiagnosticLogger("breach")
