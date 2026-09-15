/* Publikacje i ciekawostki — streszczenia PL + linki do oryginałów.
   Maciej: aby dodać pozycję, dopisz obiekt do PUBLICATIONS (title, source, year, url, summary, takeaway). */
const PUBLICATIONS = [
  {
    title: "Ćwiczenia po urazie ACL: przegląd systematyczny z metaanalizą",
    source: "Verhagen i wsp., Musculoskeletal Science & Practice",
    year: "2025",
    url: "https://pubmed.ncbi.nlm.nih.gov/40961649",
    summary: "18 badań (1433 osoby): żaden typ ćwiczeń nie okazał się wyraźnie lepszy od innego, a ćwiczenia wypadły podobnie do operacji w zakresie bólu; operacja dała niewielką przewagę tylko w funkcji.",
    takeaway: "Po urazie więzadła krzyżowego dobrze prowadzona rehabilitacja bywa równorzędna z operacją — o ścieżce decydujemy wspólnie po badaniu."
  },
  {
    title: "Konsensus rehabilitacji łąkotki EU–US 2024 (ESSKA / AOSSM / AASPT)",
    source: "Knee Surgery, Sports Traumatology, Arthroscopy / JOSPT Open",
    year: "2024–2025",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12163282",
    summary: "Międzynarodowy konsensus: przy stabilnym kolanie nadzorowany trening nerwowo-mięśniowy i siłowy z edukacją daje po 12 miesiącach wyniki zbliżone do operacji (badanie DREAM 2024).",
    takeaway: "Uszkodzenie łąkotki nie zawsze oznacza stół operacyjny — często zaczynamy od 12 tygodni mądrego treningu."
  },
  {
    title: "Trening nerwowo-mięśniowy (NEMEX) w chorobie zwyrodnieniowej kolana i biodra",
    source: "JOSPT — przewodnik dla terapeutów",
    year: "2025",
    url: "https://www.jospt.org/doi/10.2519/jospt.2025.13041",
    summary: "NEMEX uzupełnia trening siłowy i aerobowy o kontrolę sensomotoryczną: ćwiczenia w pozycjach odciążonych i obciążonych, z zasadą „akceptowalnego bólu”, który nie narasta do rana.",
    takeaway: "Przy zwyrodnieniu kolana uczymy staw „myśleć” — równowaga i kontrola nerwowo-mięśniowa obok siły."
  },
  {
    title: "Niemieckie wytyczne S3: zapobieganie i leczenie gonartrozy",
    source: "AWMF, rejestr 187-050 (wersja skrócona)",
    year: "2024",
    url: "https://register.awmf.org/assets/guidelines/187_Orthop%C3%A4die_und_Unfallchirurgie/187-050keng_S3_Gonarthrose_2025-05.pdf",
    summary: "Najpierw metody oszczędzające: terapia ćwiczeniami, zmiana zachowań i redukcja masy ciała — zanim rozważymy zabiegi inwazyjne. Terapia manualna tylko jako dodatek do ćwiczeń.",
    takeaway: "Ruch to lek pierwszego rzutu przy zwyrodnieniu kolana — tabletki i zabiegi schodzą na dalszy plan."
  },
  {
    title: "Jaki ruch najlepszy przy zwyrodnieniu kolana? Metanaliza sieciowa",
    source: "Mo i wsp., Orthopaedic Journal of Sports Medicine (PMC)",
    year: "2023",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10280533",
    summary: "Wszystkie 5 typów ruchu pomagały; woda najlepiej łagodziła ból, a joga — sztywność, funkcję i jakość życia; dalej trening oporowy, rower i tai chi.",
    takeaway: "Nie ma jednej „cudownej” gimnastyki — dobieramy formę ruchu do Twojego bólu, sztywności i upodobań."
  },
  {
    title: "Fizjoterapia stawów skroniowo-żuchwowych: strategia multimodalna",
    source: "Przegląd, PMC",
    year: "2025",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12381817",
    summary: "Filary leczenia TMD: edukacja (nawyki, sen, dieta), terapia manualna, ćwiczenia (m.in. program Rocabado 6×6) i samodzielna rehabilitacja; leczenie bólu mięśniowego, napięciowych bólów głowy i bruksizmu.",
    takeaway: "Zgrzytanie, klikanie i ból żuchwy leczymy kompleksowo — głowa, szyja i nawyki razem."
  },
  {
    title: "Zaburzenia skroniowo-żuchwowe: szybki przegląd dowodów",
    source: "American Family Physician",
    year: "2023",
    url: "https://www.aafp.org/afp/2023/0100/temporomandibular-disorders",
    summary: "5–12% populacji ma objawy TMD (ból głowy 79%, bruksizm 58%, ból stawu 54%). Podstawa: edukacja, fizjoterapia i szyna; diagnostyka z wywiadu i badania, obrazowanie tylko przy wątpliwościach.",
    takeaway: "Jeśli budzisz się z bólem głowy i spiętą żuchwą — to częste i uleczalne zachowawczo."
  },
  {
    title: "Siła po rekonstrukcji ACL: ćwiczenia wzmacniające działają",
    source: "Jalili Bafrouei i wsp., metaanaliza RCT (PMC)",
    year: "2025",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12709656",
    summary: "Trening siłowy wyraźnie poprawia siłę czworogłowego i kulszowo-goleniowych oraz funkcję (m.in. testy skocznościowe), choć wpływ na sam ból jest mniej jednoznaczny.",
    takeaway: "Po rekonstrukcji ACL siła nie wraca sama — programujemy ją progresywnym oporem."
  }
];

const CURIOSITIES = [
  {
    title: "Obrzęk „wyłącza” mięsień",
    why: "Już niewielki wysięk w kolanie hamuje aktywację mięśnia czworogłowego — dlatego po urazie najpierw walczymy z obrzękiem (krioterapia, elewacja, spokojny ruch), a dopiero potem z siłą."
  },
  {
    title: "Ból ≠ uszkodzenie",
    why: "Tkanki goją się tygodniami, a nadwrażliwy układ nerwowy potrafi „straszyć” dłużej. Dlatego pracujemy z zasadą akceptowalnego bólu: dolegliwości w trakcie do 3–4/10, które wracają do bazy do następnego rana."
  },
  {
    title: "Chodzenie tyłem leczy wyprost",
    why: "Retro-walking (spacer tyłem) wymusza pełny wyprost kolana i pracę czworogłowego — prosty patent ze światowych protokołów po urazach kolana (m.in. E3 Rehab)."
  }
];
