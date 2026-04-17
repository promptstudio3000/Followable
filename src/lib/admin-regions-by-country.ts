import type { SearchPlace } from "@/lib/types";
import { getCountryMapConfig } from "@/lib/countries";

type AdminSeed = { id: string; label: string; latitude: number; longitude: number; radiusKm: number };

function toSearchPlace(countryCode: string, a: AdminSeed): SearchPlace {
  return {
    id: a.id,
    kind: "region",
    label: a.label,
    latitude: a.latitude,
    longitude: a.longitude,
    region: a.label,
    country: countryCode,
    radiusKm: a.radiusKm,
  };
}

const DE: AdminSeed[] = [
  { id: "de-bw", label: "Baden-Württemberg", latitude: 48.5, longitude: 9.0, radiusKm: 85 },
  { id: "de-by", label: "Bayern", latitude: 48.8, longitude: 11.5, radiusKm: 95 },
  { id: "de-be", label: "Berlin", latitude: 52.52, longitude: 13.4, radiusKm: 35 },
  { id: "de-bb", label: "Brandenburg", latitude: 52.4, longitude: 12.5, radiusKm: 70 },
  { id: "de-hb", label: "Bremen", latitude: 53.08, longitude: 8.8, radiusKm: 30 },
  { id: "de-hh", label: "Hamburg", latitude: 53.55, longitude: 10.0, radiusKm: 35 },
  { id: "de-he", label: "Hessen", latitude: 50.65, longitude: 9.0, radiusKm: 75 },
  { id: "de-mv", label: "Mecklenburg-Vorpommern", latitude: 53.6, longitude: 12.5, radiusKm: 80 },
  { id: "de-ni", label: "Niedersachsen", latitude: 52.5, longitude: 9.3, radiusKm: 90 },
  { id: "de-nw", label: "Nordrhein-Westfalen", latitude: 51.2, longitude: 7.0, radiusKm: 85 },
  { id: "de-rp", label: "Rheinland-Pfalz", latitude: 50.0, longitude: 7.5, radiusKm: 70 },
  { id: "de-sl", label: "Saarland", latitude: 49.4, longitude: 7.0, radiusKm: 35 },
  { id: "de-sn", label: "Sachsen", latitude: 51.05, longitude: 13.2, radiusKm: 65 },
  { id: "de-st", label: "Sachsen-Anhalt", latitude: 51.8, longitude: 11.5, radiusKm: 65 },
  { id: "de-sh", label: "Schleswig-Holstein", latitude: 54.2, longitude: 9.5, radiusKm: 70 },
  { id: "de-th", label: "Thüringen", latitude: 50.9, longitude: 11.0, radiusKm: 60 },
];

const AT: AdminSeed[] = [
  { id: "at-w", label: "Wien", latitude: 48.2, longitude: 16.37, radiusKm: 30 },
  { id: "at-n", label: "Niederösterreich", latitude: 48.3, longitude: 15.8, radiusKm: 55 },
  { id: "at-o", label: "Oberösterreich", latitude: 48.2, longitude: 14.0, radiusKm: 60 },
  { id: "at-s", label: "Salzburg", latitude: 47.5, longitude: 13.0, radiusKm: 55 },
  { id: "at-t", label: "Tirol", latitude: 47.27, longitude: 11.4, radiusKm: 65 },
  { id: "at-v", label: "Vorarlberg", latitude: 47.25, longitude: 9.8, radiusKm: 40 },
  { id: "at-k", label: "Kärnten", latitude: 46.6, longitude: 13.8, radiusKm: 55 },
  { id: "at-st", label: "Steiermark", latitude: 47.15, longitude: 15.0, radiusKm: 65 },
  { id: "at-b", label: "Burgenland", latitude: 47.5, longitude: 16.4, radiusKm: 45 },
];

