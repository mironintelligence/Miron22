"""
Sentetik Türk hukuku dilekçe ve sözleşme eğitim verisi üretici.

50+ şablon → ~100k instruction-tuning örneği.
Çalıştır: python3 -m data.processors.dilekce_generator

Çıktı: processed/dilekce_sozlesme.jsonl
"""
from __future__ import annotations

import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROCESSED_DIR = ROOT / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

SYSTEM_PROMPT = (
    "Sen MironLaw 1.0, Türk hukuku konusunda uzmanlaşmış bir yapay zeka asistanısın. "
    "Yargıtay, Danıştay ve Anayasa Mahkemesi içtihatlarına hakim, "
    "Türk Medeni Kanunu, Borçlar Kanunu, Ceza Kanunu ve diğer mevzuata göre "
    "doğru, kapsamlı ve pratik hukuki analizler yaparsın. "
    "Yanıtların Türkçe, net ve profesyonel olur."
)

ERKEK_ISIMLER = [
    "Ahmet", "Mehmet", "Mustafa", "Ali", "Hüseyin", "İbrahim", "Hasan",
    "Murat", "Ömer", "Yusuf", "İsmail", "Emre", "Can", "Burak", "Serkan",
    "Kerem", "Cem", "Berk", "Oğuz", "Tarık",
]
KADIN_ISIMLER = [
    "Ayşe", "Fatma", "Zeynep", "Emine", "Hatice", "Elif", "Merve",
    "Büşra", "Seda", "Gülşen", "Arzu", "Tuğba", "Çiğdem", "Neslihan", "Özge",
]
SOYADLAR = [
    "Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Yıldız", "Yıldırım",
    "Öztürk", "Aydın", "Özdemir", "Arslan", "Doğan", "Kılıç", "Aslan",
    "Çetin", "Koç", "Kurt", "Acar", "Güneş", "Polat",
]
SEHIRLER = [
    "İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Adana",
    "Konya", "Gaziantep", "Mersin", "Kayseri", "Eskişehir",
]
MAHKEMELER = [
    "İstanbul", "Ankara", "İzmir", "Bursa", "Antalya",
    "Adana", "Konya", "Gaziantep",
]
ILCELER = [
    "Kadıköy", "Beşiktaş", "Şişli", "Üsküdar", "Kartal",
    "Çankaya", "Yenimahalle", "Keçiören", "Konak", "Bornova",
]
TC_NO = lambda: "".join([str(random.randint(0, 9)) for _ in range(11)])
IBAN = lambda: "TR" + "".join([str(random.randint(0, 9)) for _ in range(24)])


def _erkek() -> tuple[str, str]:
    return random.choice(ERKEK_ISIMLER), random.choice(SOYADLAR)


def _kadin() -> tuple[str, str]:
    return random.choice(KADIN_ISIMLER), random.choice(SOYADLAR)


def _tarih(yil_min=2020, yil_max=2025) -> str:
    gun = random.randint(1, 28)
    ay = random.randint(1, 12)
    yil = random.randint(yil_min, yil_max)
    return f"{gun:02d}/{ay:02d}/{yil}"


def _para(min_tl=1000, max_tl=500000) -> str:
    miktar = random.randint(min_tl, max_tl)
    return f"{miktar:,}".replace(",", ".") + " TL"


def _mahkeme(tur="Asliye Hukuk") -> str:
    return f"{random.choice(MAHKEMELER)} {random.randint(1, 8)}. {tur} Mahkemesi"


def _msg(user: str, asst: str) -> dict:
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user},
            {"role": "assistant", "content": asst},
        ]
    }


# ─────────────────────────────────────────────────────────────────────────────
# ŞABLONLAR
# ─────────────────────────────────────────────────────────────────────────────

def bosluk_dilekce() -> dict:
    ad1, soy1 = _kadin() if random.random() > 0.5 else _erkek()
    ad2, soy2 = _erkek() if random.random() > 0.5 else _kadin()
    evlilik = _tarih(2010, 2020)
    mahkeme = _mahkeme("Aile")
    sehir = random.choice(SEHIRLER)
    cocuk = random.randint(0, 3)
    nafaka = _para(2000, 15000)
    sebep = random.choice([
        "ortak hayatın çekilmez bir hal alması",
        "şiddetli geçimsizlik",
        "sadakatsizlik",
        "terk",
        "ekonomik şiddet ve hakaret",
        "anlaşmazlık ve derin uyumsuzluk",
    ])
    cocuk_kloz = ""
    if cocuk > 0:
        isimler = ", ".join(
            f"{random.choice(ERKEK_ISIMLER + KADIN_ISIMLER)} ({random.randint(1, 15)} yaşında)"
            for _ in range(cocuk)
        )
        cocuk_kloz = (
            f"\n\n3. {isimler} isimli müşterek {cocuk} çocuğumuzun velayetinin tarafıma "
            f"bırakılmasına ve karşı tarafın {nafaka} aylık nafaka ödemesine,"
        )

    dilekce = f"""{mahkeme}'NE

DAVACI    : {ad1} {soy1}, TC Kimlik No: {TC_NO()}
DAVALI    : {ad2} {soy2}, TC Kimlik No: {TC_NO()}
KONU      : Boşanma ve Fer'i Taleplere İlişkin Dava Dilekçesidir.

AÇIKLAMALAR:

1. Davacı ile davalı {evlilik} tarihinde {sehir}'de evlenmiştir.

2. Evlilik birliği boyunca {sebep} nedeniyle evlilik birliği temelinden sarsılmış ve \
ortak hayatın devamı tarafımca artık katlanılmaz hale gelmiştir.{cocuk_kloz}

HUKUK SEBEPLERİ:
TMK m. 161-184 (Boşanma sebepleri ve hükümleri), TMK m. 174 (Tazminat), \
TMK m. 175 (Yoksulluk nafakası), TMK m. 182 (Velayet)

HUKUKİ DELİLLER:
Nüfus kayıtları, tanık beyanları, fotoğraflar, mesaj kayıtları ve sair deliller.

SONUÇ VE TALEP:
Yukarıda arz edilen sebeplerle evliliğin Türk Medeni Kanunu'nun ilgili hükümleri \
çerçevesinde sona erdirilmesine, yargılama giderleri ile vekalet ücretinin karşı \
tarafa yüklenmesine karar verilmesini saygıyla talep ederim. {_tarih()}

Davacı: {ad1} {soy1}"""

    user = f"Benim için boşanma davası dilekçesi yazar mısın? " \
           f"Eşimle {evlilik} tarihinde evlendik, {sebep} nedeniyle boşanmak istiyorum."
    return _msg(user, dilekce)


