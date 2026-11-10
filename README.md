# Endless Horde · prototyp 0.0.19

Pierwsza niezależna próba gry typu Survivors w świecie Calionu. Wersja **0.0.19** to w pełni działający prototyp przeglądarkowy, bez zależności, budowania projektu ani zewnętrznych zasobów.

## Wydanie 0.0.19

- Przeniesienie gry do osobnego repozytorium `The-RozU/Endless-Horde` na gałąź `dev-mode`.
- Nowy tytuł gry: **Endless Horde**, osadzona w świecie Calionu.
- Wszystkie mechaniki z 0.0.18, w tym ruletka zatrzymywana przez gracza, zachowane.
- Docelowy adres po konfiguracji GitHub Pages: https://the-rozu.github.io/Endless-Horde/

## Uruchomienie

Otwórz `index.html` w przeglądarce. Wystarczy Chrome, Firefox, Edge lub Safari. Aby sprawdzić na telefonie, uruchom stronę przez dowolny serwer statyczny, np. `python -m http.server 8000` w tym katalogu, a potem otwórz adres komputera w tej samej sieci (`http://ADRES_IP:8000`).

## Sterowanie

- PC: `WSAD` lub strzałki; łuk automatycznie strzela do najbliższego wroga.
- `P` / `Esc`: pauza i wznowienie (Esc w pełnym ekranie wychodzi z trybu pełnoekranowego).
- `F`: przełączenie pełnego ekranu; także przycisk obok pauzy i przycisk w menu startowym.
- `C`: panel statystyk na HUD oraz pod kartami (wstrzymuje walkę), zamykanie C, Esc lub ✕.
- Podczas awansu: kliknij jedną z trzech kart lub naciśnij `1`, `2`, `3`.
- Przed każdą wyprawą ruletka obraca się bez ograniczenia czasu. Kliknij **ZATRZYMAJ KOŁO**, poczekaj na wyhamowanie, następnie zatwierdź broń lub raz losuj ponownie.
- Telefon: dwa joysticki dotykowe. Domyślnie prawy jest widoczny w pełni, a lewy w 10%; dotknięcie dowolnego joysticka zamienia ich widoczność i aktywuje sterowanie.

## Zakres prototypu

- Jedna klasa (Łotrzyk), trzy bronie (Łuk, Sztylety, Łańcuch) losowane ruletką przed wyprawą, jedna arena (Zapomniany Trakt), pięć podstawowych typów wrogów (3 slime’y i 2 gobliny) oraz elitarny Spaczony slime.
- Ruch w czterech kierunkach, kamera śledząca postać, automatyczne celowanie, kolizje, punkty życia.
- Zdobywanie EXP i **powolniejsze** poziomowanie o rosnącym koszcie, zatrzymanie gry na wybór jednej z **3 losowych kart**.
- Limity poziomów kart, **2 sloty modyfikatorów**; pary specjalizacji każdej broni **wzajemnie się wykluczają**. Podział strzał ma tylko jedno pokolenie, a odbicia są limitowane.
- Pięciominutowa próba przetrwania; ekran wygranej lub porażki oraz statystyki.
- Proceduralne proste grafiki pixel art w odcieniach ciemnego drewna, stali, kamienia i mchu. Docelowe sprite'y WebP i animacje zastąpią te tymczasowe rysunki.

## Zmiany w 0.0.19

- **Ruletka sterowana przez gracza:** koło obraca się ciągle, dopóki nie zostanie naciśnięty przycisk „ZATRZYMAJ KOŁO”. Dopiero wtedy rozpoczyna płynne wyhamowywanie. Przy ruszaniu z miejsca nie ma ukrytego, wcześniej narzuconego wyniku: broń jest ustalana z segmentu faktycznie znajdującego się pod wskaźnikiem po zatrzymaniu.
- Początkowy kąt obrotu jest losowy, a podczas ruchu prędkość wynosi około 590–650°/s. Zwalnianie trwa 2,7 s, a prędkość maleje płynnie do zera.
- **Podczas kręcenia i zwalniania na kole widać tylko symbole broni**, bez obracających się wraz z nim napisów. Dopiero po pełnym zatrzymaniu nazwy i procenty pojawiają się wewnątrz segmentów i pozostają czytelne poziomo, niezależnie od kąta koła.
- Pierwsza ruletka nadal ma trzy równe szanse 33,3%; po jedynym ponownym losowaniu wcześniejsza broń ma 25%, dwie pozostałe po 37,5%. Wszystkie bronie nadal są widoczne. Legenda pod kołem przez cały czas pokazuje szanse.
- Nowa runda nie może ruszyć, dopóki gracz nie zatrzyma koła, nie zobaczy wyniku i nie zaakceptuje broni. Wyświetlana wersja i parametry odświeżania zasobów podniesione do 0.0.19.

