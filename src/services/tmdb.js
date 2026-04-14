import { MOOD_GENRES } from "./moods";

const IMG_BASE = "https://image.tmdb.org/t/p/w500";
const IMG_ORIG = "https://image.tmdb.org/t/p/original";

export const OTT_MAP = {
  8: { name: "Netflix", color: "#E50914", bg: "rgba(229,9,20,.2)", icon: "🎬" },
  119: {
    name: "Prime Video",
    color: "#00A8E0",
    bg: "rgba(0,168,224,.2)",
    icon: "📦",
  },
  122: {
    name: "Disney+ Hotstar",
    color: "#1F80E0",
    bg: "rgba(31,128,224,.2)",
    icon: "⭐",
  },
  232: {
    name: "Zee5",
    color: "#7B2FD9",
    bg: "rgba(123,47,217,.2)",
    icon: "🟣",
  },
  237: {
    name: "SonyLIV",
    color: "#E51C23",
    bg: "rgba(229,28,35,.2)",
    icon: "📺",
  },
  11: { name: "MUBI", color: "#8B0000", bg: "rgba(139,0,0,.2)", icon: "🎞️" },
};

export const GENRE_NAMES = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  53: "Thriller",
  36: "History",
  10752: "War",
  37: "Western",
};

const LANG_LABELS = {
  en: "EN",
  ta: "TA",
  hi: "HI",
  te: "TE",
  ml: "ML",
  ko: "KO",
  ja: "JA",
  fr: "FR",
  es: "ES",
};

const apiCache = {};

export async function internalFetch(endpoint, params = {}) {
  const cacheKey = endpoint + JSON.stringify(params);
  if (apiCache[cacheKey]) return apiCache[cacheKey];
  const url = new URL(endpoint, window.location.origin);
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== "") url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("API error: " + res.status);
  const data = await res.json();
  apiCache[cacheKey] = data;
  return data;
}

export function normalizeMovie(m, otts = []) {
  const genreList = (m.genre_ids || [])
    .map((id) => GENRE_NAMES[id])
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");

  let ott = null;
  for (const p of otts) {
    if (OTT_MAP[p.provider_id]) {
      ott = { ...OTT_MAP[p.provider_id], id: p.provider_id };
      break;
    }
  }

  const lang = m.original_language || "";

  // 🔥 SMART TAMIL DETECTION
  const isTamil =
    lang === "ta" ||
    (m.title && /[அ-ஹ]/.test(m.title)) || // Tamil characters
    (m.original_title && /[அ-ஹ]/.test(m.original_title));

  return {
    id: m.id,
    title: m.title || m.name || "Untitled",
    genres: genreList,
    genreIds: m.genre_ids || [],
    rating: m.vote_average ? m.vote_average.toFixed(1) : "N/A",
    voteCount: m.vote_count || 0,
    overview: m.overview || "",
    releaseYear: m.release_date ? m.release_date.split("-")[0] : "",

    // 🔥 FIXED LANGUAGE HANDLING
    language: isTamil ? "ta" : lang,
    langLabel: isTamil ? "TA" : LANG_LABELS[lang] || lang.toUpperCase(),
    isTamil,

    popularity: m.popularity || 0,

    // 🔥 IMPORTANT FIX (poster fallback)
    poster: m.poster_path
      ? IMG_BASE + m.poster_path
      : "https://via.placeholder.com/300x450?text=No+Image",

    backdrop: m.backdrop_path ? IMG_ORIG + m.backdrop_path : null,

    ott,
    raw: m,
  };
}
// Main mood-based recommendations (Netflix-style multi-row sets)
export async function fetchMoviesByMood(mood, filters = {}) {
  const genreIds = MOOD_GENRES[mood] || MOOD_GENRES.neutral;
  const params = {
    genreIds: genreIds.slice(0, 2).join(","),
    rating: filters.rating || 6.0,
    language: filters.language || undefined,
    releaseYear: filters.year || undefined,
    platform: filters.platform || undefined,
    mood,
  };
  const data = await internalFetch("/api/recommendations", params);
  return (data.results || []).slice(0, 20).map((m) => normalizeMovie(m));
}

// Fetch all Netflix-style rows for a mood in one call
export async function fetchMoodRows(mood) {
  const data = await internalFetch("/api/mood-rows", { mood });
  const norm = (arr) => (arr || []).map((m) => normalizeMovie(m));
  return {
    trending: norm(data.trending),
    topPicks: norm(data.topPicks),
    hiddenGems: norm(data.hiddenGems),
  };
}

export async function fetchTrending() {
  const data = await internalFetch("/api/trending");
  return (data.results || []).slice(0, 12).map((m) => normalizeMovie(m));
}

export async function fetchTopRated() {
  const data = await internalFetch("/api/top_rated");
  return (data.results || []).slice(0, 12).map((m) => normalizeMovie(m));
}

export async function fetchHiddenGems() {
  const data = await internalFetch("/api/hidden-gems");
  return (data.results || []).slice(0, 12).map((m) => normalizeMovie(m));
}

export async function fetchDailyPick() {
  const data = await internalFetch("/api/daily-pick");
  return normalizeMovie(data);
}

export async function fetchTrailer(movieId) {
  const cacheKey = "trailer_" + movieId;
  if (apiCache[cacheKey] !== undefined) return apiCache[cacheKey];
  const data = await internalFetch(`/api/trailer/${movieId}`);
  apiCache[cacheKey] = data.key;
  return data.key;
}

export async function fetchOTT(movieId) {
  const data = await internalFetch(`/api/ott/${movieId}`);
  return data;
}

export async function fetchCredits(movieId) {
  const data = await internalFetch(`/api/credits/${movieId}`);
  return data;
}

export async function fetchSimilar(movieId) {
  const data = await internalFetch(`/api/similar/${movieId}`);
  return (data.results || []).slice(0, 8).map((m) => normalizeMovie(m));
}

export async function searchMovies(query) {
  const data = await internalFetch("/api/recommendations", { query });
  return (data.results || []).slice(0, 8).map((m) => normalizeMovie(m));
}

// Combine mood signals into final mood via backend
export async function analyzeMoodMultiModal({
  text,
  emojiMood,
  sliderValue,
  faceEmotion,
  voiceMood,
}) {
  const res = await fetch("/api/mood", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      emojiMood,
      sliderValue,
      faceEmotion,
      voiceMood,
    }),
  });
  return res.json(); // { mood, confidence, scores }
}