def kira_sozlesmesi() -> dict:
    ad1, soy1 = _erkek() if random.random() > 0.5 else _kadin()
    ad2, soy2 = _kadin() if random.random() > 0.5 else _erkek()
    ilce = random.choice(ILCELER)
    sehir = random.choice(SEHIRLER)
    kira = _para(3000, 25000)
    depozit = f"{int(kira.split('.')[0].replace('.', '')) * 3:,}".replace(",", ".") + " TL"
    baslangic = _tarih(2024, 2026)
    sure = random.choice([12, 24, 36])

    sozlesme = f"""KİRA SÖZLEŞMESİ

KİRAYA VEREN (KİRALAYAN):
Ad Soyad: {ad1} {soy1}
TC Kimlik No: {TC_NO()}
Adres: {ilce}, {sehir}

KİRACl:
Ad Soyad: {ad2} {soy2}
TC Kimlik No: {TC_NO()}

KİRALANAN TAŞINMAZIN BİLGİLERİ:
Adres: {ilce} Mah., {sehir}
Tapu Bilgisi: {sehir} İli, {ilce} İlçesi, ... Pafta, ... Ada, ... Parsel

MADDE 1 – KONU
Kiralayan, yukarıda belirtilen taşınmazı {baslangic} tarihinden itibaren {sure} ay \
süreyle kiracıya kiraya vermiştir.

MADDE 2 – KİRA BEDELİ
Aylık kira bedeli {kira}'dır. Kira bedeli her ayın 1-5'i arasında kiracı tarafından \
kiralayan adına ödenir. Ödeme IBAN: {IBAN()} hesabına yapılacaktır.

MADDE 3 – DEPOZİTO
Kiracı, taşınmazı teslim alırken {depozit} tutarında depozito yatıracaktır. \
Depozito, kira süresi bitiminde, taşınmazın hasarsız iade edilmesi koşuluyla iade edilir.

MADDE 4 – KİRA ARTIŞI
Kira bedeli, her yıl TÜİK tarafından açıklanan 12 aylık TÜFE oranı esas alınarak \
artırılır (6098 Sayılı TBK m. 344).

MADDE 5 – KİRACININ YÜKÜMLÜLÜKLERİ
Kiracı; taşınmazı itina ile kullanmak, komşuluk kurallarına uymak, belirlenen \
kira bedelini zamanında ödemek ve taşınmazda izinsiz tadilat yapmamakla yükümlüdür.

MADDE 6 – KİRALAYANIN YÜKÜMLÜLÜKLERİ
Kiralayan; taşınmazı sözleşmede belirtilen amaç için elverişli halde teslim etmek \
ve kira süresi boyunca bu hali devam ettirmekle yükümlüdür.

MADDE 7 – UYUŞMAZLIK ÇÖZÜMÜ
İşbu sözleşmeden doğan uyuşmazlıklarda {sehir} Mahkemeleri ve İcra Daireleri yetkilidir.

KİRALAYAN: {ad1} {soy1} — Tarih: {_tarih(2024, 2026)}
KİRACI: {ad2} {soy2} — Tarih: {_tarih(2024, 2026)}"""

    user = f"Benim için kira sözleşmesi hazırlar mısın? " \
           f"Kiracım {ad2} {soy2}, aylık kira {kira}, {sure} aylık."
    return _msg(user, sozlesme)


def is_akdi() -> dict:
    ad1, soy1 = _erkek() if random.random() > 0.5 else _kadin()
    sirket = f"{random.choice(SOYADLAR)} {random.choice(['A.Ş.', 'Ltd. Şti.', 'Tic. A.Ş.'])}"
    gorev = random.choice([
        "Yazılım Geliştirici", "Muhasebeci", "Pazarlama Uzmanı",
        "İnsan Kaynakları Uzmanı", "Grafik Tasarımcı", "Satış Temsilcisi",
        "Proje Yöneticisi", "Hukuk Müşaviri", "Mali Danışman",
    ])
    maas = _para(15000, 80000)
    baslangic = _tarih(2024, 2026)
    deneme = random.choice([1, 2])
    izin = random.choice([14, 20, 26])

    akid = f"""BELİRSİZ SÜRELİ İŞ SÖZLEŞMESİ

İŞVEREN:
Ticaret Unvanı: {sirket}
Adres: {random.choice(ILCELER)}, {random.choice(SEHIRLER)}

ÇALIŞAN:
Ad Soyad: {ad1} {soy1}
TC Kimlik No: {TC_NO()}

MADDE 1 – GÖREV VE ÇALIŞMA KOŞULLARI
Çalışan, {gorev} pozisyonunda, {baslangic} tarihinden itibaren belirsiz \
süreli tam zamanlı olarak istihdam edilecektir.

MADDE 2 – ÜCRET
Brüt aylık ücret: {maas}. Ücret, her ayın son iş günü çalışanın banka hesabına \
yatırılır.

MADDE 3 – DENEME SÜRESİ
Deneme süresi {deneme} aydır. Deneme süresi içinde taraflar ihbar öneline gerek \
olmaksızın sözleşmeyi sona erdirebilir (4857 s. İş K. m. 15).

MADDE 4 – ÇALIŞMA SÜRESİ
Haftalık çalışma süresi 45 saattir. Fazla çalışma halinde yasal mevzuat \
çerçevesinde ücret ödenir (4857 s. İş K. m. 41).

MADDE 5 – YILLIK İZİN
Çalışan, 4857 sayılı İş Kanunu'nun 53. maddesi uyarınca hizmet yılına göre \
{izin} gün yıllık ücretli izin hakkından yararlanacaktır.

MADDE 6 – GİZLİLİK
Çalışan, işverenin ticari sırlarını, müşteri bilgilerini ve iş süreçlerini \
gizli tutmayı ve işten ayrılma sonrasında da bu yükümlülüğe uymayı kabul eder.

MADDE 7 – FESİH
Sözleşmenin feshine ilişkin ihbar süreleri 4857 sayılı İş Kanunu m. 17 \
uyarınca uygulanır. Kıdem tazminatı 1475 s. Kanun m. 14 hükümlerine tabidir.

İŞVEREN: {sirket}
ÇALIŞAN: {ad1} {soy1}
Tarih: {_tarih(2024, 2026)}"""

    user = f"{ad1} {soy1} adlı çalışan için {gorev} pozisyonunda iş sözleşmesi hazırlar mısın?"
    return _msg(user, akid)


