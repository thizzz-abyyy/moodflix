import React, { useState, useEffect, useCallback } from "react";
import { MOOD_EMOJI } from "../services/moods";
import { Carousel } from "../components/Carousel";
import { MovieGrid } from "../components/MovieGrid";
import { SkeletonGrid } from "../components/SkeletonGrid";
import { AIFeedbackBanner } from "../components/AIFeedbackBanner";
import { fetchMoodRows, fetchHiddenGems, searchMovies } from "../services/tmdb";

const MOOD_EXPLANATION = {
  happy: "Upbeat, feel-good films guaranteed to keep your smile going.",
  sad: "Emotionally rich dramas and heartfelt stories to help you feel understood.",
  stressed: "Light comedies and relaxing watches to help you decompress.",
  bored: "Gripping thrillers, mysteries and adventures to keep you hooked.",
  romantic: "Heartwarming love stories and romantic dramas for your mood.",
  anxious: "Calming, feel-good films to help settle your mind.",
  angry:
    "Intense action and adrenaline-pumping blockbusters to channel that energy.",
  excited: "High-octane adventures and epic films to match your energy.",
  neutral: "A curated mix of critically acclaimed films across every genre.",
};

export function RecsPage({
  mood,
  movies,
  loading,
  userData,
  onOpenMovie,
  onApplyFilters,
}) {
  const [filters, setFilters] = useState({
    rating: "",
    platform: "",
    language: "",
    year: "",
    query: "",
  });
  const [moodRows, setMoodRows] = useState(null);
  const [hiddenGems, setHiddenGems] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [viewMode, setViewMode] = useState("rows"); // 'rows' | 'grid'
  const emojiMap = MOOD_EMOJI;

  // Fetch Netflix-style rows when mood changes
  useEffect(() => {
    if (!mood) return;
    setRowsLoading(true);
    Promise.all([fetchMoodRows(mood), fetchHiddenGems()])
      .then(([rows, gems]) => {
        setMoodRows(rows);
        setHiddenGems(gems);
        setRowsLoading(false);
      })
      .catch(() => setRowsLoading(false));
  }, [mood]);

  // Debounced filter update (only for grid mode / manual search)
  useEffect(() => {
    if (viewMode !== "grid") return;
    const handler = setTimeout(() => {
      onApplyFilters(mood, filters);
    }, 500);
    return () => clearTimeout(handler);
  }, [filters, mood, viewMode]);

  // Search suggestions for user typing
  useEffect(() => {
    if (viewMode !== "grid") return;
    const query = filters.query?.trim();
    if (!query) {
      setSuggestions([]);
      return;
    }

    let active = true;
    setSuggestionsLoading(true);
    searchMovies(query, filters.language || "ta")
      .then((results) => {
        if (!active) return;
        setSuggestions(results.slice(0, 6));
      })
      .catch(() => {
        if (!active) return;
        setSuggestions([]);
      })
      .finally(() => {
        if (active) setSuggestionsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters.query, filters.language, viewMode, mood]);

  const updateFilter = (key, val) =>
    setFilters((prev) => ({ ...prev, [key]: val }));

  const moodLabel = mood ? mood.charAt(0).toUpperCase() + mood.slice(1) : "";

  return (
    <div className="page">
      {/* Header */}
      <div className="recs-header">
        <div className="recs-title-row">
          <h1 className="recs-h1 gradient-text">
            {mood
              ? `${emojiMap[mood] || "🎬"} ${moodLabel} Picks`
              : "Your Recommendations"}
          </h1>
          {mood && (
            <span className="mood-badge">
              {emojiMap[mood]} {mood}
            </span>
          )}
        </div>
        <p className="recs-subtitle">
          {mood ? MOOD_EXPLANATION[mood] : "Explore the full catalog"}
        </p>
      </div>

      {/* AI Feedback */}
      {mood && <AIFeedbackBanner mood={mood} />}

      {/* AI Explanation */}
      {mood && (
        <div className="ai-explanation-banner glass">
          <span className="ai-exp-icon">🧠</span>
          <div className="ai-exp-content">
            <div className="ai-exp-title">Why these picks?</div>
            <div className="ai-exp-text">
              Based on your{" "}
              <strong style={{ color: "var(--mood-primary)" }}>{mood}</strong>{" "}
              mood, our AI selected a mix of English & Tamil films that best
              match your emotional state. We balance trending hits with hidden
              gems and classics for a perfect watchlist.
            </div>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="search-filter-container glass">
        <div className="search-bar-wrap">
          <span className="search-icon">🔍</span>
          <input
            id="movie-search-input"
            type="text"
            className="search-input"
            placeholder="Search for a movie title..."
            value={filters.query}
            onChange={(e) => {
              updateFilter("query", e.target.value);
              setViewMode("grid");
            }}
          />
        </div>
        <div className="filter-bar">
          {[
            {
              label: "⭐ Rating",
              key: "rating",
              opts: [
                ["", "Any Rating"],
                ["6", "6+"],
                ["7", "7+"],
                ["8", "8+"],
                ["9", "9+"],
              ],
            },
            {
              label: "📺 OTT",
              key: "platform",
              opts: [
                ["", "Any Platform"],
                ["8", "Netflix"],
                ["119", "Prime Video"],
                ["122", "Disney+ Hotstar"],
                ["232", "Zee5"],
                ["237", "SonyLIV"],
              ],
            },
            {
              label: "🌐 Language",
              key: "language",
              opts: [
                ["", "Any Language"],
                ["en", "English"],
                ["ta", "Tamil"],
                ["hi", "Hindi"],
                ["te", "Telugu"],
                ["ml", "Malayalam"],
              ],
            },
            {
              label: "📅 Year",
              key: "year",
              opts: [
                ["", "Any Year"],
                ["2023", "2023+"],
                ["2020", "2020+"],
                ["2015", "2015+"],
                ["2010", "2010+"],
              ],
            },
          ].map(({ label, key, opts }) => (
            <div key={key} style={{ position: "relative", flex: "1 1 150px" }}>
              <select
                id={`filter-${key}`}
                className="filter-select"
                value={filters[key]}
                onChange={(e) => {
                  updateFilter(key, e.target.value);
                  setViewMode("grid");
                }}
                aria-label={label}
              >
                {opts.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <button
            id="view-toggle-btn"
            className={`btn-ghost${viewMode === "rows" ? "" : ""}`}
            style={{ padding: "11px 20px", flex: "0 0 auto" }}
            onClick={() => setViewMode((v) => (v === "rows" ? "grid" : "rows"))}
          >
            {viewMode === "rows" ? "⊞ Grid" : "≡ Rows"}
          </button>
        </div>
      </div>

      {/* Netflix Rows Mode */}
      {viewMode === "rows" && mood && (
        <>
          {/* TOP PICKS — Interleaved English + Tamil */}
          <div className="section" style={{ position: "relative" }}>
            <div className="section-header">
              <div>
                <h2 className="section-title">🏆 Top Picks for Your Mood</h2>
                <p className="section-sub">
                  50% English · 50% Tamil · Curated by AI
                </p>
              </div>
            </div>
            {rowsLoading ? (
              <SkeletonGrid count={6} />
            ) : (
              <Carousel
                movies={moodRows?.topPicks || []}
                mood={mood}
                userData={userData}
                onOpen={onOpenMovie}
              />
            )}
          </div>

          {/* TRENDING NOW */}
          <div className="section" style={{ position: "relative" }}>
            <div className="section-header">
              <div>
                <h2 className="section-title">📈 Trending Now</h2>
                <p className="section-sub">
                  What everyone is watching this week
                </p>
              </div>
            </div>
            {rowsLoading ? (
              <SkeletonGrid count={6} />
            ) : (
              <Carousel
                movies={moodRows?.trending || []}
                mood={mood}
                userData={userData}
                onOpen={onOpenMovie}
              />
            )}
          </div>

          {/* BECAUSE YOU WATCHED — personalized from history */}
          {userData?.history?.length > 0 && (
            <div className="section" style={{ position: "relative" }}>
              <div className="section-header">
                <div>
                  <h2 className="section-title">🎭 Because You Watched</h2>
                  <p className="section-sub">Based on your viewing history</p>
                </div>
              </div>
              {rowsLoading ? (
                <SkeletonGrid count={6} />
              ) : (
                <Carousel
                  movies={moodRows?.topPicks?.slice(5, 15) || []}
                  mood={mood}
                  userData={userData}
                  onOpen={onOpenMovie}
                />
              )}
            </div>
          )}

          {/* HIDDEN GEMS */}
          <div className="section" style={{ position: "relative" }}>
            <div className="section-header">
              <div>
                <h2 className="section-title">💎 Hidden Gems</h2>
                <p className="section-sub">
                  Underrated films with outstanding ratings
                </p>
              </div>
            </div>
            {rowsLoading ? (
              <SkeletonGrid count={6} />
            ) : (
              <Carousel
                movies={hiddenGems}
                mood={mood}
                userData={userData}
                onOpen={onOpenMovie}
              />
            )}
          </div>
        </>
      )}

      {/* Grid Mode (search + filters) */}
      {viewMode === "grid" && (
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">🎬 Results</h2>
            <span
              style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}
            >
              {movies.length} movies
            </span>
          </div>
          <MovieGrid
            movies={movies}
            mood={mood}
            userData={userData}
            onOpen={onOpenMovie}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}
