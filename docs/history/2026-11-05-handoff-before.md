# Strona Maćka — bieżący stan

Data: 2026-10-23. Etap: lokalny audyt i implementacja usprawnień panelu oraz bezpieczeństwa publicznego wywiadu. Odbiór funkcjonalny bez przeglądarki PASS; odbiór wizualny i publikacja pozostają otwarte.

## Ustalenia użytkownika

Maciej prowadzi własną praktykę w Polsce. Używany system oficjalnej dokumentacji nie jest znany. Nie ustalono dostępności eksportu ani dostępu API Booksy. Dodatkowo zlecono ocenę otwartych programów i profesjonalnych filmów ćwiczeń. Nie udzielono zgody na nowy hosting, koszt cykliczny ani przesyłanie danych pacjentów.

## Zaimplementowane lokalnie

- Pulpit: statusy miesięczne, aktywne wizyty dzisiaj i wszystkie odbyte wizyty bez powiązanej karty; szybkie otwarcie karty terminu.
- Wizyty: czas trwania, kontrola pełnego nakładania przedziałów, filtrowanie, wyszukiwanie, statusy. Usunięto fizyczne kasowanie terminów z interfejsu na rzecz statusu odwołania. ICS z czasem trwania pomija odwołania i nieobecności; nie synchronizuje zmian z wcześniejszym eksportem.
- CSV: jawny wzór, podgląd, kontrola formatu, konfliktów, identycznych duplikatów i zmienionych rekordów; brak częściowego importu przy błędach. To ogólny importer, nie zweryfikowany konektor Booksy.
- Karta: dodatkowe dane formalne, cel, bezpieczeństwo, przebieg, reakcja, zgoda i skierowania; orientacyjna lista kompletności. Wersje zachowują czas zapisu, poprzednika i powód zmiany. Bez fizycznego usuwania kart z UI. Powiązanie z terminem po trwałym ID; starsze karty nie są zgadywane po nazwisku.
- Ćwiczenia: ulubione, filtr, etykieta źródła filmu. Własne zestawy zachowują ćwiczenia i dawkowanie, pomijają tożsamość, cel i notatki pacjenta. Treści kliniczne istniejącej biblioteki niezmienione.
- Kopia: AES-256-GCM, PBKDF2-SHA256 310000, walidacja, podgląd i odtworzenie wyłącznie do pustej przestrzeni. Bez kluczy AI. W razie braku miejsca częściowy zapis jest wycofywany. Plik kopii jest szyfrowany; localStorage nie jest.
- Zapis do localStorage blokuje typowy konflikt z nowszą zmianą z innej karty; to nie transakcyjna baza wieloużytkownikowa.
- Hosting: usunięto hasło z aktywnego kodu; wymagane sekrety środowiskowe PANEL_AUTH_USER i PANEL_AUTH_PASSWORD. Brak konfiguracji daje 503; odpowiedzi no-store. Przed wdrożeniem ustawić nowe hasło, bo dawne pozostaje w historii repozytorium.
- Publiczny wywiad: usunięto oznaczenia AI i statyczne diagnozy/badania/ćwiczenia dobierane po obszarze bólu. Tylko odpowiedzi pacjenta; brak domyślnych twierdzeń o początku bólu i jego nasileniu. Alarm nie kieruje do Booksy. Poprawiono escaping notatki i nazw plików, reset danych, klawiaturę mapy i focus kroków. Ocena kliniczna listy objawów nie jest kompletnym audytem medycznym.

## Pliki i dowody

Zmieniono index.html, main.js, panel/index.html, panel/panel.css, panel/panel.js, panel/docs.js, netlify/edge-functions/basic-auth.ts i scripts/build-site.mjs. Dodano panel/clinic-core.js, panel/clinic.js, dwa pliki testów oraz panel/AUDIT-20261023.md. README i CONTEXT_MAP zaktualizowane lokalnie (są ignorowane przez istniejący Git).