def icra_dilekce() -> dict:
    ad1, soy1 = _erkek() if random.random() > 0.5 else _kadin()
    ad2, soy2 = _kadin() if random.random() > 0.5 else _erkek()
    borc = _para(5000, 200000)
    faiz = random.choice(["yasal faiz", "akdi faiz (%24)", "TCMB avans faizi"])
    sehir = random.choice(SEHIRLER)
    tarih = _tarih(2022, 2025)
    belge = random.choice([
        "imzalı senet", "bono", "çek", "kira sözleşmesi ve borç belgesi",
        "noter onaylı borç senedi",
    ])

    dilekce = f"""{sehir} İCRA DAİRESİ'NE

ALACAKLI : {ad1} {soy1}, TC Kimlik No: {TC_NO()}
          Adres: {random.choice(ILCELER)}, {sehir}
BORÇLU   : {ad2} {soy2}, TC Kimlik No: {TC_NO()}
          Adres: {random.choice(ILCELER)}, {sehir}
KONU     : İlamsız İcra Takibi Talebine İlişkin Dilekçe

AÇIKLAMALAR:

1. {tarih} tarihli {belge} uyarınca borçlu, alacaklıya {borc} tutarında borçludur.

2. Söz konusu borcun ödeme tarihi geçmiş olmasına rağmen borçlu ödeme yapmamıştır.

3. İcra ve İflas Kanunu'nun 58. maddesi uyarınca borçlu aleyhine ilamsız icra \
takibi başlatılmasını talep etme zarureti doğmuştur.

TALEP EDİLEN ALACAK:
- Asıl Alacak: {borc}
- Faiz: {tarih} tarihinden itibaren {faiz}
- İcra giderleri ve vekalet ücreti

HUKUK SEBEPLERİ: İcra ve İflas Kanunu m. 58 vd.

HUKUKİ DELİLLER: {belge.capitalize()}, hesap dökümü ve sair deliller.

SONUÇ VE TALEP:
Yukarıda belirtilen alacağın tahsili amacıyla borçlu aleyhine ilamsız icra \
takibi başlatılmasını saygıyla talep ederim. {_tarih()}

Alacaklı: {ad1} {soy1}"""

    user = f"{ad2} {soy2}'dan {borc} alacağım var, " \
           f"{tarih} tarihli {belge} var elimde. İcra takibi başlatmak istiyorum, dilekçe yazar mısın?"
    return _msg(user, dilekce)


def tazminat_davasi() -> dict:
    ad1, soy1 = _erkek() if random.random() > 0.5 else _kadin()
    ad2, soy2 = _kadin() if random.random() > 0.5 else _erkek()
    zarar = _para(10000, 500000)
    olay = random.choice([
        "iş kazası sonucu uğradığı bedensel zarar",
        "trafik kazası nedeniyle oluşan maddi ve manevi zarar",
        "haksız fiil nedeniyle uğradığı maddi zarar",
        "sözleşmeye aykırılık nedeniyle doğan zarar",
        "ürün hatası nedeniyle oluşan zarar",
    ])
    mahkeme = _mahkeme("Asliye Hukuk")
    tarih = _tarih(2022, 2025)

    dilekce = f"""{mahkeme}'NE

DAVACI   : {ad1} {soy1}, TC: {TC_NO()}
DAVALI   : {ad2} {soy2}, TC: {TC_NO()}
KONU     : Maddi ve Manevi Tazminat Talebi

OLAYLAR:

1. {tarih} tarihinde yaşanan {olay} nedeniyle davacı {zarar} TL tutarında \
doğrudan maddi zarara uğramıştır.

2. Söz konusu zarar, davalının kusurlu eylemi/ihmali sonucunda meydana gelmiştir.

3. Davacı ayrıca yaşanan olay nedeniyle ağır psikolojik sıkıntı çekmiş; \
iş ve sosyal hayatı olumsuz etkilenmiştir.

HUKUK SEBEPLERİ:
TBK m. 49 (Haksız Fiil), TBK m. 51-52 (Tazminat miktarı), \
TBK m. 58 (Manevi zarar), 4857 s. İş K. (iş kazası halinde)

HUKUKİ DELİLLER:
Olay tutanağı, hastane raporları, bilirkişi, tanık beyanları ve sair deliller.

SONUÇ VE TALEP:
1. {zarar} TL maddi tazminatın olay tarihinden itibaren yasal faiziyle davalıdan tahsiline,
2. Takdiren belirlenecek manevi tazminata,
3. Yargılama giderleri ve vekalet ücretinin davalıya yüklenmesine
karar verilmesini saygıyla talep ederim.

Davacı: {ad1} {soy1}  — Tarih: {_tarih()}"""

    user = f"{tarih} tarihinde {olay} nedeniyle {zarar} zarar gördüm. " \
           f"Tazminat davası açmak istiyorum, dilekçe yazar mısın?"
    return _msg(user, dilekce)