const SK: AdminSeed[] = [
  { id: "sk-ba", label: "Bratislavský", latitude: 48.15, longitude: 17.1, radiusKm: 45 },
  { id: "sk-tr", label: "Trnavský", latitude: 48.4, longitude: 17.6, radiusKm: 50 },
  { id: "sk-tc", label: "Trenčiansky", latitude: 48.9, longitude: 18.0, radiusKm: 45 },
  { id: "sk-ni", label: "Nitriansky", latitude: 48.3, longitude: 18.1, radiusKm: 55 },
  { id: "sk-zi", label: "Žilinský", latitude: 49.2, longitude: 18.75, radiusKm: 55 },
  { id: "sk-bc", label: "Banskobystrický", latitude: 48.75, longitude: 19.15, radiusKm: 65 },
  { id: "sk-po", label: "Prešovský", latitude: 49.0, longitude: 21.25, radiusKm: 70 },
  { id: "sk-ko", label: "Košický", latitude: 48.72, longitude: 21.25, radiusKm: 65 },
];

const PL: AdminSeed[] = [
  { id: "pl-ds", label: "Dolnośląskie", latitude: 51.1, longitude: 17.0, radiusKm: 70 },
  { id: "pl-kp", label: "Kujawsko-pomorskie", latitude: 53.0, longitude: 18.5, radiusKm: 65 },
  { id: "pl-lu", label: "Lubelskie", latitude: 51.2, longitude: 22.6, radiusKm: 70 },
  { id: "pl-lb", label: "Lubuskie", latitude: 52.0, longitude: 15.5, radiusKm: 60 },
  { id: "pl-ld", label: "Łódzkie", latitude: 51.75, longitude: 19.45, radiusKm: 65 },
  { id: "pl-ma", label: "Małopolskie", latitude: 49.85, longitude: 20.0, radiusKm: 65 },
  { id: "pl-mz", label: "Mazowieckie", latitude: 52.2, longitude: 21.0, radiusKm: 80 },
  { id: "pl-op", label: "Opolskie", latitude: 50.7, longitude: 17.95, radiusKm: 45 },
  { id: "pl-pk", label: "Podkarpackie", latitude: 50.05, longitude: 22.0, radiusKm: 75 },
  { id: "pl-pd", label: "Podlaskie", latitude: 53.13, longitude: 23.15, radiusKm: 70 },
  { id: "pl-pm", label: "Pomorskie", latitude: 54.35, longitude: 18.65, radiusKm: 70 },
  { id: "pl-sl", label: "Śląskie", latitude: 50.25, longitude: 19.0, radiusKm: 60 },
  { id: "pl-sk", label: "Świętokrzyskie", latitude: 50.95, longitude: 20.95, radiusKm: 55 },
  { id: "pl-wn", label: "Warmińsko-mazurskie", latitude: 53.8, longitude: 20.5, radiusKm: 75 },
  { id: "pl-wp", label: "Wielkopolskie", latitude: 52.4, longitude: 17.0, radiusKm: 75 },
  { id: "pl-zp", label: "Zachodniopomorskie", latitude: 53.45, longitude: 15.5, radiusKm: 70 },
];

const FR: AdminSeed[] = [
  { id: "fr-idf", label: "Île-de-France", latitude: 48.85, longitude: 2.35, radiusKm: 55 },
  { id: "fr-cvl", label: "Centre-Val de Loire", latitude: 47.5, longitude: 1.75, radiusKm: 80 },
  { id: "fr-bfc", label: "Bourgogne-Franche-Comté", latitude: 47.2, longitude: 5.0, radiusKm: 85 },
  { id: "fr-norm", label: "Normandie", latitude: 49.2, longitude: 0.2, radiusKm: 75 },
  { id: "fr-hdf", label: "Hauts-de-France", latitude: 50.3, longitude: 3.05, radiusKm: 70 },
  { id: "fr-ges", label: "Grand Est", latitude: 48.6, longitude: 6.2, radiusKm: 95 },
  { id: "fr-bre", label: "Bretagne", latitude: 48.2, longitude: -2.8, radiusKm: 75 },
  { id: "fr-pdl", label: "Pays de la Loire", latitude: 47.45, longitude: -0.6, radiusKm: 75 },
  { id: "fr-naq", label: "Nouvelle-Aquitaine", latitude: 44.84, longitude: -0.58, radiusKm: 110 },
  { id: "fr-occ", label: "Occitanie", latitude: 43.6, longitude: 2.35, radiusKm: 100 },
  { id: "fr-ara", label: "Auvergne-Rhône-Alpes", latitude: 45.5, longitude: 4.85, radiusKm: 95 },
  { id: "fr-paca", label: "Provence-Alpes-Côte d'Azur", latitude: 43.9, longitude: 6.0, radiusKm: 85 },
  { id: "fr-cor", label: "Corse", latitude: 42.0, longitude: 9.0, radiusKm: 55 },
];

