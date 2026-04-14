import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OpenAI } from "openai";
import dns from "dns";

dns.setDefaultResultOrder("ipv4first"); // Fix for Node 18+ undici fetch failing on IPv6 for TMDB
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;
const TMDB_KEY = "668264e289ffc04698c3ec320697deac";
const TMDB_API = "https://api.themoviedb.org/3";

// Initialize OpenAI conditionally
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ----------------------------------------------------------------
// MOOD → GENRE MAPPING
// ----------------------------------------------------------------
const MOOD_GENRES = {
  happy: [35, 10751, 16, 10402, 12],
  sad: [18, 10749, 10402],
  stressed: [35, 16, 10751, 12],
  bored: [878, 14, 9648, 80, 28],
  romantic: [10749, 18, 35],
  anxious: [35, 16, 10751, 14],
  angry: [28, 12, 53],
  excited: [28, 12, 878, 14, 53],
  neutral: [18, 99, 9648, 12],
};

// ----------------------------------------------------------------
// TMDB FETCH UTILITY
// ----------------------------------------------------------------
async function tmdbFetch(endpoint, params = {}, retries = 3) {
  const url = new URL(TMDB_API + endpoint);
  url.searchParams.set("api_key", TMDB_KEY);
  url.searchParams.set("region", "IN");
  url.searchParams.set("include_adult", "false");

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, v);
  }

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("TMDB error: " + res.status);
      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 400 * (i + 1))); // backing off
    }
  }
}

function isTamilMovie(movie) {
  return (
    movie.original_language === "ta" ||
    (movie.title && /[அ-ஹ]/.test(movie.title)) ||
    (movie.original_title && /[அ-ஹ]/.test(movie.original_title))
  );
}

// Fetch multiple pages and combine
async function tmdbFetchPages(endpoint, params = {}, pages = 2) {
  const results = [];
  for (let p = 1; p <= pages; p++) {
    try {
      const data = await tmdbFetch(endpoint, { ...params, page: p });
      results.push(...(data.results || []));
    } catch (e) {
      /* continue */
    }
  }
  return results;
}

// ----------------------------------------------------------------
// API ENDPOINTS
// ----------------------------------------------------------------