## Zmiany w 0.0.17

- **Poprawione ponowne losowanie broni:** wszystkie trzy bronie **pozostają na kole**, również poprzednio wylosowana.
- Pierwsze losowanie pozostaje równe: **33,3%** na Łuk, Sztylety i Łańcuch (dokładnie 1/3).
- Przy jedynym ponownym losowaniu wcześniej wylosowana broń ma **25% szans na ponowne trafienie**, a pozostałe dwie mają po **37,5%**. Nie ma już gwarancji innej broni.
- **Rozmiary trzech segmentów koła są proporcjonalne do wag** (90° + 135° + 135° przy ponownym losowaniu). Wybór losowy korzysta z dokładnie tych samych wag; wskaźnik po wyhamowaniu wskazuje środek wylosowanego segmentu. Legenda i podpisy na kole pokazują te same procenty.
- Niewielkie wyróżnienie ramką w legendzie identyfikuje broń z obniżoną szansą. Odświeżone adresy CSS i JS z numerem wersji ograniczają problem starych plików w pamięci podręcznej przeglądarki.

## Zmiany w 0.0.16

- Sztylety mają teraz **8 bazowych obrażeń**, poprzednio 9.
- Ruletka ma teraz postać **animowanego okrągłego koła** z rzeczywistymi segmentami, wskaźnikiem u góry i płynnym wyhamowaniem. Zatrzymuje się na losowej broni.
- Szanse na kole i w legendzie są zgodne z losowaniem: **33,3% każda** przy pierwszym losowaniu (dokładnie 1/3), a przy jedynym ponownym losowaniu **50% dla każdej z dwóch pozostałych**, **0% dla poprzedniej**. Wtedy koło składa się z dwóch równych połówek.
- Karty specjalne **Szerokie cięcie / Krwawiące ostrza** oraz **Długi łańcuch / Podwójny łańcuch** wzajemnie się wykluczają. Pierwszy wybór blokuje rywala na resztę wyprawy, także przy następnych poziomach. Zablokowane karty nie są oferowane przy awansie i są oznaczone jako BLOKADA w statystykach.
- Pozostaje jedno ponowne losowanie i potwierdzanie broni przed runem; walka, pięciominutowy czas i maksymalnie 80 przeciwników bez zmian.

## Zmiany w 0.0.15

- **Ruletka broni** przed wyprawą losuje Łuk, Sztylety lub Łańcuch z jednakową szansą. Po zakończeniu animacji można zaakceptować wynik albo **raz ponowić losowanie**. Ponowne losowanie zawsze daje inną broń. Bez potwierdzenia wynik nie rozpocznie rozgrywki.
- **Łuk** zachowuje dotychczasowe strzały, odbicia i rozdzielenie. Jego dwa ulepszenia specjalne wzajemnie się wykluczają.
- **Sztylety:** 9 obrażeń na zamach, 0,32 s między cięciami, 58 jednostek zasięgu i bazowy kąt 40°. **Szerokie cięcie (0/3)** zwiększa zamach do 60° / 90° / 120°. **Krwawiące ostrza (0/3)** zadają przez 3 s 2 / 4 / 6 HP obrażeń na sekundę, a ponowne trafienie odświeża czas krwawienia bez kumulowania efektu. Krwawiących wrogów oznaczają czerwone kropelki.
- **Łańcuch:** 17 obrażeń, promień 64 jednostek i szybkość obrotu 4,3 radiana/s. **Długi łańcuch (0/3)** zwiększa długość o 20% / 40% / 60%. **Podwójny łańcuch (0/3)** dodaje drugi łańcuch po przeciwnej stronie bohatera; poziomy 2 i 3 przyspieszają oba o 20% / 40%. Każdy łańcuch może trafić konkretnego przeciwnika maksymalnie raz na pełny obrót.
- Karty awansu, HUD i statystyki uwzględniają aktualnie wylosowaną broń. Ulepszenia wspólne (obrażenia, szybkość, zasięg, ruch, HP) pozostają dostępne niezależnie od broni.

## Zmiany w 0.0.14

