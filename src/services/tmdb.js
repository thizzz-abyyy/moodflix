import { MOOD_GENRES } from "./moods";

const TMDB_API = "https://api.themoviedb.org/3";
const TMDB_KEY =
  import.meta.env.VITE_TMDB_API_KEY || "668264e289ffc04698c3ec320697deac";
const REGION = "IN";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";
const IMG_ORIG = "https://image.tmdb.org/t/p/original";
const PROFILE_BASE = "https://image.tmdb.org/t/p/w185";

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

function parseRoute(endpoint) {
  const trailer = endpoint.match(/^\/api\/trailer\/(\d+)$/);
  if (trailer) return { name: "trailer", id: trailer[1] };

  const ott = endpoint.match(/^\/api\/ott\/(\d+)$/);
  if (ott) return { name: "ott", id: ott[1] };

  const credits = endpoint.match(/^\/api\/credits\/(\d+)$/);
  if (credits) return { name: "credits", id: credits[1] };

  const similar = endpoint.match(/^\/api\/similar\/(\d+)$/);
  if (similar) return { name: "similar", id: similar[1] };

  return { name: endpoint };
}

function uniqueById(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function isTamilMovie(movie) {
  return (
    movie?.original_language === "ta" ||
    /[அ-ஹ]/.test(movie?.title || "") ||
    /[அ-ஹ]/.test(movie?.original_title || "")
  );
}

async function tmdbFetch(endpoint, params = {}) {
  const url = new URL(TMDB_API + endpoint);
  url.searchParams.set("api_key", TMDB_KEY);
  url.searchParams.set("region", REGION);
  url.searchParams.set("include_adult", "false");

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`TMDB error: ${response.status}`);
  }
  return response.json();
}

async function tmdbFetchPages(endpoint, params = {}, pages = 2) {
  const results = [];
  for (let page = 1; page <= pages; page += 1) {
    try {
      const data = await tmdbFetch(endpoint, { ...params, page });
      results.push(...(data.results || []));
    } catch {
      // Skip failed pages so the UI can still render partial results.
    }
  }
  return results;
}

async function discoverRecommendations(params = {}) {
  const { genreIds, rating, language, platform, releaseYear, query, mood } =
    params;

  if (query) {
    const searchLang =
      language === "en" ? "en-US" : language === "ta" ? "ta" : undefined;
    let results = await tmdbFetchPages(
      "/search/movie",
      { query, language: searchLang, include_adult: "false" },
      2,
    );

    if (language) {
      results = results.filter((movie) => {
        if (language === "ta") return isTamilMovie(movie);
        return movie.original_language === language;
      });
    }

    if (rating) {
      const minRating = parseFloat(rating);
      if (!Number.isNaN(minRating)) {
        results = results.filter((movie) => movie.vote_average >= minRating);
      }
    }

    const filterGenres = genreIds
      ? genreIds
          .split(",")
          .map((genreId) => parseInt(genreId, 10))
          .filter(Boolean)
      : [];

    if (filterGenres.length > 0) {
      results = results.filter(
        (movie) =>
          Array.isArray(movie.genre_ids) &&
          movie.genre_ids.some((genreId) => filterGenres.includes(genreId)),
      );
    }

    if (!language) {
      results.sort((a, b) => {
        const aTamil = isTamilMovie(a) ? 0 : 1;
        const bTamil = isTamilMovie(b) ? 0 : 1;
        if (aTamil !== bTamil) return aTamil - bTamil;
        return (b.vote_average || 0) - (a.vote_average || 0);
      });
    }

    return { results };
  }

  const moodGenres = mood ? MOOD_GENRES[mood] || MOOD_GENRES.neutral : [];
  const targetGenres = genreIds || moodGenres.slice(0, 2).join(",");
  const baseParams = {
    with_genres: targetGenres,
    sort_by: "vote_average.desc",
    "vote_average.gte": rating || 6.0,
  };

  if (releaseYear) {
    baseParams["primary_release_date.gte"] = `${releaseYear}-01-01`;
  }
  if (platform) {
    baseParams.with_watch_providers = platform;
    baseParams.watch_region = REGION;
  }

  let results = [];

  if (!language || language === "ta") {
    results.push(
      ...(await tmdbFetchPages(
        "/discover/movie",
        {
          ...baseParams,
          with_original_language: "ta",
          "vote_count.gte": 50,
        },
        1,
      )),
    );
  }

  if (!language || language === "en") {
    results.push(
      ...(await tmdbFetchPages(
        "/discover/movie",
        { ...baseParams, with_original_language: "en" },
        1,
      )),
    );
  }

  if (language && language !== "en" && language !== "ta") {
    results.push(
      ...(await tmdbFetchPages(
        "/discover/movie",
        { ...baseParams, with_original_language: language },
        1,
      )),
    );
  }

  return { results: uniqueById(results).slice(0, 80) };
}

