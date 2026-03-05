from bs4 import BeautifulSoup
from typing import Dict, Optional

class TokenExtractor:
    @staticmethod
    def extract_csrf(html: str) -> Dict[str, str]:
        soup = BeautifulSoup(html, 'html.parser')
        tokens = {}
        
        # 1. __RequestVerificationToken
        rvt = soup.find('input', {'name': '__RequestVerificationToken'})
        if rvt:
            tokens['__RequestVerificationToken'] = rvt.get('value')
            
        # 2. Meta tags
        csrf_token = soup.find('meta', {'name': 'csrf-token'})
        if csrf_token:
            tokens['X-CSRF-TOKEN'] = csrf_token.get('content')
            
        return tokens