- **Naprawa szarży niebieskiego slime’a:** poprzednio rozpoczynał sprint nawet 310 jednostek od gracza, lecz mógł przejechać tylko 224 i zatrzymać się za wcześnie. Teraz kończy szarżę **30 jednostek za zapamiętaną pozycją gracza** (dystans szarży zależy od początkowej odległości, maksymalnie 340 jednostek). Przy bezruchu gracza linia sprintu przecina jego hitbox i zadaje 8 obrażeń; gracz wciąż może uniknąć ataku, schodząc z ostrzeżonej linii. Obrażenia występują tylko raz na sprint, a wskazówka pokazuje pełną trasę.
- Maksymalna liczba zwykłych wrogów i elit na arenie wzrosła z **58 do 80**.
- Lekko przyspieszono rozgrywkę bez skracania pięciominutowego czasu rundy: prędkość bohatera **89 → 99**, prędkość podstawowych wrogów **+8%**, szybkostrzelność bohatera **0,80 → 0,75 s między strzałami**, prędkość strzał **235 → 258**, prędkość pocisków goblinich łuczników **128 → 138**.
- Nieznacznie częstszy spawn: odstęp od **1,47 s** na początku do **0,73 s** pod koniec (wcześniej 1,60–0,80 s). Pozostały przyrost HP, obrażenia wrogów, rozwój ulepszeń i reguły kolizji nie zmieniły się.

## Zmiany w 0.0.13

- Ekran awansu automatycznie dopasowuje wysokość panelu i **trzech kart ulepszeń** do okna przeglądarki. Skrócono odstępy i zmieniono rozmiary ikon, tytułów oraz nagłówka. W niższych oknach ukrywany jest dekoracyjny herb, a na bardzo małych ekranach najdłuższe opisy są skracane. Panel wyboru nie ma wewnętrznego paska przewijania.
- Pozostałe okna, w tym statystyki postaci i menu, zachowują dotychczasowe zasady przewijania.
- Wrogowie przestają gonić wyłącznie bieżące współrzędne bohatera. Część próbuje **wyprzedzić kierunek jego ruchu**, a pozostałe wybierają boczne tory pościgu, rozdzielając grupę zamiast pozostawać w środku zataczanego przez gracza kręgu.
- Gdy bohater się porusza, mniej więcej co trzeci zwykły przeciwnik pojawia się przed nim (w dotychczasowej odległości od gracza), dzięki czemu samo bieganie w kółko nie pozwala ignorować wszystkich wrogów.
- Zwykli przeciwnicy wręcz, którzy zostają daleko w tyle, dostają lekki bonus prędkości pościgu (maksymalnie 60%). Łucznicy, skoki i sprinty zachowują własne reguły.
- Niebieski slime: **zasięg rozpoczęcia sprintu 155 → 310 jednostek**, dystans sprintu **112 → 224 jednostki**. Ostrzeżenie, obrażenia, czas i grubość linii pozostają bez zmian.
- Bez zmian HP gracza, HP wrogów, ich obrażeń i kart ulepszeń.

## Zmiany w 0.0.12

- Pogrubiono **niebieską linię ostrzegawczą sprintu**. Ma teraz 28 jednostek szerokości w grze (trochę więcej niż szerokość niebieskiego slime’a), z jaśniejszym środkiem i delikatnym obrysem.
- Zmieniono **kierunek naciągnięcia łuku bohatera**: cięciwa znajduje się bliżej postaci, a wygięte drewniane ramiona są zwrócone w stronę celu. Wygląd jest odbijany podczas zwrotu postaci w lewo/prawo.
- Dostosowano rozbłysk łuku po trafieniu, aby pasował do jego nowego ułożenia.
- Nie zmieniono trajektorii sprintu ani hitboxa obrażeń, parametrów walki, kolizji, spawnu czy ulepszeń.

## Zmiany w 0.0.11

- Przeciwnicy mają teraz osobne promienie zajmowanego miejsca, oparte o szerokość sprite'ów. Goblińscy łucznicy zostawiają więcej miejsca na swoje łuki.
- Fizyczna separacja po ruchu rozpycha wrogów, którzy weszli w siebie. Powtarzana korekta potrafi rozdzielić kilka nałożonych na siebie potworów, nawet gdy zaczynają w identycznych współrzędnych.
- Delikatne omijanie sąsiadów podczas chodzenia zapobiega ponownemu gromadzeniu się w jednym punkcie, szczególnie u łuczników trzymających dystans.
- Elity są cięższe i trudniej je przepchnąć. Kiedy odsuwany jest wróg przygotowujący skok lub sprint, jego ostrzeżenie pozostaje zgodne z trajektorią.
- Bez zmian ilości przeciwników, obrażeń, HP i umiejętności.

## Zmiany w 0.0.10