async function fetchMoodRowsData(mood) {
  const moodGenres = mood ? MOOD_GENRES[mood] || MOOD_GENRES.neutral : [28, 18];
  const genreStr = moodGenres.slice(0, 2).join(",");

  const baseEn = {
    with_genres: genreStr,
    sort_by: "vote_average.desc",
    "vote_count.gte": 200,
    "vote_average.gte": 6.5,
    with_original_language: "en",
  };
  const baseTa = {
    with_genres: genreStr,
    sort_by: "vote_average.desc",
    "vote_count.gte": 50,
    "vote_average.gte": 6.0,
    with_original_language: "ta",
  };

  const [trending, topPicksEn, topPicksTa, hiddenGemsEn, hiddenGemsTa] =
    await Promise.all([
      tmdbFetch("/trending/movie/week"),
      tmdbFetch("/discover/movie", baseEn),
      tmdbFetch("/discover/movie", baseTa),
      tmdbFetch("/discover/movie", {
        ...baseEn,
        "vote_count.gte": 50,
        "vote_count.lte": 500,
      }),
      tmdbFetch("/discover/movie", {
        ...baseTa,
        "vote_count.gte": 20,
        "vote_count.lte": 200,
      }),
    ]);

  const enTop = topPicksEn.results || [];
  const taTop = topPicksTa.results || [];
  const mixed = [];
  const maxLen = Math.max(enTop.length, taTop.length);
  for (let index = 0; index < maxLen; index += 1) {
    if (enTop[index]) mixed.push(enTop[index]);
    if (taTop[index]) mixed.push(taTop[index]);
  }

  return {
    trending: (trending.results || []).slice(0, 12),
    topPicks: mixed.slice(0, 20),
    hiddenGems: uniqueById([
      ...(hiddenGemsEn.results || []),
      ...(hiddenGemsTa.results || []),
    ]).slice(0, 15),
  };
}

async function fetchHiddenGemsData() {
  const [en, ta] = await Promise.all([
    tmdbFetch("/discover/movie", {
      sort_by: "vote_average.desc",
      "vote_count.gte": 50,
      "vote_count.lte": 600,
      "vote_average.gte": 7.5,
      with_original_language: "en",
      certification_country: REGION,
      "certification.lte": "UA",
    }),
    tmdbFetch("/discover/movie", {
      sort_by: "vote_average.desc",
      "vote_count.gte": 20,
      "vote_count.lte": 200,
      "vote_average.gte": 7.0,
      with_original_language: "ta",
      certification_country: REGION,
      "certification.lte": "UA",
    }),
  ]);

  return {
    results: uniqueById([...(en.results || []), ...(ta.results || [])]).slice(
      0,
      20,
    ),
  };
}

async function fetchDailyPickData() {
  const data = await tmdbFetch("/discover/movie", {
    sort_by: "vote_average.desc",
    "vote_count.gte": 500,
    "vote_average.gte": 8.0,
    page: 1,
  });
  const results = data.results || [];
  if (results.length === 0) return null;

  const today = new Date();
  const seed =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();

  return results[seed % results.length] || results[0];
}

async function fetchTrailerData(movieId) {
  const data = await tmdbFetch(`/movie/${movieId}/videos`);
  const trailer = (data.results || []).find(
    (video) => video.type === "Trailer" && video.site === "YouTube",
  );
  const teaser = (data.results || []).find(
    (video) => video.type === "Teaser" && video.site === "YouTube",
  );
  return { key: trailer?.key || teaser?.key || null };
}

async function fetchOttData(movieId) {
  const data = await tmdbFetch(`/movie/${movieId}/watch/providers`);
  return data.results?.IN?.flatrate || data.results?.IN?.rent || [];
}

async function fetchCreditsData(movieId) {
  const data = await tmdbFetch(`/movie/${movieId}/credits`);
  const cast = (data.cast || []).slice(0, 6).map((person) => ({
    id: person.id,
    name: person.name,
    character: person.character,
    photo: person.profile_path ? `${PROFILE_BASE}${person.profile_path}` : null,
  }));
  const director = (data.crew || []).find(
    (person) => person.job === "Director",
  );

  return { cast, director: director ? director.name : null };
}

