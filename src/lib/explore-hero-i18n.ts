/** Primary locale used for "Discover [Country]" style hero per ISO code (fallback en). */
const CODE_TO_LOCALE: Record<string, string> = {
  CZ: "cs",
  SK: "sk",
  PL: "pl",
  DE: "de",
  AT: "de",
  CH: "de",
  LI: "de",
  FR: "fr",
  BE: "fr",
  LU: "fr",
  MC: "fr",
  ES: "es",
  AD: "es",
  PT: "pt",
  IT: "it",
  SM: "it",
  VA: "it",
  NL: "nl",
  GB: "en",
  IE: "en",
  US: "en",
  CA: "en",
  AU: "en",
  NZ: "en",
  JP: "ja",
  KR: "ko",
  CN: "zh",
  BR: "pt",
  MX: "es",
  AR: "es",
  HU: "hu",
  RO: "ro",
  BG: "bg",
  GR: "el",
  HR: "hr",
  SI: "sl",
  RS: "sr",
  BA: "bs",
  ME: "sr",
  SE: "sv",
  NO: "nb",
  DK: "da",
  FI: "fi",
  IS: "is",
  EE: "et",
  LV: "lv",
  LT: "lt",
  UA: "uk",
  TR: "tr",
  RU: "ru",
  IL: "he",
  IN: "en",
  ZA: "en",
  EG: "ar",
  MA: "ar",
  KZ: "kk",
  GE: "ka",
};

const DISCOVER_VERB: Record<string, string> = {
  cs: "Objevte",
  sk: "Objavte",
  pl: "Odkryj",
  de: "Entdecke",
  fr: "Découvrez",
  es: "Descubre",
  it: "Scopri",
  pt: "Descubra",
  nl: "Ontdek",
  en: "Discover",
  ja: "探索する",
  ko: "탐험하세요",
  zh: "探索",
  hu: "Fedezze fel",
  ro: "Descoperă",
  bg: "Открийте",
  el: "Ανακαλύψτε",
  hr: "Otkrijte",
  sl: "Raziščite",
  sr: "Otkrijte",
  bs: "Otkrijte",
  sv: "Upptäck",
  nb: "Oppdag",
  da: "Oplev",
  fi: "Tutustu",
  is: "Kannaðu",
  et: "Avasta",
  lv: "Atklājiet",
  lt: "Atraskite",
  uk: "Відкрийте",
  tr: "Keşfedin",
  ru: "Откройте",
  he: "גלו את",
  ar: "اكتشف",
  kk: "Зерттеңіз",
  ka: "აღმოაჩინეთ",
};

const SUBTITLE: Record<string, string> = {
  cs: "Kraje, témata a tvůrci na mapě.",
  sk: "Kraje, témy a tvorcovia na mape.",
  pl: "Regiony, tematy i twórcy na mapie.",
  de: "Regionen, Themen und Creator auf der Karte.",
  fr: "Régions, thèmes et créateurs sur la carte.",
  es: "Regiones, temas y creadores en el mapa.",
  it: "Regioni, temi e creator sulla mappa.",
  pt: "Regiões, temas e criadores no mapa.",
  nl: "Regio’s, thema’s en makers op de kaart.",
  en: "Regions, topics and creators on the map.",
  ja: "地域、トピック、クリエイターを地図で。",
  ko: "지역, 주제, 크리에이터를 지도에서 만나보세요.",
  zh: "在地图上探索地区、主题和创作者。",
  hu: "Régiók, témák és alkotók a térképen.",
  ro: "Regiuni, teme și creatori pe hartă.",
  bg: "Региони, теми и създатели на картата.",
  el: "Περιοχές, θέματα και δημιουργοί στον χάρτη.",
  hr: "Regije, teme i stvaratelji na karti.",
  sl: "Regije, teme in ustvarjalci na zemljevidu.",
  sr: "Regioni, teme i kreatori na mapi.",
  bs: "Regije, teme i kreatori na mapi.",
  sv: "Regioner, ämnen och skapare på kartan.",
  nb: "Regioner, temaer og skapere på kartet.",
  da: "Regioner, emner og skabere på kortet.",
  fi: "Alueet, aiheet ja tekijät kartalla.",
  is: "Svæði, efni og höfundar á kortinu.",
  et: "Piirkonnad, teemad ja loojad kaardil.",
  lv: "Reģioni, tēmas un veidotāji kartē.",
  lt: "Regionai, temos ir kūrėjai žemėlapyje.",
  uk: "Регіони, теми та творці на карті.",
  tr: "Haritada bölgeler, konular ve içerik üreticileri.",
  ru: "Регионы, темы и авторы на карте.",
  he: "אזורים, נושאים ויוצרים על המפה.",
  ar: "مناطق ومواضع ومبدعون على الخريطة.",
  kk: "Аймақтар, тақырыптар және жасаушылар картада.",
  ka: "რეგიონები, თემები და შემქმნელები რუკაზე.",
};

/** H1 + subtitle for Explore hero by selected country (localized to that state’s language where mapped). */
export function getExploreHeroCopy(countryCode: string): { title: string; subtitle: string } {
  const c = countryCode.toUpperCase();
  if (c === "ALL") {
    return {
      title: "Objevte všechny země",
      subtitle: SUBTITLE.cs,
    };
  }
  const locale = CODE_TO_LOCALE[c] ?? "en";
  const verb = DISCOVER_VERB[locale] ?? DISCOVER_VERB.en;
  let countryName: string;
  try {
    countryName = new Intl.DisplayNames([locale], { type: "region" }).of(c) ?? c;
  } catch {
    countryName = new Intl.DisplayNames(["en"], { type: "region" }).of(c) ?? c;
  }

  if (c === "CZ") {
    return {
      title: "Objevte Českou republiku",
      subtitle: SUBTITLE.cs,
    };
  }

  if (c === "DE" && locale === "de") {
    return { title: "Entdecke Deutschland", subtitle: SUBTITLE.de };
  }

  const subtitle = SUBTITLE[locale] ?? SUBTITLE.en;
  return {
    title: `${verb} ${countryName}`,
    subtitle,
  };
}

export function exploreDemoMapNote(countryCode: string, isCzechia: boolean, demoEnabled: boolean): string | null {
  if (countryCode.toUpperCase() === "ALL") return null;
  if (isCzechia || !demoEnabled) return null;
  return ` Mapa: ukázkové body (${countryCode}).`;
}
