import httpx
from bs4 import BeautifulSoup

def run():
    client = httpx.Client(http2=True, verify=False)
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }
    
    print("Fetching Page 1...")
    r1 = client.get("https://kararlarbilgibankasi.anayasa.gov.tr/?page=1", headers=headers)
    soup1 = BeautifulSoup(r1.text, 'html.parser')
    titles1 = [t.get_text(strip=True) for t in soup1.select(".bkararbaslik titles")]
    
    print("Fetching Page 2...")
    r2 = client.get("https://kararlarbilgibankasi.anayasa.gov.tr/?page=2", headers=headers)
    soup2 = BeautifulSoup(r2.text, 'html.parser')
    titles2 = [t.get_text(strip=True) for t in soup2.select(".bkararbaslik titles")]
    
    print("\nPage 1 Titles (First 3):")
    for t in titles1[:3]: print(f"- {t}")
    
    print("\nPage 2 Titles (First 3):")
    for t in titles2[:3]: print(f"- {t}")
    
    if titles1 != titles2:
        print("\n✅ SUCCESS: Pagination works!")
    else:
        print("\n❌ FAILURE: Pages are identical.")

if __name__ == "__main__":
    run()