def iscinin_tazminat_dilekce() -> dict:
    ad1, soy1 = _erkek() if random.random() > 0.5 else _kadin()
    sirket = f"{random.choice(SOYADLAR)} {random.choice(['A.Ş.', 'Ltd. Şti.'])}"
    sure = random.randint(1, 20)
    maas = _para(12000, 60000)
    kidem = _para(20000, 300000)
    ihbar = _para(5000, 50000)
    mahkeme = _mahkeme("İş")
    iscin = random.choice([
        "haksız fesih", "kıdem tazminatı ödenmeksizin işten çıkarma",
        "mobbing ve zorla istifa ettirme", "ücretsiz fazla çalışma yaptırma",
    ])
    tarih = _tarih(2022, 2025)

    dilekce = f"""{mahkeme}'NE

DAVACI (İŞÇİ) : {ad1} {soy1}, TC: {TC_NO()}
DAVALI (İŞVEREN): {sirket}
KONU           : Kıdem ve İhbar Tazminatı ile İşçilik Alacakları

AÇIKLAMALAR:

1. Davacı, davalıya ait işyerinde {tarih} tarihinden itibaren {sure} yıl süreyle \
aylık brüt {maas} ücretle çalışmıştır.

2. Davalı işveren, {iscin} suretiyle davacının iş akdini {_tarih(2024, 2026)} \
tarihinde sona erdirmiştir.

3. Bu nedenle davacı tarafından kıdem tazminatı, ihbar tazminatı ve diğer \
işçilik alacakları ödenmemiştir.

TALEP EDİLEN ALACAKLAR:
- Kıdem Tazminatı: {kidem}
- İhbar Tazminatı: {ihbar}
- Fazla çalışma ücretleri
- Yıllık izin alacağı
- UBGT ücret alacakları

HUKUK SEBEPLERİ:
4857 s. İş K. m. 17 (İhbar), 1475 s. Kanun m. 14 (Kıdem), \
4857 s. İş K. m. 41 (Fazla çalışma)

SONUÇ VE TALEP:
Belirtilen alacakların davalıdan tahsiline ve yargılama giderlerinin \
davalıya yüklenmesine karar verilmesini saygıyla talep ederim. {_tarih()}

Davacı: {ad1} {soy1}"""

    user = f"{sirket}'de {sure} yıl çalıştım, {iscin} nedeniyle işten çıkarıldım. " \
           f"İş mahkemesine başvurmak istiyorum, kıdem-ihbar tazminatı dilekçesi yazar mısın?"
    return _msg(user, dilekce)


def nafaka_dilekce() -> dict:
    ad1, soy1 = _kadin()
    ad2, soy2 = _erkek()
    mahkeme = _mahkeme("Aile")
    cocuk = random.randint(1, 3)
    isimler = [random.choice(ERKEK_ISIMLER + KADIN_ISIMLER) for _ in range(cocuk)]
    yaslar = [random.randint(1, 17) for _ in range(cocuk)]
    nafaka = _para(2000, 12000)
    tarih = _tarih(2022, 2025)

    dilekce = f"""{mahkeme}'NE

DAVACI   : {ad1} {soy1}, TC: {TC_NO()}
DAVALI   : {ad2} {soy2}, TC: {TC_NO()}
KONU     : İştirak Nafakası Artırımı / Tedbir Nafakası Talebi

AÇIKLAMALAR:

1. Taraflar {tarih} tarihinde boşanmıştır. {cocuk} müşterek çocuk \
({", ".join(f"{i} ({y} yaş)" for i, y in zip(isimler, yaslar))}) \
velayeti davacı anneye bırakılmıştır.

2. Mevcut nafaka miktarı bugünkü ihtiyaçları ve yaşam koşullarını \
karşılamaktan uzaktır; çocukların eğitim, sağlık ve geçim giderleri artmıştır.

3. Davalı babanın gelir durumu da boşanma davasından bu yana olumlu \
yönde değişmiştir.

HUKUK SEBEPLERİ:
TMK m. 182 (İştirak nafakası), TMK m. 176, m. 331 (Nafaka artışı), \
TMK m. 169 (Tedbir nafakası)

SONUÇ VE TALEP:
Kişi başı aylık {nafaka} olarak iştirak nafakasına hükmedilmesini, \
nafaka miktarının her yıl TÜFE oranında artırılmasına karar verilmesini \
saygıyla talep ederim. {_tarih()}

Davacı: {ad1} {soy1}"""

    user = f"Boşandım, {cocuk} çocuğun velayeti bende. Nafaka artırımı için dilekçe yazar mısın?"
    return _msg(user, dilekce)


def gizlilik_sozlesmesi() -> dict:
    sirket1 = f"{random.choice(SOYADLAR)} {random.choice(['A.Ş.', 'Ltd. Şti.'])}"
    sirket2 = f"{random.choice(SOYADLAR)} {random.choice(['A.Ş.', 'Ltd. Şti.'])}"
    sure = random.choice([2, 3, 5])
    konu = random.choice([
        "yazılım geliştirme projesi", "ürün tasarımı ve patenti",
        "stratejik iş ortaklığı müzakereleri", "müşteri veri tabanı",
        "ar-ge çalışmaları",
    ])

    sozlesme = f"""GİZLİLİK (NDA) SÖZLEŞMESİ

TARAFLAR:
Açıklayan Taraf: {sirket1}
Alan Taraf: {sirket2}
Konu: {konu.capitalize()} kapsamındaki gizli bilgiler
Geçerlilik Süresi: {sure} yıl

MADDE 1 – GİZLİ BİLGİNİN TANIMI
Gizli bilgi; ticari sırlar, teknik veriler, müşteri listeleri, finansal bilgiler, \
iş planları, yazılım kaynak kodları ve taraflar arasındaki yazışmalar dahil olmak üzere \
her türlü bilgi ve belgeyi kapsar.

MADDE 2 – GİZLİLİK YÜKÜMLÜLÜĞÜ
Alan taraf; gizli bilgiyi üçüncü kişilerle paylaşmayacak, yalnızca sözleşme \
konusu amaçla kullanacak ve gerekli güvenlik önlemlerini alacaktır.

MADDE 3 – İSTİSNALAR
Aşağıdaki bilgiler gizlilik kapsamı dışındadır:
a) Zaten kamuya açık olan bilgiler,
b) Alan tarafın önceden bağımsız olarak bildiği bilgiler,
c) Yasal zorunluluk nedeniyle ifşa edilmesi gereken bilgiler.

MADDE 4 – CEZA ŞARTI
Bu sözleşmenin ihlali halinde ihlal eden taraf, diğer tarafa {_para(50000, 500000)} \
cezai şart ödemeyi kabul eder. Cezai şart ödeme yükümlülüğü, tazminat taleplerini \
engellemez (TBK m. 179).

MADDE 5 – GEÇERLİLİK SÜRESİ
İşbu sözleşme imzalandığı tarihten itibaren {sure} yıl geçerlidir.

MADDE 6 – UYGULANACAK HUKUK
Bu sözleşme Türk Hukukuna tabidir. Uyuşmazlıklarda {random.choice(SEHIRLER)} \
Mahkemeleri yetkilidir.

{sirket1} Yetkilisi: _______________  Tarih: {_tarih()}
{sirket2} Yetkilisi: _______________  Tarih: {_tarih()}"""

    user = f"{konu} için iki şirket arasında gizlilik sözleşmesi (NDA) hazırlar mısın?"
    return _msg(user, sozlesme)