- Niebieski slime zamiast skoku wykonuje **sprint/szarżę**. Ostrzeżenie to wąska niebieska linia wskazująca od punktu startowego po koniec szarży. Ostrzeżenie trwa 0,42 sekundy, sprint trwa 0,26 sekundy i sięga do 112 jednostek.
- Sprint ma kolizję z graczem na całej przebytej trasie, daje maksymalnie jedno trafienie za **8 HP** i nie ma obrażeń obszarowych. Trasę ustala się na początku ostrzeżenia, więc można ją ominąć. Po sprincie slime odpoczywa przez 0,48 sekundy.
- Czerwony slime i Spaczony slime zachowują skok z okręgiem ostrzegawczym i obrażeniami obszarowymi, bez zmian balansu.
- Bohater po otrzymaniu obrażeń krótko rozbłyska ciepłym, jasnym konturem przez 0,23 sekundy. Po wygaśnięciu rozbłysku pozostaje dotychczasowe miganie sygnalizujące chwilową odporność na kolejne trafienia.
- Nie zmieniono obrażeń łuku, HP, liczby przeciwników ani rozwoju kart.

## Zmiany w 0.0.9

- Startowe HP Łotrzyka zmniejszone ze 120 do **100 HP**; ulepszenie Hart ducha pozostaje +20 HP.
- Tekst sterowania na ekranie startowym i w instrukcji: **PC: WSAD / strzałki**. Samo sterowanie W/A/S/D pozostaje bez zmian.
- Niebieski slime w v0.0.9 przygotowywał skok przez 0,42 s na odległość do 94 jednostek z niebieskim okręgiem celu (mechanika zastąpiona sprintem z linią w v0.0.10).
- Czerwony slime przygotowuje skok przez 0,68 s, pokonuje do 115 jednostek i przy lądowaniu zadaje **11 obrażeń** w promieniu **35 jednostek**. Obszar jest zaznaczony na ziemi przed atakiem. Można uniknąć trafienia, zmieniając pozycję.
- Co **60 sekund** (1:00, 2:00, 3:00, 4:00) pojawia się elitarny **Spaczony slime**: duży fioletowy wróg z koroną, zwiększonym HP (150 bazowo), większym zasięgiem skoku, ostrzeżeniem o ataku obszarowym (46 jednostek, 16 obrażeń), wyraźnym paskiem HP i 8 EXP za pokonanie.
- Częstotliwość pojawiania się zwykłych przeciwników nieznacznie zwiększona (interwał od 1,60 do 0,80 s, wcześniej od 1,85 do 0,92 s). Maksymalna liczba przeciwników zwiększona **48 → 58**. Miejsce dla elity jest rezerwowane również przy pełnym limicie.
- Ostrzeżenia i animacje lądowania są rysowane bez dodatkowych assetów. Atak obszarowy zadaje obrażenia tylko przy lądowaniu, nie przez cały czas ostrzeżenia.
- Poza tym zachowano dotychczasowe poziomy ulepszeń, szanse odbić i ograniczenia modyfikatorów.

## Zmiany w 0.0.8

- Paski życia **wszystkich wrogów** przeniesione pod sprite'y. Nadal pojawiają się po otrzymaniu obrażeń; to test położenia przed ostatecznym wyborem.
- **Odbijająca strzała** ma pięć poziomów szansy: 20%, 40%, 60%, 80%, 100%. Przed wyborem 0%, po pierwszej karcie 20%. Przy trafieniu i obecności kolejnego celu w zasięgu 140 jednostek wykonywany jest osobny rzut szansy. Maksymalnie dwa odbicia na strzałę, każde kolejne osłabia ją o 25%.
- **Odbijająca strzała** i **Rozdzielenie** wzajemnie się wykluczają w trakcie jednej wyprawy. Po wyborze jednego drugi nie pojawia się w kartach i nie może zostać wybrany nawet przez stary zapis oferty.
- Karta odbicia pokazuje aktualną i kolejną szansę procentową, a obie karty modyfikatorów wskazują konflikt.
- Panel statystyk pokazuje procent szansy odbicia i wyraźnie oznacza drugi modyfikator jako zablokowany z powodem. HUD pokazuje procent odbicia zamiast liczby odbić.
- Nie zmieniono bazowych obrażeń, HP przeciwników, ani pozostałych statystyk.

## Zmiany w 0.0.7

- Panel statystyk postaci: trzy kolumny obok siebie na PC dla statystyk i ulepszeń. Bardziej kompaktowe kafelki, mniejsze odstępy i większa maksymalna szerokość panelu. Na mniejszych ekranach automatycznie przechodzi do dwóch kolumn, żeby liczby i etykiety pozostały czytelne.
- Zielone i niebieskie slime’y wyświetlają teraz paski HP po otrzymaniu obrażeń, tak samo jak pozostali przeciwnicy. Kolorowe paski pokazują również ostatni 1 HP.
- Bez zmian w statystykach i sile przeciwników.