async function fetchSimilarData(movieId) {
  const data = await tmdbFetch(`/movie/${movieId}/similar`);
  return { results: (data.results || []).slice(0, 8) };
}

export async function internalFetch(endpoint, params = {}) {
  const route = parseRoute(endpoint);
  const cacheKey = JSON.stringify({ route, params });

  if (!apiCache[cacheKey]) {
    apiCache[cacheKey] = (async () => {
      switch (route.name) {
        case "/api/recommendations":
          return discoverRecommendations(params);
        case "/api/mood-rows":
          return fetchMoodRowsData(params.mood);
        case "/api/trending":
          return tmdbFetch("/trending/movie/week");
        case "/api/top_rated":
          return tmdbFetch("/movie/top_rated", { "vote_count.gte": 1000 });
        case "/api/hidden-gems":
          return fetchHiddenGemsData();
        case "/api/daily-pick":
          return fetchDailyPickData();
        case "trailer":
          return fetchTrailerData(route.id);
        case "ott":
          return fetchOttData(route.id);
        case "credits":
          return fetchCreditsData(route.id);
        case "similar":
          return fetchSimilarData(route.id);
        default:
          throw new Error(`Unsupported client-side API endpoint: ${endpoint}`);
      }
    })().catch((error) => {
      delete apiCache[cacheKey];
      throw error;
    });
  }

  return apiCache[cacheKey];
}

export function normalizeMovie(m, otts = []) {
  const genreList = (m.genre_ids || [])
    .map((id) => GENRE_NAMES[id])
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");

  let ott = null;
  for (const provider of otts) {
    if (OTT_MAP[provider.provider_id]) {
      ott = { ...OTT_MAP[provider.provider_id], id: provider.provider_id };
      break;
    }
  }

  const lang = m.original_language || "";
  const isTamil =
    lang === "ta" ||
    (m.title && /[அ-ஹ]/.test(m.title)) ||
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
    language: isTamil ? "ta" : lang,
    langLabel: isTamil ? "TA" : LANG_LABELS[lang] || lang.toUpperCase(),
    isTamil,
    popularity: m.popularity || 0,
    poster: m.poster_path
      ? IMG_BASE + m.poster_path
      : "https://via.placeholder.com/300x450?text=No+Image",
    backdrop: m.backdrop_path ? IMG_ORIG + m.backdrop_path : null,
    ott,
    raw: m,
  };
}

export async function fetchMoviesByMood(mood, filters = {}) {
  const genreIds = MOOD_GENRES[mood] || MOOD_GENRES.neutral;
  const data = await internalFetch("/api/recommendations", {
    genreIds: genreIds.slice(0, 2).join(","),
    rating: filters.rating || 6.0,
    language: filters.language || undefined,
    releaseYear: filters.year || undefined,
    platform: filters.platform || undefined,
    query: filters.query?.trim() || undefined,
    mood,
  });
  return (data.results || [])
    .slice(0, 60)
    .map((movie) => normalizeMovie(movie));
}

export async function fetchMoodRows(mood) {
  const data = await internalFetch("/api/mood-rows", { mood });
  const norm = (items) => (items || []).map((movie) => normalizeMovie(movie));

  return {
    trending: norm(data.trending),
    topPicks: norm(data.topPicks),
    hiddenGems: norm(data.hiddenGems),
  };
}

export async function fetchTrending() {
  const data = await internalFetch("/api/trending");
  return (data.results || [])
    .slice(0, 12)
    .map((movie) => normalizeMovie(movie));
}

export async function fetchTopRated() {
  const data = await internalFetch("/api/top_rated");
  return (data.results || [])
    .slice(0, 12)
    .map((movie) => normalizeMovie(movie));
}

export async function fetchHiddenGems() {
  const data = await internalFetch("/api/hidden-gems");
  return (data.results || [])
    .slice(0, 12)
    .map((movie) => normalizeMovie(movie));
}

export async function fetchTamilSpotlight() {
  const data = await internalFetch("/api/recommendations", {
    language: "ta",
    rating: "6.0",
  });
  return (data.results || []).map((movie) => normalizeMovie(movie));
}

export async function fetchHollywoodSpotlight() {
  const data = await internalFetch("/api/recommendations", {
    language: "en",
    rating: "7.0",
  });
  return (data.results || []).map((movie) => normalizeMovie(movie));
}

export async function fetchNewTamilReleases() {
  const data = await internalFetch("/api/recommendations", {
    language: "ta",
    rating: "6.0",
    releaseYear: "2022",
  });
  return (data.results || []).map((movie) => normalizeMovie(movie));
}