const IT: AdminSeed[] = [
  { id: "it-21", label: "Piemonte", latitude: 45.07, longitude: 7.7, radiusKm: 70 },
  { id: "it-23", label: "Valle d'Aosta", latitude: 45.74, longitude: 7.32, radiusKm: 35 },
  { id: "it-25", label: "Lombardia", latitude: 45.48, longitude: 9.77, radiusKm: 75 },
  { id: "it-32", label: "Trentino-Alto Adige", latitude: 46.5, longitude: 11.35, radiusKm: 55 },
  { id: "it-34", label: "Veneto", latitude: 45.65, longitude: 11.9, radiusKm: 70 },
  { id: "it-36", label: "Friuli-Venezia Giulia", latitude: 46.15, longitude: 13.0, radiusKm: 55 },
  { id: "it-42", label: "Liguria", latitude: 44.35, longitude: 8.95, radiusKm: 50 },
  { id: "it-45", label: "Emilia-Romagna", latitude: 44.6, longitude: 11.0, radiusKm: 75 },
  { id: "it-52", label: "Toscana", latitude: 43.35, longitude: 11.25, radiusKm: 80 },
  { id: "it-55", label: "Umbria", latitude: 42.95, longitude: 12.6, radiusKm: 45 },
  { id: "it-57", label: "Marche", latitude: 43.35, longitude: 13.0, radiusKm: 55 },
  { id: "it-62", label: "Lazio", latitude: 41.9, longitude: 12.5, radiusKm: 65 },
  { id: "it-65", label: "Abruzzo", latitude: 42.35, longitude: 13.65, radiusKm: 55 },
  { id: "it-67", label: "Molise", latitude: 41.7, longitude: 14.6, radiusKm: 40 },
  { id: "it-72", label: "Campania", latitude: 40.85, longitude: 14.25, radiusKm: 65 },
  { id: "it-75", label: "Puglia", latitude: 41.0, longitude: 16.5, radiusKm: 75 },
  { id: "it-77", label: "Basilicata", latitude: 40.5, longitude: 16.1, radiusKm: 45 },
  { id: "it-78", label: "Calabria", latitude: 39.0, longitude: 16.5, radiusKm: 65 },
  { id: "it-82", label: "Sicilia", latitude: 37.6, longitude: 14.0, radiusKm: 85 },
  { id: "it-88", label: "Sardegna", latitude: 40.0, longitude: 9.0, radiusKm: 80 },
];

