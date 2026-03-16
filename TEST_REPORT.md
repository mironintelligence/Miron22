# Test Raporu

Tarih: 2026-03-16

## Özet

- Backend testleri: 52 geçti, 1 atlandı
- Frontend testleri: 3 dosya, 6 test geçti
- Frontend lint: geçti
- Frontend build: geçti
- Backend coverage: %56
- Frontend coverage: %3.5
- npm audit (frontend): 0 zafiyet
- pip-audit (python ortamı): 4 pakette 5 zafiyet (düzeltme için Python 3.10+ gerekiyor)
- Bandit: yüksek seviye bulgu yok

## Backend

### Pytest

```
52 passed, 1 skipped
```

### Yeni modül testleri
- Contracts: analiz (detaylı JSON), karşılaştırma, madde üretimi, export (UDF/DOCX/PDF) için ek testler eklendi: [test_contract_advanced.py](file:///Users/kerimaydemir/Miron-CLEAN/backend/tests/test_contract_advanced.py)
- Contracts: dosya ile analiz (TXT upload) için ek test eklendi: [test_contract_advanced.py](file:///Users/kerimaydemir/Miron-CLEAN/backend/tests/test_contract_advanced.py)
- Contracts: analiz raporu önizleme + TXT/PDF/DOCX export testleri eklendi: [test_contract_analysis_report.py](file:///Users/kerimaydemir/Miron-CLEAN/backend/tests/test_contract_analysis_report.py)
- Reminders: çoklu hatırlatma tetikleyicileri için migration eklendi: [020_case_reminder_triggers.sql](file:///Users/kerimaydemir/Miron-CLEAN/backend/migrations/020_case_reminder_triggers.sql)
 - Test altyapısı: `ENVIRONMENT=test` için in-memory user/session store ve testlerde rate limit bypass eklendi.

### Coverage (pytest-cov)

```
TOTAL                              5207   2301    56%
```

## Frontend

### Vitest

```
Test Files  3 passed (3)
Tests       6 passed (6)
```

### Coverage (v8)

```
All files          |    3.64 |     2.37 |    1.78 |    3.87 |
All files          |     3.5 |     2.28 |    1.71 |    3.73 |
```

### ESLint

```
eslint .
```

### Build

```
vite build
✓ built in 2.27s
```

## Güvenlik

### Bandit (statik analiz)

```
Total issues (by severity):
  Low: 24
  Medium: 13
  High: 0
```

### pip-audit (bağımlılık zafiyet taraması)

```
Found 5 known vulnerabilities in 4 packages
filelock         3.19.1   ...  Fix: 3.20.1 / 3.20.3
pdfminer-six     20251107 ...  Fix: 20251230
pillow           11.3.0   ...  Fix: 12.1.1
python-multipart 0.0.20   ...  Fix: 0.0.22
```

Not: Bu düzeltme sürümleri Python 3.10+ istiyor; mevcut çalışma ortamı Python 3.9 olduğu için paket yükseltmesi uygulanamıyor.

### npm audit (frontend)

```
found 0 vulnerabilities
```

## Performans / Yük / Stres

### In-process yük testi (test modunda rate limit devre dışı)

```
{'threads': 8, 'requests': 1600, 'total_s': 5.2055, 'rps': 307.37, 'ok': 1600, 'limited': 0, 'other': 0, 'thread_s_min': 5.1414, 'thread_s_p50': 5.1961, 'thread_s_max': 5.2036}
```

### DB stres testi (pool reset + recovery)

```
✅ RECOVERY SUCCESS! Count: 0
✅ DB RESILIENCE MODE ACTIVE
```