- `node --test panel/tests/clinic-core.test.cjs panel/tests/clinic-dom.test.cjs`: PASS, 18 testów. Log: `.tmp/panel-20261023/tests-final.txt`.
- Test DOM używa jsdom 26.1.0 w `.tmp/panel-20261023/test-runtime`, wyłącznie lokalnie, bez danych pacjentów i bez połączeń usługowych. To nie renderowanie przeglądarki. Przeładowanie po restore jest tylko wykrywane, nie wykonane przez jsdom.
- `node --check`: PASS dla main.js i czterech modułów panelu.
- `node scripts/build-site.mjs`: PASS, 20 publicznych plików; porównanie zmienionych plików w dist ze źródłami PASS. Raporty, testy i dane robocze nie trafiają do dist.
- `git diff --check`: PASS. Unikalność ID i lokalne skrypty w obu HTML: PASS.
- Checkpoint: `C:/Projects/Backups/Strona Macka/audit-20261023/before.zip`, 42 wpisy, integralność ZIP potwierdzona; poprzedni handoff w `MODEL_HANDOFF-before.md` obok. Kopia kodu nie zawiera danych przeglądarki.
- Bazowy commit: 9fb2b7c. Nie wykonano commitu, push ani publikacji nowych zmian.

## Ograniczenia odbioru

Narzędzie browser use odmówiło dostępu do `http://127.0.0.1:55600/panel/` z powodu polityki URL. Nie obchodzono blokady; wcześniejszą niedokończoną próbę zrzutów zatrzymano. Nie uzyskano bieżących zrzutów, wyniku axe ani odbioru responsywności/focusu w prawdziwej przeglądarce. Wyniki 81 sprawdzeń i 42 zrzutów z 2026-10-11 są historyczne i nie zatwierdzają obecnego kodu. Istniejący browser_qa.py pozostaje do ponownego uruchomienia w dopuszczonym środowisku.

Panel nadal nie jest samodzielnym systemem oficjalnej dokumentacji: brak podpisów, indywidualnych uprawnień personelu, integralnego audytu zmian, zweryfikowanej retencji i P1. Lista kompletności sprawdza obecność pól. Publiczna strona i panel współdzielą origin; publiczna strona ładuje skrypty CDN. Te granice wymagają rozwiązania przed produkcyjnym przetwarzaniem dokumentacji. Nie przesyłano danych pacjentów ani certyfikatów, nie wysyłano e-maili.

Pełny audyt, zależności Booksy/P1 i rozpoznanie wger, E3 Rehab, PhysioBuddy oraz ograniczeń Physitrack/Rehab My Patient: `panel/AUDIT-20261023.md`. Nie importowano nowych filmów. Nie wykonywano synchronizacji LLM-WIKI.

## Biblioteka demonstracyjna

Aktualizacja po prośbie o efekt pokazowy (2026-10-23): dodano `panel/demo-library.js` z 4 osobnymi wpisami E3 Rehab i 2 zestawami demonstracyjnymi, filtr kolekcji, kafle wideo i etykiety DEMO w planach oraz eksporcie. Nie zmieniono istniejących 18 ćwiczeń. Odtwarzacz łączy się z YouTube dopiero po osobnym kliknięciu „Załaduj film”; zamknięcie usuwa src, ponowne otwarcie wymaga ponownego załadowania. Bez kopii plików wideo i bez instalacji wger. Bieżący wynik testów: 20/20 PASS (8 reguł, 12 DOM), build 21 plików; browser QA i rzeczywiste odtwarzanie nadal niepotwierdzone. README i mapa zaktualizowane. Checkpoint tej partii: `C:/Projects/Backups/Strona Macka/demo-library-20261023/before.zip`. Wcześniejszy opis „nie importowano nowych filmów” odnosi się do poprzedniego etapu — teraz dodano cztery odnośniki/osadzenia.

Podgląd z `dist` uruchomiono lokalnie na `127.0.0.1:55600` (serwer sesji 48316, potwierdzony komunikat Serving HTTP); nie jest publikacją. Test browser_qa.py dostosowano do wyboru kolekcji i osobnego załadowania filmu, sprawdzono składnię, nie uruchamiano go wbrew blokadzie narzędzia. Kontrola unikalności ID, ścieżek skryptów, integralności checkpointu oraz zgodności nowego modułu w dist: PASS.

## Jeden następny krok

Przeprowadzić odbiór obecnej lokalnej wersji w dopuszczonej prawdziwej przeglądarce według macierzy w raporcie audytu, obejmując szczególnie kolekcję demo, oba zestawy, odtwarzanie 4 filmów, nowe formularze, CSV, kopię/odtworzenie, wydruk, 320 px, ciemny motyw i klawiaturę; dopiero potem kwalifikować ją do publikacji.