const ES: AdminSeed[] = [
  { id: "es-an", label: "Andalucía", latitude: 37.4, longitude: -4.6, radiusKm: 120 },
  { id: "es-ar", label: "Aragón", latitude: 41.65, longitude: -0.9, radiusKm: 80 },
  { id: "es-as", label: "Asturias", latitude: 43.36, longitude: -5.84, radiusKm: 55 },
  { id: "es-ib", label: "Illes Balears", latitude: 39.57, longitude: 2.65, radiusKm: 45 },
  { id: "es-cn", label: "Canarias", latitude: 28.3, longitude: -15.5, radiusKm: 90 },
  { id: "es-cb", label: "Cantabria", latitude: 43.2, longitude: -4.0, radiusKm: 40 },
  { id: "es-cl", label: "Castilla y León", latitude: 41.75, longitude: -4.8, radiusKm: 100 },
  { id: "es-cm", label: "Castilla-La Mancha", latitude: 39.5, longitude: -3.0, radiusKm: 95 },
  { id: "es-ct", label: "Cataluña", latitude: 41.65, longitude: 1.85, radiusKm: 75 },
  { id: "es-ex", label: "Extremadura", latitude: 39.2, longitude: -6.15, radiusKm: 85 },
  { id: "es-ga", label: "Galicia", latitude: 42.75, longitude: -7.9, radiusKm: 85 },
  { id: "es-md", label: "Madrid", latitude: 40.42, longitude: -3.7, radiusKm: 45 },
  { id: "es-mc", label: "Murcia", latitude: 38.0, longitude: -1.5, radiusKm: 55 },
  { id: "es-nc", label: "Navarra", latitude: 42.82, longitude: -1.65, radiusKm: 50 },
  { id: "es-pv", label: "País Vasco", latitude: 43.15, longitude: -2.55, radiusKm: 55 },
  { id: "es-ri", label: "La Rioja", latitude: 42.3, longitude: -2.5, radiusKm: 40 },
  { id: "es-vc", label: "Comunitat Valenciana", latitude: 39.5, longitude: -0.4, radiusKm: 75 },
];

const NL: AdminSeed[] = [
  { id: "nl-dr", label: "Drenthe", latitude: 52.95, longitude: 6.65, radiusKm: 45 },
  { id: "nl-fl", label: "Flevoland", latitude: 52.55, longitude: 5.5, radiusKm: 35 },
  { id: "nl-fr", label: "Friesland", latitude: 53.2, longitude: 5.8, radiusKm: 50 },
  { id: "nl-ge", label: "Gelderland", latitude: 52.05, longitude: 5.95, radiusKm: 60 },
  { id: "nl-gr", label: "Groningen", latitude: 53.2, longitude: 6.55, radiusKm: 40 },
  { id: "nl-li", label: "Limburg", latitude: 51.25, longitude: 6.0, radiusKm: 45 },
  { id: "nl-nb", label: "Noord-Brabant", latitude: 51.65, longitude: 5.0, radiusKm: 55 },
  { id: "nl-nh", label: "Noord-Holland", latitude: 52.65, longitude: 4.9, radiusKm: 45 },
  { id: "nl-ov", label: "Overijssel", latitude: 52.5, longitude: 6.65, radiusKm: 45 },
  { id: "nl-ut", label: "Utrecht", latitude: 52.1, longitude: 5.15, radiusKm: 35 },
  { id: "nl-ze", label: "Zeeland", latitude: 51.5, longitude: 3.8, radiusKm: 40 },
  { id: "nl-zh", label: "Zuid-Holland", latitude: 52.0, longitude: 4.5, radiusKm: 40 },
];

const BE: AdminSeed[] = [
  { id: "be-vlg", label: "Vlaanderen", latitude: 51.0, longitude: 4.5, radiusKm: 65 },
  { id: "be-wal", label: "Wallonie", latitude: 50.45, longitude: 5.0, radiusKm: 75 },
  { id: "be-bru", label: "Bruxelles", latitude: 50.85, longitude: 4.35, radiusKm: 25 },
];

const PT: AdminSeed[] = [
  { id: "pt-n", label: "Norte", latitude: 41.15, longitude: -8.0, radiusKm: 70 },
  { id: "pt-c", label: "Centro", latitude: 40.2, longitude: -8.2, radiusKm: 80 },
  { id: "pt-l", label: "Lisboa", latitude: 38.75, longitude: -9.15, radiusKm: 55 },
  { id: "pt-al", label: "Alentejo", latitude: 38.2, longitude: -7.8, radiusKm: 85 },
  { id: "pt-ag", label: "Algarve", latitude: 37.2, longitude: -8.2, radiusKm: 55 },
  { id: "pt-ac", label: "Açores", latitude: 38.5, longitude: -28.0, radiusKm: 120 },
  { id: "pt-md", label: "Madeira", latitude: 32.75, longitude: -17.0, radiusKm: 45 },
];

