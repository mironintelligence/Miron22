import logging
import asyncio
from typing import List, Dict, Any, AsyncGenerator, Optional, Tuple
from bs4 import BeautifulSoup
from master_ingestion.async_client import client
from master_ingestion.decision_validator import validator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("resolvers.aym")

class AYMEndpointResolver:
    def __init__(self, subdomain: str = "kararlarbilgibankasi"):
        self.subdomain = subdomain
        self.base_url = f"https://{subdomain}.anayasa.gov.tr"
        
    async def traverse_pages(self, start_page: int = 1) -> AsyncGenerator[Tuple[int, List[Dict[str, Any]]], None]:
        """
        Yields (page_number, list_of_docs)
        """
        logger.info(f"Resolving AYM ({self.subdomain}) via Pagination starting at {start_page}...")
        
        page = start_page
        consecutive_empty = 0
        
        while True:
            url = f"{self.base_url}/?page={page}"
            page_docs = []
            
            try:
                # Browser-like headers for HTML navigation
                headers = {
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Upgrade-Insecure-Requests": "1",
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "none",
                    "Sec-Fetch-User": "?1"
                }
                resp = await client.fetch(url, headers=headers)
                
                if isinstance(resp, dict) and resp.get("status") != 200:
                    logger.warning(f"Status {resp.get('status')} on page {page}. Stopping.")
                    break
                
                if resp["type"] == "html":
                    soup = BeautifulSoup(resp["data"], 'html.parser')
                    
                    # Debug: Check if we are blocked
                    page_title = soup.title.get_text(strip=True) if soup.title else "No Title"
                    if "captcha" in page_title.lower() or "security" in page_title.lower():
                        logger.warning(f"Blocked (Captcha) on page {page}. Title: {page_title}")
                        break
                        
                    # Extract Links
                    # Selector strategy: Find ALL links that look like decision details
                    # Patterns: /BB/..., /Norm/..., /ND/..., /Karar/...
                    all_links = soup.find_all("a", href=True)
                    
                    unique_links = set()
                    
                    for link in all_links:
                        href = link['href']
                        
                        # Check valid patterns
                        if not any(x in href for x in ["/BB/", "/Norm/", "/ND/", "/Karar/"]):
                            continue
                            
                        # Filter out non-detail links
                        if "Dil=" in href or "Siralama" in href: continue
                        
                        # Normalize URL
                        if href.startswith("/"):
                            full_url = f"{self.base_url}{href}"
                        else:
                            full_url = href
                            
                        unique_links.add(full_url)
                            
                    for full_url in unique_links:
                        # Detail Fetch
                        detail = await self._fetch_detail(full_url)
                        if detail:
                            is_valid, reason = validator.validate(detail)
                            if is_valid:
                                page_docs.append(detail)
                            else:
                                # Log invalid but maybe keep going
                                pass
                    
                    yield page, page_docs
                    
                    if not page_docs:
                        logger.info(f"Page {page} yielded 0 docs. Checking for end...")
                        # Debug Dump
                        if page == 1:
                            with open(f"backend/diagnostics/debug_page_{page}.html", "w") as f:
                                f.write(str(soup))
                            logger.info(f"Dumped Page {page} to debug_page_{page}.html")
                            
                        # Check for pagination controls to be sure
                        if not soup.select(".pagination"):
                            break
                        consecutive_empty += 1
                        if consecutive_empty > 2: break
                    else:
                        consecutive_empty = 0
                        logger.info(f"AYM ({self.subdomain}) Page {page}: Yielded {len(page_docs)} docs")
                    
                    page += 1
                    # Safety
                    if page > 10000: break
                    
                else:
                    break

            except Exception as e:
                logger.error(f"Traversal Error p{page}: {e}")
                await asyncio.sleep(5)
                consecutive_empty += 1
                if consecutive_empty > 5: break

    async def _fetch_detail(self, url: str) -> Optional[Dict[str, Any]]:
        try:
            resp = await client.fetch(url)
            if resp["type"] != "html": return None
            
            soup = BeautifulSoup(resp["data"], 'html.parser')
            
            # Content Selector
            content_div = soup.find('div', class_='karar-metni') or soup.find('div', id='content') or soup.find('article')
            
            # Metadata
            # .kararbilgileri contains: "2025/10406 | Esas (İhlal)| ..."
            info_div = soup.find(class_='kararbilgileri')
            info_text = info_div.get_text(strip=True) if info_div else ""
            
            # Title
            title_div = soup.find(class_='bkararbaslik')
            title = title_div.get_text(strip=True) if title_div else ""
            
            if not content_div: 
                 # Try to extract text from body if specific div missing
                 # But exclude nav/footer
                 for tag in soup.select("nav, footer, .header, .sidebar"):
                     tag.decompose()
                 full_text = soup.get_text(separator="\n", strip=True)
            else:
                full_text = content_div.get_text(separator="\n", strip=True)
            
            # Basic parsing of info_text
            # "2025/10406 | Esas (İhlal)| ..."
            parts = info_text.split('|')
            dec_no = parts[0].strip() if parts else None
            
            import hashlib
            return {
                "source": "AYM",
                "court": "Anayasa Mahkemesi",
                "decision_date": None, # Extract from info_text if possible
                "decision_no": dec_no,
                "full_text": full_text,
                "raw_json": {"info": info_text, "title": title},
                "hash": hashlib.sha256(full_text.encode('utf-8')).hexdigest(),
                "source_url": url,
                "summary": full_text[:500],
                "referenced_laws": [],
                "citation_count": 0
            }
        except:
            return None
