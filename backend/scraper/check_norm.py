import httpx
from bs4 import BeautifulSoup

def run():
    client = httpx.Client(http2=True, verify=False)
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }
    
    base_url = "https://normkararlarbilgibankasi.anayasa.gov.tr"
    print(f"Checking {base_url}...")
    
    try:
        r1 = client.get(f"{base_url}/?page=1", headers=headers)
        if r1.status_code != 200:
            print(f"Failed to load Page 1: {r1.status_code}")
            return

        soup1 = BeautifulSoup(r1.text, 'html.parser')
        titles1 = [t.get_text(strip=True) for t in soup1.select(".bkararbaslik titles")]
        print(f"Page 1 Count: {len(titles1)}")
        
        # Check total count if available
        count_div = soup1.find(class_="bulunankararsayisi")
        if count_div:
            print(f"Total Decisions Reported: {count_div.get_text().strip()}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run()