const GB: AdminSeed[] = [
  { id: "gb-eng", label: "England", latitude: 52.5, longitude: -1.5, radiusKm: 180 },
  { id: "gb-sct", label: "Scotland", latitude: 56.5, longitude: -4.2, radiusKm: 120 },
  { id: "gb-wls", label: "Wales", latitude: 52.3, longitude: -3.8, radiusKm: 70 },
  { id: "gb-nir", label: "Northern Ireland", latitude: 54.6, longitude: -6.5, radiusKm: 55 },
];

const CH: AdminSeed[] = [
  { id: "ch-zh", label: "Zürich", latitude: 47.38, longitude: 8.55, radiusKm: 35 },
  { id: "ch-be", label: "Bern", latitude: 46.95, longitude: 7.45, radiusKm: 45 },
  { id: "ch-lu", label: "Luzern", latitude: 47.05, longitude: 8.3, radiusKm: 35 },
  { id: "ch-ur", label: "Uri", latitude: 46.88, longitude: 8.65, radiusKm: 30 },
  { id: "ch-sz", label: "Schwyz", latitude: 47.02, longitude: 8.65, radiusKm: 28 },
  { id: "ch-ow", label: "Obwalden", latitude: 46.9, longitude: 8.25, radiusKm: 22 },
  { id: "ch-nw", label: "Nidwalden", latitude: 46.96, longitude: 8.4, radiusKm: 22 },
  { id: "ch-gl", label: "Glarus", latitude: 47.05, longitude: 9.07, radiusKm: 25 },
  { id: "ch-zg", label: "Zug", latitude: 47.17, longitude: 8.52, radiusKm: 18 },
  { id: "ch-fr", label: "Fribourg", latitude: 46.8, longitude: 7.15, radiusKm: 35 },
  { id: "ch-so", label: "Solothurn", latitude: 47.2, longitude: 7.54, radiusKm: 30 },
  { id: "ch-bs", label: "Basel-Stadt", latitude: 47.57, longitude: 7.59, radiusKm: 15 },
  { id: "ch-bl", label: "Basel-Landschaft", latitude: 47.45, longitude: 7.75, radiusKm: 25 },
  { id: "ch-sh", label: "Schaffhausen", latitude: 47.7, longitude: 8.65, radiusKm: 22 },
  { id: "ch-ar", label: "Appenzell AR", latitude: 47.37, longitude: 9.4, radiusKm: 20 },
  { id: "ch-ai", label: "Appenzell IR", latitude: 47.33, longitude: 9.53, radiusKm: 18 },
  { id: "ch-sg", label: "St. Gallen", latitude: 47.42, longitude: 9.38, radiusKm: 40 },
  { id: "ch-gr", label: "Graubünden", latitude: 46.65, longitude: 9.53, radiusKm: 55 },
  { id: "ch-ag", label: "Aargau", latitude: 47.4, longitude: 8.05, radiusKm: 35 },
  { id: "ch-tg", label: "Thurgau", latitude: 47.57, longitude: 9.1, radiusKm: 32 },
  { id: "ch-ti", label: "Ticino", latitude: 46.35, longitude: 8.97, radiusKm: 45 },
  { id: "ch-vd", label: "Vaud", latitude: 46.55, longitude: 6.55, radiusKm: 40 },
  { id: "ch-vs", label: "Valais", latitude: 46.2, longitude: 7.35, radiusKm: 45 },
  { id: "ch-ne", label: "Neuchâtel", latitude: 47.0, longitude: 6.93, radiusKm: 28 },
  { id: "ch-ge", label: "Genève", latitude: 46.2, longitude: 6.15, radiusKm: 22 },
  { id: "ch-ju", label: "Jura", latitude: 47.35, longitude: 7.15, radiusKm: 28 },
];