## Zmiany w 0.0.6

- Zielony slime ma 18 bazowych HP zamiast 14. Pierwsza podstawowa strzała zadaje 17 obrażeń, więc wymaga drugiego trafienia bez ulepszeń (HP wrogów wciąż rośnie delikatnie z czasem).
- Zestaw czytelnych, wektorowych ikonek przy wszystkich dokładnych statystykach i poziomach ulepszeń. Ikony wyróżniają życie, EXP, obrażenia, tempo ataku, ruch i modyfikatory. Bez zewnętrznych bibliotek i zasobów.
- Bez innych zmian balansu. +2 obrażenia za poziom pozostaje bez zmian.

## Zmiany w 0.0.5

- Karty wyraźnie pokazują numer wyboru 1, 2 albo 3 na dole.
- Pod kartami skrócone statystyki buildu oraz otwieranie szczegółowego panelu.
- Panel statystyk postaci pokazuje żywotność, EXP, obrażenia, interwał, szybkość strzelania, teoretyczny DPS, zasięg, szybkość ruchu, modyfikatory i ulepszenia.
- Statystyki liczone z tych samych parametrów co walka, otwarcie panelu zatrzymuje czas.
- Mocniejsze strzały: +2 obrażenia na poziom zamiast +5. Postęp 17 → 19 → 21 → 23.

## Zmiany w 0.0.4

- Przycisk pełnego ekranu obok pauzy w HUD, dostępny również jako przycisk w menu startowym.
- Skrót F do włączania/wyłączania pełnego ekranu.
- Wskaźnik stanu przycisku, obsługa powrotu do okna i przeliczania rozdzielczości Canvas.
- W przeglądarkach nieobsługujących Fullscreen API wyświetlany jest komunikat zamiast błędu.

## Zmiany w 0.0.3

- Kamera oddalona jeszcze trochę, z 0.82 do 0.74.
- Pięć typów przeciwników, odblokowywanych co 30 sekund. Wcześniejsze typy pozostają w puli:
  - 0 s: Zielony slime (wolny, najłatwiejszy).
  - 30 s: Niebieski slime (szybszy, wykonuje krótkie skoki na boki i zrywy).
  - 60 s: Czerwony slime (duży, wytrzymały, okazjonalnie przyspiesza).
  - 90 s: Goblin (walka wręcz, zygzakowaty pościg).
  - 120 s: Goblin łucznik (utrzymuje dystans, ostrzeliwuje i cofa się).
- Dodatkowe strzały przeciwników, czytelnie odróżnione od strzał gracza.
- EXP zależy od typu pokonanego wroga.
- Karty pokazują **obecny** poziom ulepszenia, np. 0/3 przed pierwszym wyborem. Opis mówi tylko co daje karta.
- Skalowanie rozstawu pojawiania się wrogów tak, by aktywnie walczyli również na szerokich ekranach.

## Zmiany w 0.0.2

- Dwa joysticki na telefonie (lewy i prawy), z przygaszeniem nieużywanego do 10%.
- Przełączanie aktywnego joysticka przez dotknięcie, sterowanie wyłącznie jednym joystickiem naraz.
- Kamera oddalona do 82% poprzedniego przybliżenia, widać większy obszar areny.

## Świadomie poza wersją 0.0.15

Brak pozostałych klas, konta, monet, sklepu, zapisywania postępu, rzadkości kart, kooperacji i gotowych animowanych assetów. To osobny prototyp, nie zmienia istniejącej strony świata Calionu.

## Główne parametry balansu (na próbę)

- RUN: `RUN_DURATION=300` sekund w `game.js`.
- Wprowadzanie typów wrogów: `ENEMY_UNLOCK_INTERVAL=30` sekund i `ENEMY_ROSTER`.
- Poziomy: `neededXp(level) = 8 + (level - 1) * 9`.
- 2 sloty modyfikatorów w HUD (na razie dostępny jest jeden z dwóch wzajemnie wykluczających się efektów). Odbicie ma 5 poziomów (20–100% szansy), Rozdzielenie 2 poziomy.
- Liczba przeciwników i pocisków jest ograniczona dla wydajności i czytelności.

## Pliki

- `index.html` – struktura strony i HUD.
- `style.css` – styl średniowieczny, UI i responsywność.
- `game.js` – logika i renderer Canvas 2D, bez bibliotek.

Żadnych plików graficznych nie trzeba na tym etapie pobierać. Wszystko działa lokalnie także bez połączenia z internetem.