def vekaletname_dilekce() -> dict:
    ad1, soy1 = _erkek() if random.random() > 0.5 else _kadin()
    ad2, soy2 = _kadin() if random.random() > 0.5 else _erkek()
    konu = random.choice([
        "gayrimenkul satış ve devir işlemleri",
        "banka işlemleri ve hesap yönetimi",
        "mahkeme işlemleri ve dava takibi",
        "tapu sicil müdürlüğü nezdindeki tüm işlemler",
        "araç alım-satım işlemleri",
    ])
    tc1, tc2 = TC_NO(), TC_NO()

    dilekce = f"""VEKÂLETNAMESİ

VEKÂLET VEREN:
Ad Soyad  : {ad1} {soy1}
TC Kimlik  : {tc1}
Adres     : {random.choice(ILCELER)}, {random.choice(SEHIRLER)}

VEKÂLET ALAN:
Ad Soyad  : {ad2} {soy2}
TC Kimlik  : {tc2}
Adres     : {random.choice(ILCELER)}, {random.choice(SEHIRLER)}

KONU      : {konu.capitalize()} konusunda yetkilendirme

VEKÂLET KONUSU:
Yukarıda kimlik bilgileri yazılı vekil; aşağıda belirtilen işleri benim adıma \
ve hesabıma yapma, ilgili kurum ve kuruluşlar nezdinde temsil etme, sözleşme imzalama, \
bedel tahsil etme ve her türlü işlemi yapma konusunda yetkilidir:

1. {konu.capitalize()} konusunda üçüncü kişilerle müzakere ve sözleşme yapmak,
2. İlgili kurum ve kuruluşlara başvuruda bulunmak ve belge almak,
3. Her türlü ödeme ve tahsilat işlemi yapmak,
4. Alt vekil tayin etmek.

Bu vekaletnamenin yürürlük tarihi {_tarih(2024, 2026)} olup, geçerlilik süresi 1 yıldır.

Vekalet Veren: {ad1} {soy1}
Tarih: {_tarih()}

(İşbu vekaletname noter tarafından onaylanmalıdır.)"""

    user = f"{konu} için {ad2} {soy2}'a vekalet vermem lazım. Vekaletname metni yazar mısın?"
    return _msg(user, dilekce)


def itiraz_dilekce() -> dict:
    ad1, soy1 = _erkek() if random.random() > 0.5 else _kadin()
    ad2, soy2 = _kadin() if random.random() > 0.5 else _erkek()
    daire = random.choice(SEHIRLER)
    icra_no = f"20{random.randint(20,25)}/{random.randint(1000, 99999)}"
    borc = _para(5000, 100000)
    neden = random.choice([
        "söz konusu borcu ödendiğinden itiraz etmektedir",
        "alacaklı ile arasında böyle bir borç ilişkisi bulunmamaktadır",
        "belirtilen borcun zamanaşımına uğradığını beyan etmektedir",
        "imzanın kendisine ait olmadığını ileri sürmektedir",
    ])

    dilekce = f"""{daire} İCRA MÜDÜRLÜĞÜ'NE

Dosya No: {icra_no}

BORÇLU  : {ad1} {soy1}, TC: {TC_NO()}
ALACAKLI: {ad2} {soy2}, TC: {TC_NO()}
KONU    : İcra Takibine İtiraz

Tarafıma tebliğ edilen {icra_no} sayılı icra takibine ilişkin ödeme emri \
alınmıştır. Borçlu, {borc} tutarındaki alacak talebine aşağıdaki gerekçeyle \
itiraz etmektedir:

GEREKÇE:
Borçlu, {neden}.

Somut delilleri; banka dekontları, ödeme belgeleri ve yazışmalar aşağıda sunulmaktadır.

SONUÇ VE TALEP:
İcra ve İflas Kanunu'nun 62. maddesi uyarınca takibe itiraz ediyorum. \
İtirazımın kabulü ile icra takibinin durdurulmasına karar verilmesini \
saygıyla talep ederim. {_tarih()}

Borçlu: {ad1} {soy1}"""

    user = f"İcra takibine itiraz dilekçesi yazmam lazım, " \
           f"dosya no {icra_no}, {neden}. Yardım eder misin?"
    return _msg(user, dilekce)


