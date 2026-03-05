import re
import logging
from typing import Dict, Any, Tuple

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("validator")

class DecisionValidator:
    def __init__(self):
        self.min_length = 2000
        self.keywords = ["GEREKÇE", "HÜKÜM", "SONUÇ", "KARAR", "ESAS", "İSTEM"]
        
    def validate(self, doc: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Validates a decision document.
        Returns (is_valid, reason)
        """
        text = doc.get('full_text', '')
        
        # 1. Length Check
        if len(text) < self.min_length:
            return False, f"Too short ({len(text)} chars)"
            
        # 2. Keyword Check
        if not any(k in text.upper() for k in self.keywords):
            return False, "Missing structural keywords"
            
        # 3. Content Check
        if "captcha" in text.lower() or "access denied" in text.lower():
            return False, "Blocked/Captcha content"
            
        return True, "Valid"

validator = DecisionValidator()
