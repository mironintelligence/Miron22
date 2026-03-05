import hashlib
import re

def simhash(text: str) -> str:
    if not text: return "0"
    
    # 64-bit SimHash
    width = 64
    v = [0] * width
    
    # Tokenize (simple word split)
    tokens = re.findall(r'\w+', text.lower())
    
    for t in tokens:
        # Hash token
        h = int(hashlib.md5(t.encode('utf-8')).hexdigest(), 16)
        
        for i in range(width):
            if h & (1 << i):
                v[i] += 1
            else:
                v[i] -= 1
                
    # Build result
    fingerprint = 0
    for i in range(width):
        if v[i] > 0:
            fingerprint |= (1 << i)
            
    return hex(fingerprint)[2:]
