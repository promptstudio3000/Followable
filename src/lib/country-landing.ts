/** Prototype: hero copy on About per country (language-flavored welcome) */

export type CountryLanding = {
  title: string;
  body: string;
};

const EN = (countryName: string): CountryLanding => ({
  title: `Welcome to Followable`,
  body: `You’re exploring ${countryName}. Hidden spots and local guides will appear here — we’re rolling out country by country. Switch regions from the header anytime.`,
});

const MESSAGES: Record<string, CountryLanding> = {
  ALL: {
    title: "Vítejte ve Followable",
    body: "Všechny země — prozkoumejte feed napříč Evropou (a postupně dál). Vypněte filtrování na jednu zemi a uvidíte POI z více států najednou.",
  },
  CZ: {
    title: "Vítejte ve Followable",
    body: "Objevte Českou republiku — skrytá místa, témata a tvůrci na jedné mapě. Vyberte kraj výše a prozkoumejte příspěvky podle zájmu.",
  },
  SK: {
    title: "Vitajte vo Followable",
    body: "Slovensko čoskoro naplno — zatiaľ si prezrite demo body na mape a presuňte sa späť do Česka pre plný obsah.",
  },
  DE: {
    title: "Willkommen bei Followable",
    body: "Deutschland — Demo-POIs auf der Karte. Vollständige Inhalte folgen; Tschechien ist derzeit der Hauptmarkt.",
  },
  PL: {
    title: "Witamy w Followable",
    body: "Polska — punkty demo na mapie. Pełna treść wkrótce; Czechy mają teraz najwięcej treści.",
  },
  FR: {
    title: "Bienvenue sur Followable",
    body: "La France — repères démo sur la carte. Le contenu complet arrive pays par pays.",
  },
  ES: {
    title: "Bienvenido a Followable",
    body: "España — puntos de demostración en el mapa. El contenido completo llegará poco a poco.",
  },
  IT: {
    title: "Benvenuto su Followable",
    body: "L’Italia — punti demo sulla mappa. I contenuti completi arriveranno a regime.",
  },
  PT: {
    title: "Bem-vindo ao Followable",
    body: "Portugal — pontos de demonstração no mapa. Conteúdo completo em expansão.",
  },
  GB: {
    title: "Welcome to Followable",
    body: "The UK — demo pins on the map. Full local guides are rolling out; Czechia has the richest feed today.",
  },
  US: {
    title: "Welcome to Followable",
    body: "The United States — explore demo spots on the map. We’re building out region by region.",
  },
  JP: {
    title: "Followableへようこそ",
    body: "日本 — 地図上のデモ地点です。本格的なコンテンツは順次拡大します。",
  },
};

export function getCountryLanding(code: string, countryNameCs: string): CountryLanding {
  const c = code.toUpperCase();
  if (MESSAGES[c]) return MESSAGES[c];
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    const enName = dn.of(c) ?? countryNameCs;
    return EN(enName);
  } catch {
    return EN(countryNameCs);
  }
}