// POST /api/mood — Analyze and combine mood signals
app.post("/api/mood", async (req, res) => {
  try {
    const { text, emojiMood, sliderValue, faceEmotion, voiceMood } = req.body;

    // Confidence scoring system
    const scores = {};

    // Voice gets highest priority (0.35)
    if (voiceMood) scores[voiceMood] = (scores[voiceMood] || 0) + 0.35;

    // Face detection (0.30)
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
      const m = faceMap[faceEmotion] || faceEmotion;
      scores[m] = (scores[m] || 0) + 0.3;
    }

    // Emoji selection (0.20)
    if (emojiMood) scores[emojiMood] = (scores[emojiMood] || 0) + 0.2;

    // Text NLP (0.15)
    if (text) {
      const KEYWORDS = {
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
        sad: [
          "sad",
          "unhappy",
          "crying",
          "cry",
          "down",
          "lonely",
          "heartbreak",
        ],
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
      const t = text.toLowerCase();
      for (const [mood, kws] of Object.entries(KEYWORDS)) {
        const hits = kws.filter((kw) => t.includes(kw)).length;
        if (hits > 0) scores[mood] = (scores[mood] || 0) + hits * 0.05;
      }
    }

    // Slider value (energy level, 0.10)
    if (sliderValue !== undefined) {
      const energy = parseInt(sliderValue);
      let sliderMood = "neutral";
      if (energy < 20) sliderMood = "sad";
      else if (energy < 40) sliderMood = "stressed";
      else if (energy < 60) sliderMood = "bored";
      else if (energy < 80) sliderMood = "happy";
      else sliderMood = "excited";
      scores[sliderMood] = (scores[sliderMood] || 0) + 0.1;
    }

    // Best mood
    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    const finalMood = best ? best[0] : emojiMood || "bored";

    // Build confidence string for UI feedback
    const topScores = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    res.json({
      mood: finalMood,
      confidence: best ? Math.min(100, Math.round(best[1] * 100)) : 50,
      scores: topScores.map(([m, s]) => ({
        mood: m,
        pct: Math.min(100, Math.round(s * 100)),
      })),
    });
  } catch (err) {
    console.error(`[API Error] ${req.url}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/recommendations — Main movie fetch with 50/50 English/Tamil balance
app.get("/api/recommendations", async (req, res) => {
  try {
    const { genreIds, rating, language, platform, releaseYear, query, mood } =
      req.query;

    if (query) {
      const searchLang =
        language === "en" ? "en-US" : language === "ta" ? "ta" : undefined;
      const results = await tmdbFetchPages(
        "/search/movie",
        { query, language: searchLang },
        2,
      );

      let filtered = results || [];

      if (language) {
        filtered = filtered.filter((m) => {
          if (language === "ta") {
            return (
              m.original_language === "ta" ||
              /[அ-ஹ]/.test(m.title || "") ||
              /[அ-ஹ]/.test(m.original_title || "")
            );
          }
          return m.original_language === language;
        });
      }

      if (rating) {
        const minRating = parseFloat(rating);
        if (!Number.isNaN(minRating)) {
          filtered = filtered.filter((m) => m.vote_average >= minRating);
        }
      }

      const filterGenres = genreIds
        ? genreIds
            .split(",")
            .map((g) => parseInt(g, 10))
            .filter(Boolean)
        : [];
      if (filterGenres.length > 0) {
        filtered = filtered.filter(
          (m) =>
            Array.isArray(m.genre_ids) &&
            m.genre_ids.some((id) => filterGenres.includes(id)),
        );
      }

      if (!language) {
        filtered.sort((a, b) => {
          const aTamil = isTamilMovie(a) ? 0 : 1;
          const bTamil = isTamilMovie(b) ? 0 : 1;
          if (aTamil !== bTamil) return aTamil - bTamil;
          return (b.vote_average || 0) - (a.vote_average || 0);
        });
      }

      return res.json({ results: filtered });
    }

    const moodGenres = mood ? MOOD_GENRES[mood] || MOOD_GENRES.neutral : [];
    const targetGenres = genreIds || moodGenres.slice(0, 2).join(",");

    const baseParams = {
      with_genres: targetGenres,
      sort_by: "vote_average.desc",
      // "vote_count.gte": 150,
      "vote_average.gte": rating || 6.0,
    };
    if (releaseYear)
      baseParams["primary_release_date.gte"] = `${releaseYear}-01-01`;
    if (platform) {
      baseParams["with_watch_providers"] = platform;
      baseParams["watch_region"] = "IN";
    }

    let results = [];

    if (!language || language === "ta") {
      const taMovies = await tmdbFetchPages(
        "/discover/movie",
        { ...baseParams, with_original_language: "ta", "vote_count.gte": 50 },
        3,
      );
      results.push(...taMovies);
    }
    if (!language || language === "en") {
      const enMovies = await tmdbFetchPages(
        "/discover/movie",
        { ...baseParams, with_original_language: "en" },
        3,
      );
      results.push(...enMovies);
    }
    if (language && language !== "en" && language !== "ta") {
      const langMovies = await tmdbFetchPages(
        "/discover/movie",
        { ...baseParams, with_original_language: language },
        3,
      );
      results.push(...langMovies);
    }

    // De-duplicate by id
    const seen = new Set();
    const unique = results.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    res.json({ results: unique.slice(0, 80) });
  } catch (err) {
    console.error(`[API Error] ${req.url}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mood-rows — Fetch separate Netflix-style row data for a mood
app.get("/api/mood-rows", async (req, res) => {
  try {
    const { mood } = req.query;
    const moodGenres = mood
      ? MOOD_GENRES[mood] || MOOD_GENRES.neutral
      : [28, 18];
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
      await Promise.allSettled([
        tmdbFetch("/trending/movie/week"),
        tmdbFetch("/discover/movie", { ...baseEn }),
        tmdbFetch("/discover/movie", { ...baseTa }),
        tmdbFetch("/discover/movie", {
          ...baseEn,
          sort_by: "vote_average.desc",
          "vote_count.gte": 50,
          "vote_count.lte": 500,
        }),
        tmdbFetch("/discover/movie", {
          ...baseTa,
          sort_by: "vote_average.desc",
          "vote_count.gte": 20,
          "vote_count.lte": 200,
        }),
      ]);

    const safe = (r) => (r.status === "fulfilled" ? r.value.results || [] : []);

    // Interleave English and Tamil for top picks
    const enTop = safe(topPicksEn);
    const taTop = safe(topPicksTa);
    const mixed = [];
    const maxLen = Math.max(enTop.length, taTop.length);
    for (let i = 0; i < maxLen; i++) {
      if (enTop[i]) mixed.push(enTop[i]);
      if (taTop[i]) mixed.push(taTop[i]);
    }

    res.json({
      trending: safe(trending).slice(0, 12),
      topPicks: mixed.slice(0, 20),
      hiddenGems: [...safe(hiddenGemsEn), ...safe(hiddenGemsTa)].slice(0, 15),
    });
  } catch (err) {
    console.error(`[API Error] ${req.url}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/hidden-gems — Low popularity, high rating films
app.get("/api/hidden-gems", async (req, res) => {
  try {
    const [en, ta] = await Promise.all([
      tmdbFetch("/discover/movie", {
        sort_by: "vote_average.desc",
        "vote_count.gte": 50,
        "vote_count.lte": 600,
        "vote_average.gte": 7.5,
        with_original_language: "en",
        include_adult: false, // ✅ already there
        certification_country: "IN", // 🔥 ADD
        "certification.lte": "UA", // 🔥 BLOCK 18+
      }),
      tmdbFetch("/discover/movie", {
        sort_by: "vote_average.desc",
        "vote_count.gte": 20,
        "vote_count.lte": 200,
        "vote_average.gte": 7.0,
        with_original_language: "ta",
        include_adult: false,
        certification_country: "IN", // 🔥 ADD
        "certification.lte": "UA", // 🔥 BLOCK 18+
      }),
    ]);

    const combined = [...(en.results || []), ...(ta.results || [])];
    const seen = new Set();
    const unique = combined.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
    res.json({ results: unique.slice(0, 20) });
  } catch (err) {
    console.error(`[API Error] ${req.url}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/daily-pick — Deterministic daily featured movie
app.get("/api/daily-pick", async (req, res) => {
  try {
    const data = await tmdbFetch("/discover/movie", {
      sort_by: "vote_average.desc",
      "vote_count.gte": 500,
      "vote_average.gte": 8.0,
      page: 1,
    });
    const results = data.results || [];
    // Seed with today's date for determinism
    const today = new Date();
    const seed =
      today.getFullYear() * 10000 +
      (today.getMonth() + 1) * 100 +
      today.getDate();
    const idx = seed % results.length;
    res.json(results[idx] || results[0]);
  } catch (err) {
    console.error(`[API Error] ${req.url}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ott/:id — OTT providers
app.get("/api/ott/:id", async (req, res) => {
  try {
    const data = await tmdbFetch(`/movie/${req.params.id}/watch/providers`);
    const results = data.results?.IN?.flatrate || data.results?.IN?.rent || [];
    res.json(results);
  } catch (err) {
    console.error(`[API Error] ${req.url}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trailer/:id — YouTube trailer key
app.get("/api/trailer/:id", async (req, res) => {
  try {
    const data = await tmdbFetch(`/movie/${req.params.id}/videos`);
    const trailer = (data.results || []).find(
      (v) => v.type === "Trailer" && v.site === "YouTube",
    );
    const teaser = (data.results || []).find(
      (v) => v.type === "Teaser" && v.site === "YouTube",
    );
    res.json({ key: trailer?.key || teaser?.key || null });
  } catch (err) {
    console.error(`[API Error] ${req.url}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/credits/:id — Movie cast
app.get("/api/credits/:id", async (req, res) => {
  try {
    const data = await tmdbFetch(`/movie/${req.params.id}/credits`);
    const cast = (data.cast || []).slice(0, 6).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      photo: c.profile_path
        ? `https://image.tmdb.org/t/p/w185${c.profile_path}`
        : null,
    }));
    const director = (data.crew || []).find((c) => c.job === "Director");
    res.json({ cast, director: director ? director.name : null });
  } catch (err) {
    console.error(`[API Error] ${req.url}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/similar/:id — Similar movies
app.get("/api/similar/:id", async (req, res) => {
  try {
    const data = await tmdbFetch(`/movie/${req.params.id}/similar`);
    res.json({ results: (data.results || []).slice(0, 8) });
  } catch (err) {
    console.error(`[API Error] ${req.url}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trending
app.get("/api/trending", async (req, res) => {
  try {
    const data = await tmdbFetch("/trending/movie/week");
    res.json(data);
  } catch (err) {
    console.error(`[API Error] ${req.url}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/top_rated
app.get("/api/top_rated", async (req, res) => {
  try {
    const data = await tmdbFetch("/movie/top_rated", {
      "vote_count.gte": 1000,
    });
    res.json(data);
  } catch (err) {
    console.error(`[API Error] ${req.url}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat — AI Chatbot with enriched context
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, currentMood, userName } = req.body;

    if (!openai) {
      // Smart fallback responses without OpenAI
      const lastMsg =
        messages[messages.length - 1]?.content?.toLowerCase() || "";
      let reply = "Hey! 👋 I'm MoodBot. ";
      if (lastMsg.includes("happy") || lastMsg.includes("joy"))
        reply +=
          "You're feeling great! 😄 Let me suggest some fun comedies and feel-good films for you!";
      else if (lastMsg.includes("sad") || lastMsg.includes("cry"))
        reply +=
          "Aww, sending virtual hugs 🤗 Some beautiful emotional dramas might help you process those feelings.";
      else if (lastMsg.includes("stress") || lastMsg.includes("anxious"))
        reply +=
          "Take a deep breath 💆 Light comedies and feel-good films are perfect for unwinding!";
      else if (lastMsg.includes("tamil"))
        reply +=
          "Tamil cinema is incredible! 🎬 From Kollywood classics to modern masterpieces — I've got you covered!";
      else if (lastMsg.includes("action"))
        reply +=
          "Action mode activated! 💥 Check out some high-octane thrillers and blockbusters!";
      else
        reply += `Based on your ${currentMood || "current"} mood, I recommend exploring the curated picks I've lined up for you! ✨ Connect an OpenAI key for smarter AI chat.`;

      return res.json({ role: "assistant", content: reply });
    }

    const systemPrompt = `You are MoodBot, the AI movie copilot for "MoodFlix AI" — a premium movie recommendation platform for Gen-Z college students.

Current user mood: ${currentMood || "unknown"}
User name: ${userName || "Movie Fan"}

Your personality:
- Friendly, warm, Gen-Z tone with relevant emojis
- Movie expert who knows both Hollywood AND Tamil cinema (Kollywood)
- Give specific movie recommendations with titles and brief reasons
- Keep replies under 200 words — punchy, fun, helpful
- Reference mood intelligently: don't just list movies, explain WHY they fit

When recommending movies:
- Always include 2-3 specific titles with (Year) and [Language] tags
- Mix English and Tamil movies when relevant
- Explain WHY each movie fits their current mood
- Format: "🎬 [Title] (Year) — [1 sentence reason]"

Available moods: happy, sad, stressed, bored, romantic, anxious, angry, excited, neutral
Always end with an engaging follow-up question.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 250,
      temperature: 0.8,
    });

    res.json({
      role: "assistant",
      content: response.choices[0].message.content,
    });
  } catch (err) {
    console.error(`[API Error] ${req.url}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🎬 MoodFlix Backend running on http://localhost:${PORT}`);
});