const HU: AdminSeed[] = [
  { id: "hu-ce", label: "Közép-Magyarország", latitude: 47.5, longitude: 19.08, radiusKm: 55 },
  { id: "hu-nd", label: "Észak-Alföld", latitude: 47.5, longitude: 21.5, radiusKm: 65 },
  { id: "hu-dd", label: "Dél-Alföld", latitude: 46.25, longitude: 20.15, radiusKm: 70 },
  { id: "hu-na", label: "Északnyugat", latitude: 47.7, longitude: 17.5, radiusKm: 55 },
  { id: "hu-kd", label: "Közép-Dunántúl", latitude: 47.2, longitude: 18.4, radiusKm: 50 },
  { id: "hu-ddu", label: "Dél-Dunántúl", latitude: 46.25, longitude: 18.0, radiusKm: 55 },
  { id: "hu-sd", label: "Nyugat-Dunántúl", latitude: 47.2, longitude: 16.9, radiusKm: 45 },
];

const RO: AdminSeed[] = [
  { id: "ro-nw", label: "Nord-Vest", latitude: 47.2, longitude: 23.6, radiusKm: 70 },
  { id: "ro-ce", label: "Centru", latitude: 46.3, longitude: 24.15, radiusKm: 75 },
  { id: "ro-ne", label: "Nord-Est", latitude: 47.15, longitude: 26.65, radiusKm: 80 },
  { id: "ro-se", label: "Sud-Est", latitude: 45.15, longitude: 28.8, radiusKm: 85 },
  { id: "ro-s", label: "Sud", latitude: 44.2, longitude: 24.55, radiusKm: 75 },
  { id: "ro-sw", label: "Sud-Vest", latitude: 45.05, longitude: 23.3, radiusKm: 70 },
  { id: "ro-w", label: "Vest", latitude: 45.75, longitude: 21.2, radiusKm: 70 },
  { id: "ro-b", label: "București-Ilfov", latitude: 44.45, longitude: 26.1, radiusKm: 45 },
];

const US: AdminSeed[] = [
  { id: "us-ne", label: "Northeast", latitude: 42.5, longitude: -72.0, radiusKm: 280 },
  { id: "us-ma", label: "Mid-Atlantic", latitude: 40.0, longitude: -77.0, radiusKm: 220 },
  { id: "us-se", label: "Southeast", latitude: 33.5, longitude: -84.4, radiusKm: 350 },
  { id: "us-mw", label: "Midwest", latitude: 41.5, longitude: -93.5, radiusKm: 400 },
  { id: "us-sc", label: "South Central", latitude: 32.8, longitude: -97.0, radiusKm: 380 },
  { id: "us-mt", label: "Mountain", latitude: 39.5, longitude: -106.0, radiusKm: 450 },
  { id: "us-pc", label: "Pacific", latitude: 37.8, longitude: -122.4, radiusKm: 350 },
  { id: "us-ak", label: "Alaska", latitude: 64.8, longitude: -153.5, radiusKm: 500 },
  { id: "us-hi", label: "Hawaii", latitude: 20.8, longitude: -156.3, radiusKm: 120 },
];

const JP: AdminSeed[] = [
  { id: "jp-hk", label: "Hokkaidō", latitude: 43.35, longitude: 142.37, radiusKm: 180 },
  { id: "jp-th", label: "Tōhoku", latitude: 38.85, longitude: 140.75, radiusKm: 150 },
  { id: "jp-kt", label: "Kantō", latitude: 35.7, longitude: 139.75, radiusKm: 120 },
  { id: "jp-ch", label: "Chūbu", latitude: 35.5, longitude: 137.5, radiusKm: 130 },
  { id: "jp-ks", label: "Kansai", latitude: 34.7, longitude: 135.5, radiusKm: 100 },
  { id: "jp-cg", label: "Chūgoku", latitude: 34.8, longitude: 133.5, radiusKm: 110 },
  { id: "jp-sk", label: "Shikoku", latitude: 33.75, longitude: 133.5, radiusKm: 80 },
  { id: "jp-ky", label: "Kyūshū", latitude: 33.0, longitude: 130.5, radiusKm: 120 },
];

