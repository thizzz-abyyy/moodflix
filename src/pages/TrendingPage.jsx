import React, { useState, useEffect } from "react";
import {
  fetchTrending,
  fetchTopRated,
  fetchHiddenGems,
  fetchTamilSpotlight,
  fetchHollywoodSpotlight,
} from "../services/tmdb";
import { MovieGrid } from "../components/MovieGrid";
import { Carousel } from "../components/Carousel";

const TABS = [
  { id: "trending", label: "🔥 Trending OTT", fn: fetchTrending },
  { id: "imdb", label: "⭐ Top IMDb", fn: fetchTopRated },
  { id: "gems", label: "💎 Hidden Gems", fn: fetchHiddenGems },
];

export function TrendingPage({ userData, onOpenMovie }) {
  const [activeTab, setActiveTab] = useState("trending");
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tamilMovies, setTamilMovies] = useState([]);
  const [tamilLoading, setTamilLoading] = useState(true);
  const [hollywoodMovies, setHollywoodMovies] = useState([]);
  const [hollywoodLoading, setHollywoodLoading] = useState(true);

  async function loadTab(tab) {
    setActiveTab(tab);
    setLoading(true);
    setMovies([]);
    const fn = TABS.find((t) => t.id === tab)?.fn || fetchTrending;
    try {
      const res = await fn();
      setMovies(res);
    } catch (e) {
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTab("trending");
    fetchTamilSpotlight()
      .then(setTamilMovies)
      .catch(() => setTamilMovies([]))
      .finally(() => setTamilLoading(false));
    fetchHollywoodSpotlight()
      .then(setHollywoodMovies)
      .catch(() => setHollywoodMovies([]))
      .finally(() => setHollywoodLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="recs-header">
        <h1
          className="gradient-text"
          style={{ fontSize: "clamp(1.8rem,4vw,3rem)", fontWeight: 900 }}
        >
          Trending Now
        </h1>
        <p className="recs-subtitle">What the world is watching right now</p>
      </div>

      {/* <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`trend-tab-${t.id}`}
            className={`tab${activeTab === t.id ? " active" : ""}`}
            onClick={() => loadTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div> */}

      <div className="section" style={{ marginTop: 60, position: "relative" }}>
        <div className="section-header">
          <div>
            <h2 className="section-title">🎬 Tamil Cinema Spotlight</h2>
            <p className="section-sub">Kollywood's finest — rated & reviewed</p>
          </div>
        </div>
        {tamilLoading ? (
          <div style={{ display: "flex", gap: 16, overflow: "hidden" }}>
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="skeleton-pulse"
                style={{
                  flex: "0 0 200px",
                  height: 300,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.05)",
                }}
              />
            ))}
          </div>
        ) : tamilMovies.length > 0 ? (
          <Carousel
            movies={tamilMovies}
            mood={null}
            userData={userData}
            onOpen={onOpenMovie}
          />
        ) : (
          <div
            style={{
              color: "rgba(255,255,255,0.5)",
              padding: "24px 0",
              textAlign: "center",
            }}
          >
            No Tamil cinema picks are available right now. Please refresh or try
            again later.
          </div>
        )}
      </div>

      <div className="section" style={{ marginTop: 40, position: "relative" }}>
        <div className="section-header">
          <div>
            <h2 className="section-title">🎥 Hollywood Highlights</h2>
            <p className="section-sub">
              Popular English-language films with strong reviews
            </p>
          </div>
        </div>
        {hollywoodLoading ? (
          <div style={{ display: "flex", gap: 16, overflow: "hidden" }}>
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="skeleton-pulse"
                style={{
                  flex: "0 0 200px",
                  height: 300,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.05)",
                }}
              />
            ))}
          </div>
        ) : hollywoodMovies.length > 0 ? (
          <Carousel
            movies={hollywoodMovies}
            mood={null}
            userData={userData}
            onOpen={onOpenMovie}
          />
        ) : (
          <div
            style={{
              color: "rgba(255,255,255,0.5)",
              padding: "24px 0",
              textAlign: "center",
            }}
          >
            No Hollywood picks are available right now. Please refresh or try
            again later.
          </div>
        )}
      </div>
    </div>
  );
}