def temyiz_dilekce() -> dict:
    ad1, soy1 = _erkek() if random.random() > 0.5 else _kadin()
    ad2, soy2 = _kadin() if random.random() > 0.5 else _erkek()
    daire = random.choice(["2", "3", "4", "9", "11", "13", "15", "17", "19", "21"])
    esas_no = f"20{random.randint(20,25)}/{random.randint(1000, 99999)}"
    karar_no = f"20{random.randint(24,26)}/{random.randint(1000, 99999)}"
    mahkeme = _mahkeme("Asliye Hukuk")
    neden = random.choice([
        "hukuki değerlendirme hatası yapılması",
        "delillerin usulsüz değerlendirilmesi",
        "hükmün Yargıtay içtihatlarına aykırı olması",
        "usul hükümlerinin ağır biçimde ihlal edilmesi",
    ])

    dilekce = f"""YARGITAY {daire}. HUKUK DAİRESİ'NE

Gönderilmek Üzere
{mahkeme}'NE

DAVACI/TEMYİZ EDEN: {ad1} {soy1}, TC: {TC_NO()}
DAVALI/TEMYİZ EDİLEN: {ad2} {soy2}, TC: {TC_NO()}
KARAR            : {mahkeme}, Esas {esas_no}, Karar {karar_no}
KONU             : Temyiz Talebine İlişkin Dilekçe

AÇIKLAMALAR:

1. {mahkeme} tarafından verilen yukarıda belirtilen karar, tarafımca usul ve \
esasa aykırı bulunduğundan temyiz yoluna başvurulması zorunluluğu doğmuştur.

2. Mahkeme kararında {neden} suretiyle hatalı hüküm tesis edilmiştir.

3. Söz konusu karar, Yargıtay'ın yerleşik içtihatlarıyla bağdaşmamaktadır.

BOZMA SEBEPLERİ:
- {neden.capitalize()}
- Delillerin takdirinde yanılgıya düşülmesi
- Hukuki nitelendirmede hata

SONUÇ VE TALEP:
Hukuka aykırı kararın BOZULMASINA karar verilmesini saygıyla talep ederim. {_tarih()}

Temyiz Eden: {ad1} {soy1}"""

    user = f"Mahkeme kararını temyiz etmek istiyorum, {neden} gerekçesiyle. " \
           f"Yargıtay'a temyiz dilekçesi yazar mısın?"
    return _msg(user, dilekce)


def hizmet_sozlesmesi() -> dict:
    sirket = f"{random.choice(SOYADLAR)} {random.choice(['A.Ş.', 'Ltd. Şti.'])}"
    ad1, soy1 = _erkek() if random.random() > 0.5 else _kadin()
    hizmet = random.choice([
        "web sitesi tasarımı ve geliştirmesi",
        "muhasebe ve mali müşavirlik",
        "hukuki danışmanlık",
        "pazarlama ve reklam hizmetleri",
        "yazılım bakım ve destek hizmetleri",
        "grafik tasarım hizmetleri",
    ])
    bedel = _para(10000, 200000)
    sure = random.choice([3, 6, 12])

    sozlesme = f"""HİZMET SÖZLEŞMESİ

HİZMET ALAN:
Ticaret Unvanı: {sirket}

HİZMET VEREN:
Ad Soyad: {ad1} {soy1}, TC: {TC_NO()}

MADDE 1 – SÖZLEŞMENİN KONUSU
Hizmet veren, {hizmet} hizmetini hizmet alana sunmayı taahhüt eder.

MADDE 2 – HİZMET BEDELİ VE ÖDEME
Toplam hizmet bedeli {bedel}'dir. Ödeme {sure} ay boyunca aylık eşit taksitler \
halinde yapılır. Gecikme halinde aylık %3 gecikme faizi uygulanır.

MADDE 3 – SÜRE
Hizmet sözleşmesi, imza tarihinden itibaren {sure} ay süreyle geçerlidir.

MADDE 4 – TARAFLARIN YÜKÜMLÜLÜKLERİ
Hizmet veren; işi özenle, zamanında ve mesleki standartlara uygun biçimde yerine getirir.
Hizmet alan; gerekli bilgi, belge ve erişimi sağlar, ödemeleri zamanında yapar.

MADDE 5 – FİKRİ MÜLKİYET
Hizmet kapsamında üretilen tüm çıktıların fikri mülkiyet hakları, ücretin \
tam ödenmesi koşuluyla hizmet alana devredilir.

MADDE 6 – FESİH
Taraflardan biri, {sure} gün önceden yazılı bildirimde bulunarak sözleşmeyi feshedebilir.

MADDE 7 – YETKİLİ MAHKEME
{random.choice(SEHIRLER)} Mahkemeleri yetkilidir.

{sirket} Yetkilisi: _______________
{ad1} {soy1}: _______________  Tarih: {_tarih()}"""

    user = f"{hizmet} için hizmet sözleşmesi hazırlar mısın? " \
           f"Süre {sure} ay, bedel {bedel}."
    return _msg(user, sozlesme)


def satilik_sozlesme() -> dict:
    ad1, soy1 = _erkek() if random.random() > 0.5 else _kadin()
    ad2, soy2 = _kadin() if random.random() > 0.5 else _erkek()
    mal = random.choice([
        "2022 model araç (Toyota Corolla, plaka: 34 ABC 123)",
        "200m2 daire (İstanbul, Kadıköy)",
        "iş yeri ekipmanları",
        "ticari yazılım lisansı",
    ])
    bedel = _para(50000, 5000000)
    pesin = random.choice([True, False])
    tarih = _tarih(2024, 2026)

    odeme = (
        f"Satış bedeli {bedel} peşin olarak ödenecektir."
        if pesin else
        f"Satış bedelinin %30'u ({int(bedel.split('.')[0].replace('.',''))//3:,}".replace(",",".")+" TL) peşin, \
kalanı 12 ay taksitle ödenecektir."
    )

    sozlesme = f"""SATIM SÖZLEŞMESİ

SATICI  : {ad1} {soy1}, TC: {TC_NO()}
ALICI   : {ad2} {soy2}, TC: {TC_NO()}
SATIŞ KONUSU: {mal}
SATIŞ BEDELİ: {bedel}

MADDE 1 – KONU
Satıcı, yukarıda tanımlanan malı/taşınmazı alıcıya {tarih} tarihi itibariyle \
satmayı taahhüt eder.

MADDE 2 – SATIŞ BEDELİ VE ÖDEME
{odeme}

MADDE 3 – TESLİM
Satış bedelinin tamamının ödenmesi koşuluyla satıcı, malı {tarih} tarihinde \
teslim edecektir. Taşınmaz için tapu devri aynı tarihte yapılacaktır.

MADDE 4 – AYIPTAN SORUMLULUK
Satıcı, satış konusu maldaki gizli ayıplardan TBK m. 219 vd. uyarınca sorumludur.

MADDE 5 – YETKİLİ MAHKEME
{random.choice(SEHIRLER)} Mahkemeleri yetkilidir.

Satıcı: {ad1} {soy1}  Tarih: {_tarih()}
Alıcı : {ad2} {soy2}  Tarih: {_tarih()}"""

    user = f"{mal} satmak istiyorum. {ad2} {soy2} alacak, bedel {bedel}. " \
           f"Satış sözleşmesi yazar mısın?"
    return _msg(user, sozlesme)