export async function fetchOttHighlights() {
  const data = await internalFetch("/api/recommendations", {
    platform: "8",
    rating: "6.5",
    language: "ta",
  });
  return (data.results || []).map((movie) => normalizeMovie(movie));
}

export async function fetchMoodBoosters(mood) {
  const moodKey = mood || "neutral";
  const primary = await internalFetch("/api/recommendations", {
    mood: moodKey,
    language: "ta",
    rating: "6.0",
  });
  const primaryMovies = (primary.results || []).slice();

  if (primaryMovies.length >= 10) {
    return primaryMovies.map((movie) => normalizeMovie(movie));
  }

  const secondary = await internalFetch("/api/recommendations", {
    mood: moodKey,
    rating: "6.0",
  });
  const combined = uniqueById([...primaryMovies, ...(secondary.results || [])]);
  return combined.slice(0, 14).map((movie) => normalizeMovie(movie));
}

export async function fetchDailyPick() {
  const data = await internalFetch("/api/daily-pick");
  return data ? normalizeMovie(data) : null;
}

export async function fetchTrailer(movieId) {
  const data = await internalFetch(`/api/trailer/${movieId}`);
  return data.key;
}

export async function fetchOTT(movieId) {
  return internalFetch(`/api/ott/${movieId}`);
}

export async function fetchCredits(movieId) {
  return internalFetch(`/api/credits/${movieId}`);
}

export async function fetchSimilar(movieId) {
  const data = await internalFetch(`/api/similar/${movieId}`);
  return (data.results || []).slice(0, 8).map((movie) => normalizeMovie(movie));
}

export async function searchMovies(query, language) {
  const data = await internalFetch("/api/recommendations", {
    query,
    language,
  });
  return (data.results || []).slice(0, 8).map((movie) => normalizeMovie(movie));
}

export async function analyzeMoodMultiModal({
  text,
  emojiMood,
  sliderValue,
  faceEmotion,
  voiceMood,
}) {
  const scores = {};

  if (voiceMood) scores[voiceMood] = (scores[voiceMood] || 0) + 0.35;

  if (faceEmotion) {
    const faceMap = {
      happy: "happy",
      sad: "sad",
      angry: "angry",
      neutral: "neutral",
      surprised: "excited",
      fearful: "anxious",
      disgusted: "stressed",
    };
    const mappedMood = faceMap[faceEmotion] || faceEmotion;
    scores[mappedMood] = (scores[mappedMood] || 0) + 0.3;
  }

  if (emojiMood) scores[emojiMood] = (scores[emojiMood] || 0) + 0.2;

  if (text) {
    const keywords = {
      happy: [
        "happy",
        "joy",
        "great",
        "amazing",
        "wonderful",
        "laugh",
        "smile",
        "fun",
      ],
      sad: ["sad", "unhappy", "crying", "cry", "down", "lonely", "heartbreak"],
      stressed: [
        "stressed",
        "stress",
        "worried",
        "overwhelmed",
        "pressure",
        "tense",
      ],
      bored: ["bored", "nothing", "dull", "idle", "free", "lazy", "blah"],
      romantic: ["romantic", "love", "crush", "date", "couple"],
      anxious: ["anxious", "anxiety", "nervous", "uneasy", "restless"],
      angry: ["angry", "mad", "furious", "frustrated", "annoyed", "rage"],
      excited: ["excited", "thrilled", "pumped", "hyped", "energetic"],
    };
    const normalized = text.toLowerCase();
    for (const [moodKey, values] of Object.entries(keywords)) {
      const hits = values.filter((value) => normalized.includes(value)).length;
      if (hits > 0) scores[moodKey] = (scores[moodKey] || 0) + hits * 0.05;
    }
  }

  if (sliderValue !== undefined) {
    const energy = parseInt(sliderValue, 10);
    let sliderMood = "neutral";
    if (energy < 20) sliderMood = "sad";
    else if (energy < 40) sliderMood = "stressed";
    else if (energy < 60) sliderMood = "bored";
    else if (energy < 80) sliderMood = "happy";
    else sliderMood = "excited";
    scores[sliderMood] = (scores[sliderMood] || 0) + 0.1;
  }

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const finalMood = best ? best[0] : emojiMood || "bored";
  const topScores = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([moodKey, score]) => ({
      mood: moodKey,
      pct: Math.min(100, Math.round(score * 100)),
    }));

  return {
    mood: finalMood,
    confidence: best ? Math.min(100, Math.round(best[1] * 100)) : 50,
    scores: topScores,
  };
}