const CA: AdminSeed[] = [
  { id: "ca-bc", label: "British Columbia", latitude: 54.0, longitude: -124.5, radiusKm: 400 },
  { id: "ca-ab", label: "Alberta", latitude: 55.0, longitude: -115.0, radiusKm: 350 },
  { id: "ca-sk", label: "Saskatchewan", latitude: 54.0, longitude: -106.0, radiusKm: 320 },
  { id: "ca-mb", label: "Manitoba", latitude: 55.0, longitude: -97.0, radiusKm: 300 },
  { id: "ca-on", label: "Ontario", latitude: 50.0, longitude: -86.0, radiusKm: 450 },
  { id: "ca-qc", label: "Québec", latitude: 52.0, longitude: -72.0, radiusKm: 500 },
  { id: "ca-nb", label: "New Brunswick", latitude: 46.5, longitude: -66.5, radiusKm: 120 },
  { id: "ca-ns", label: "Nova Scotia", latitude: 45.0, longitude: -63.0, radiusKm: 130 },
  { id: "ca-pe", label: "Prince Edward Island", latitude: 46.4, longitude: -63.2, radiusKm: 60 },
  { id: "ca-nl", label: "Newfoundland and Labrador", latitude: 53.5, longitude: -58.0, radiusKm: 400 },
];

const AU: AdminSeed[] = [
  { id: "au-wa", label: "Western Australia", latitude: -25.0, longitude: 122.0, radiusKm: 800 },
  { id: "au-nt", label: "Northern Territory", latitude: -19.5, longitude: 133.5, radiusKm: 500 },
  { id: "au-sa", label: "South Australia", latitude: -30.0, longitude: 135.0, radiusKm: 450 },
  { id: "au-qld", label: "Queensland", latitude: -22.0, longitude: 144.0, radiusKm: 550 },
  { id: "au-nsw", label: "New South Wales", latitude: -32.0, longitude: 147.0, radiusKm: 400 },
  { id: "au-vic", label: "Victoria", latitude: -37.0, longitude: 145.0, radiusKm: 250 },
  { id: "au-tas", label: "Tasmania", latitude: -42.0, longitude: 146.5, radiusKm: 150 },
  { id: "au-act", label: "ACT", latitude: -35.3, longitude: 149.1, radiusKm: 40 },
];

const BY_COUNTRY: Record<string, AdminSeed[]> = {
  DE,
  AT,
  SK,
  PL,
  FR,
  IT,
  ES,
  NL,
  BE,
  PT,
  GB,
  CH,
  HU,
  RO,
  US,
  JP,
  CA,
  AU,
};

/** First-level admin regions with centroids (demo). */
export function getAdminRegionSeeds(countryCode: string): AdminSeed[] {
  return BY_COUNTRY[countryCode.toUpperCase()] ?? [];
}

export function getAdminSearchPlaces(countryCode: string): SearchPlace[] {
  const c = countryCode.toUpperCase();
  const seeds = BY_COUNTRY[c];
  if (!seeds?.length) return [];
  return seeds.map((s) => toSearchPlace(c, s));
}

/** Synthetic “whole country” place for filtering all demo POIs in that state. */
export function getDemoWholeCountryPlace(countryCode: string): SearchPlace {
  const c = countryCode.toUpperCase();
  const cfg = getCountryMapConfig(c);
  return {
    id: `demo-${c}-all`,
    kind: "country",
    label: "Celá země",
    latitude: cfg.centerLat,
    longitude: cfg.centerLng,
    country: c,
    radiusKm: 800,
  };
}
