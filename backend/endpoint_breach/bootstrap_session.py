import httpx
import logging
from endpoint_breach.diagnostic_logger import logger
from endpoint_breach.token_extractor import TokenExtractor

class BootstrapSession:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.client = httpx.Client(http2=True, verify=False, timeout=30.0)
        self.tokens = {}
        
        # Hardened Headers for Initial Visit
        self.client.headers.update({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1"
        })

    def run(self):
        logger.log_finding(f"Bootstrapping session for {self.base_url}", True)
        
        try:
            response = self.client.get(self.base_url)
            logger.log_response(response)
            
            # Extract Tokens
            self.tokens = TokenExtractor.extract_csrf(response.text)
            if self.tokens:
                logger.log_finding(f"Tokens Extracted: {self.tokens}", True)
            else:
                logger.log_finding("No CSRF tokens found in HTML", False)
                
            # Log Cookies
            if self.client.cookies:
                logger.log_finding(f"Cookies Harvested: {list(self.client.cookies.keys())}", True)
            else:
                logger.log_finding("No Cookies set by server", False)
                
            return True
            
        except Exception as e:
            logger.logger.error(f"Bootstrap Failed: {e}")
            return False

    def get_client(self) -> httpx.Client:
        return self.client
        
    def get_tokens(self) -> dict:
        return self.tokens