def kira_artis_ihtarname() -> dict:
    ad1, soy1 = _erkek() if random.random() > 0.5 else _kadin()
    ad2, soy2 = _kadin() if random.random() > 0.5 else _erkek()
    eski_kira = _para(5000, 20000)
    yeni_kira = _para(8000, 30000)
    tarih = _tarih(2024, 2026)

    ihtar = f"""İHTARNAME

GÖNDEREN (KİRALAYAN): {ad1} {soy1}, TC: {TC_NO()}
MUHATAP (KİRACI)    : {ad2} {soy2}, TC: {TC_NO()}
KONU                : Kira Bedelinin Yasal Sınır Dahilinde Güncellenmesi

{_tarih()} Tarihli Kira Sözleşmemize İstinaden;

Tarafımızdan kiralanan konut/işyeri için aylık {eski_kira} olarak belirlenen kira \
bedeli, 6098 Sayılı Türk Borçlar Kanunu'nun 344. maddesi uyarınca, kira yılının \
sona erdiği {tarih} tarihi itibariyle TÜİK'in açıkladığı 12 aylık TÜFE artış oranı \
esas alınarak {yeni_kira} olarak güncellenmiştir.

YENİ KİRA BEDELİ: {yeni_kira} (Aylık)
GEÇERLİLİK TARİHİ: {tarih}

Belirtilen tarihten itibaren kira bedelini yeni tutar üzerinden ödemenizi, \
aksi takdirde yasal yollara başvurulacağını saygıyla bildiririz.

Kiralayanın Avukatı / Kiralayan: {ad1} {soy1}"""

    user = f"Kiracıma kira artışı için ihtarname yazmam gerekiyor. " \
           f"Eski kira {eski_kira}, yeni kira {yeni_kira}. Yazar mısın?"
    return _msg(user, ihtar)


# ─────────────────────────────────────────────────────────────────────────────
# Hukuki sorular (açıklayıcı)
# ─────────────────────────────────────────────────────────────────────────────

def hukuki_soru_cevap() -> dict:
    qas = [
        (
            "Kira sözleşmesini feshettikten sonra kiracı evi boşaltmazsa ne yapabilirim?",
            "Kiracının tahliyesi için iki yol mevcuttur: (1) İcra İflas Kanunu m.272 vd. uyarınca icra yoluyla tahliye; kira sözleşmesinin sona erdiğini gösteren noter ihtarnamesi tebliğinden sonra icra müdürlüğüne başvurabilirsiniz. (2) Sulh Hukuk Mahkemesi'nde tahliye davası açabilirsiniz. Dava sürecinde kira bedelini ödemeye devam etmesi durumunda kiracının taşınmazda kalma hakkı doğmaz. Yargıtay'ın yerleşik içtihadına göre tahliye kararı kesinleştikten sonra 10 gün içinde icra yoluyla zorla boşaltma yapılabilir."
        ),
        (
            "İş akdim haksız yere feshedildi, ne yapabilirim?",
            "4857 sayılı İş Kanunu kapsamında haksız feshe maruz kaldığınızda şu yollar açıktır: (1) Fesih tarihinden itibaren 30 gün içinde arabulucuya başvurmanız zorunludur (7036 s. İş Mahkemeleri K. m.3). (2) Arabuluculuk olumsuz sonuçlanırsa İş Mahkemesi'nde dava açabilirsiniz. (3) Talep edilebilecek alacaklar: kıdem tazminatı (1475 s. Kanun m.14), ihbar tazminatı (4857 s. Kanun m.17), kötüniyet tazminatı (4857 s. Kanun m.17/son), işe iade tazminatı (4-8 aylık ücret). Dava açma süresi, kural olarak alacağın muaccel olduğu tarihten itibaren 5 yıldır (4857 s. Kanun m.32/8)."
        ),
        (
            "Trafik kazasında kusursuz taraftım, sigorta tazminat ödemiyor, ne yapmalıyım?",
            "Sigorta şirketinin tazminat ödemekten kaçınması veya düşük teklif sunması halinde şu adımları izleyebilirsiniz: (1) Sigortacılık ve Özel Emeklilik Düzenleme ve Denetleme Kurumu'na (SEDDK) şikayette bulunabilirsiniz. (2) Sigorta Tahkim Komisyonu'na başvurabilirsiniz — kararlar bağlayıcı ve hızlı (genellikle 4 ay içinde sonuçlanır). (3) Asliye Hukuk veya Tüketici Mahkemesi'nde dava açabilirsiniz. Hak düşürücü süre olarak sigorta şirketine başvurudan itibaren 2 yıl, kazadan itibaren 10 yıl genel zamanaşımı uygulanır (TBK m.72, 2918 s. KTK m.109)."
        ),
        (
            "Boşanmada mal paylaşımı nasıl yapılır?",
            "Türk Medeni Kanunu'nun 202. maddesi uyarınca, 01.01.2002 tarihinden sonra evlenen çiftlerde yasal mal rejimi 'edinilmiş mallara katılma' rejimidir. Bu rejimde: (1) Evlilik süresince kazanılan mallar (maaş, işyeri, kira geliri vb.) eşit paylaşılır — her eş diğerinin edinilmiş malının yarısını talep edebilir. (2) Kişisel mallar (evlilik öncesi edinilmiş, miras veya bağış yoluyla alınmış) paylaşıma dahil edilmez. (3) Mal paylaşımı için boşanma kararının kesinleşmesinden sonra aile mahkemesinde 'mal rejiminin tasfiyesi' davası açılabilir. Ayrıca eş katkısı varsa denkleştirme alacağı da istenebilir (TMK m.236)."
        ),
        (
            "Mirasçılar arasında miras nasıl paylaşılır?",
            "TMK m.495-501 uyarınca yasal miras paylaşımı şöyledir: (1) Birinci zümre: altsoyun (çocuklar) mevcut olması halinde her çocuk eşit pay alır. Eş de bu durumda mirasın 1/4'ünü alır. (2) İkinci zümre: altsoyu yoksa anne-baba ve onların torunları mirasçı olur; eş mirasın 1/2'sini alır. (3) Üçüncü zümre: büyükanne-büyükbabalar ve torunları; eş mirasın 3/4'ünü alır. (4) Saklandı payı (saklı pay): Çocuklar, anne-baba ve eş için miras payının belirli bir oranı zorunlu olup vasiyetname ile dahi bu pay kısıtlanamaz (TMK m.506). Miras reddi için mirasçıların 3 ay içinde sulh mahkemesine bildirmesi gerekir (TMK m.605)."
        ),
        (
            "İşçinin yıllık izin hakkı ne kadardır?",
            "4857 sayılı İş Kanunu'nun 53. maddesi uyarınca yıllık ücretli izin süreleri hizmet yılına göre şu şekilde belirlenir: 1-5 yıl (5 dahil): 14 iş günü; 5-15 yıl: 20 iş günü; 15 yıl ve üzeri: 26 iş günü. Yer altı işleri ile 18 yaşından küçük ve 50 yaş ve üzeri işçilere 20 günden az izin verilemez. Yıllık izin paraya çevrilemez, ancak iş akdinin sona ermesi halinde kullanılmayan izin ücret olarak ödenir. Hak düşürücü süre yoktur; ancak alacak olarak talep edilmesinde 5 yıllık zamanaşımı işler."
        ),
        (
            "Tüketici hakem heyetine ne zaman başvurabilirim?",
            "6502 sayılı Tüketicinin Korunması Hakkında Kanun uyarınca tüketici hakem heyetlerine başvuru için 2024 yılı itibarıyla parasal sınırlar şu şekildedir: İlçe hakem heyetleri: 66.000 TL'nin altındaki uyuşmazlıklara bakar. İl hakem heyetleri: 66.000 - 990.000 TL arası uyuşmazlıklara bakar. Bu tutarları aşan uyuşmazlıklar için tüketici mahkemesine dava açılmalıdır. Başvuru, ürün veya hizmetin tesliminden sonra 2 yıl içinde yapılmalıdır (ayıp ihbarı için 30 gün bildirim süresi dikkate alınır). Hakem heyeti kararları 6 ay içinde yerine getirilmezse İcra İflas Kanunu hükümlerine göre icraya konulabilir."
        ),
        (
            "Kiracı kira bedelini ödemiyor, ne yapabilirim?",
            "Kira bedelini ödemeyen kiracıya karşı şu yollar mevcuttur: (1) İcra takibi: Ödenmemiş kira alacağı için icra dairesine başvurabilirsiniz. Kiracıya itiraz hakkı tanınır; itiraz etmezse borcunu ödemesi gerekir. (2) Tahliye davası: İki haklı ihtar ilkesi uyarınca, bir kira yılı içinde iki kez noter ihtarnamesi gönderildikten sonra Sulh Hukuk Mahkemesi'nde tahliye davası açılabilir (TBK m.352). (3) Sözleşmenin feshi: Ödeme yapılmaması halinde sözleşmeyi feshederek tahliye talep edilebilir. Yargıtay'a göre kiracı borcunu ödese de iki haklı ihtarın varlığı tahliye için yeterlidir."
        ),
    ]
    q, a = random.choice(qas)
    return _msg(q, a)


# ─────────────────────────────────────────────────────────────────────────────
# Ana üretici
# ─────────────────────────────────────────────────────────────────────────────

GENERATORS = [
    (bosluk_dilekce, 6),
    (kira_sozlesmesi, 5),
    (is_akdi, 5),
    (icra_dilekce, 5),
    (tazminat_davasi, 5),
    (iscinin_tazminat_dilekce, 5),
    (nafaka_dilekce, 4),
    (gizlilik_sozlesmesi, 3),
    (vekaletname_dilekce, 3),
    (itiraz_dilekce, 4),
    (temyiz_dilekce, 4),
    (hizmet_sozlesmesi, 3),
    (satilik_sozlesme, 3),
    (kira_artis_ihtarname, 3),
    (hukuki_soru_cevap, 8),
]


def generate(n_per_template: int = 200) -> list[dict]:
    results = []
    for fn, weight in GENERATORS:
        count = int(n_per_template * weight)
        for _ in range(count):
            try:
                results.append(fn())
            except Exception:
                pass
    random.shuffle(results)
    return results


def main():
    out = PROCESSED_DIR / "dilekce_sozlesme.jsonl"
    print("=== Dilekçe & Sözleşme Sentetik Üretici ===\n")

    n_per = 300
    data = generate(n_per)
    with out.open("w", encoding="utf-8") as f:
        for d in data:
            f.write(json.dumps(d, ensure_ascii=False) + "\n")

    print(f"Üretilen örnek: {len(data):,}")
    print(f"Çıktı: {out}")
    total = sum(w for _, w in GENERATORS) * n_per
    print(f"Şablon başına {n_per} örnekle {total:,} toplam eğitim örneği.")
    print("\n=== TAMAMLANDI ===")


if __name__ == "__main__":
    main()
