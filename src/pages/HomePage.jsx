import React, { useState, useRef } from "react";
import {
  analyzeMood,
  MOODS_LIST,
  TIME_NOTES,
  getTimeContext,
} from "../services/moods";
import { Carousel } from "../components/Carousel";
import { SkeletonGrid } from "../components/SkeletonGrid";
import { MoodAnalytics } from "../components/MoodAnalytics";
import { MoodSlider } from "../components/MoodSlider";
import { VoiceWaveform } from "../components/VoiceWaveform";
import { AIFeedbackBanner } from "../components/AIFeedbackBanner";
import { DailyPickBanner } from "../components/DailyPickBanner";

export function HomePage({
  mood,
  onMoodSelect,
  onNav,
  onGetRecs,
  onSmartPick,
  onFaceScanOpen,
  trending,
  topRated,
  userData,
  onOpenMovie,
}) {
  const [inputVal, setInputVal] = useState("");
  const [micActive, setMicActive] = useState(false);
  const [sliderMood, setSliderMood] = useState(null);
  const [aiMoodResult, setAiMoodResult] = useState(null);
  const [showSlider, setShowSlider] = useState(false);
  const recognitionRef = useRef(null);
  const tc = getTimeContext();
  const timeNote = TIME_NOTES[tc];

  function handleGetRecs(overrideMood) {
    const m =
      overrideMood || analyzeMood(inputVal) || sliderMood || mood || "bored";
    onGetRecs(m);
  }

  function handleSurprise() {
    if (trending && trending.length > 0) {
      const idx = Math.floor(Math.random() * trending.length);
      onOpenMovie(trending[idx]);
    } else {
      onGetRecs("excited");
    }
  }

  function handleMicClick() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Voice recognition not supported in this browser. Try Chrome.");
      return;
    }
    if (micActive) {
      recognitionRef.current?.stop();
      setMicActive(false);
      return;
    }
    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.lang = "en-US";
    recognitionRef.current = r;
    r.onstart = () => setMicActive(true);
    r.onresult = (e) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++)
        t += e.results[i][0].transcript;
      setInputVal(t);
      if (e.results[e.results.length - 1].isFinal) {
        const m = analyzeMood(t) || "bored";
        setMicActive(false);
        onGetRecs(m);
      }
    };
    r.onerror = () => setMicActive(false);
    r.onend = () => setMicActive(false);
    r.start();
  }

  function handleSliderChange(m, energy) {
    setSliderMood(m);
    setAiMoodResult({
      mood: m,
      confidence: Math.round(energy),
      scores: [{ mood: m, pct: Math.round(energy) }],
    });
  }

  return (
    <div className="page" id="page-home">
      {/* HERO */}
      <div className="hero-section">
        <div className="hero-eyebrow">
          <span
            style={{
              width: 7,
              height: 7,
              background: "var(--mood-primary)",
              borderRadius: "50%",
              display: "inline-block",
            }}
          />
          AI-Powered Movie Discovery
        </div>
        <h1 className="hero-title">
          How are you <span className="gradient-text">feeling</span> today?
        </h1>
        <p className="hero-subtitle">
          Let AI pick your perfect movie — tell us your mood through text,
          voice, emoji, or your face.
        </p>

        {/* Time Context Banner */}
        <div className="time-context-banner glass">
          <span className="time-icon">{timeNote.emoji}</span>
          <span className="time-text">{timeNote.text}</span>
        </div>

        {/* AI Feedback */}
        {(mood || aiMoodResult?.mood) && (
          <AIFeedbackBanner
            mood={aiMoodResult?.mood || mood}
            confidence={aiMoodResult?.confidence}
            scores={aiMoodResult?.scores || []}
          />
        )}

        {/* Mood Input */}
        <div className="mood-input-container">
          {micActive ? (
            <div
              style={{
                width: "100%",
                maxWidth: 640,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                padding: "20px",
                background: "rgba(239,68,68,0.05)",
                borderRadius: "var(--r-full)",
                border: "1.5px solid rgba(239,68,68,0.3)",
              }}
            >
              <VoiceWaveform active={true} />
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>
                🎤 Listening... say how you feel
              </p>
              <p
                style={{
                  color: "var(--mood-primary)",
                  fontSize: "1rem",
                  minHeight: 24,
                }}
              >
                {inputVal}
              </p>
              <button
                className="btn-ghost"
                onClick={() => {
                  recognitionRef.current?.stop();
                  setMicActive(false);
                }}
                style={{ padding: "8px 20px" }}
              >
                Stop
              </button>
            </div>
          ) : (
            <div className="mood-input-wrap">
              <input
                type="text"
                className="mood-input"
                placeholder="e.g. 'I had a long day and need a laugh...'"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleGetRecs();
                }}
                aria-label="Describe your mood"
                id="mood-text-input"
              />
              <button
                className={`mic-btn${micActive ? " active" : ""}`}
                onClick={handleMicClick}
                title="Voice Input"
                aria-label="Voice input"
              >
                🎤
              </button>
              <button
                className="cam-btn"
                onClick={onFaceScanOpen}
                title="Face Scan"
                aria-label="Face emotion scan"
              >
                📷
              </button>
            </div>
          )}

          <div className="hero-actions">
            <button
              id="find-movie-btn"
              className="btn-glow"
              onClick={() => handleGetRecs()}
            >
              Find My Movie ✨
            </button>
            <button
              id="surprise-btn"
              className="btn-ghost"
              onClick={handleSurprise}
            >
              Surprise Me 🎲
            </button>
            <button
              id="smart-pick-btn"
              className="btn-ghost"
              onClick={onSmartPick}
            >
              AI Smart Pick 🤖
            </button>
            <button
              id="toggle-slider-btn"
              className="btn-ghost"
              onClick={() => setShowSlider((s) => !s)}
            >
              {showSlider ? "Hide Slider" : "🎚️ Energy Slider"}
            </button>
          </div>

          {/* Mood Energy Slider */}
          {showSlider && (
            <div
              className="glass"
              style={{
                width: "100%",
                maxWidth: 600,
                padding: "20px 24px",
                borderRadius: "var(--r-lg)",
                animation: "slideDown 0.4s ease",
              }}
            >
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "rgba(255,255,255,0.5)",
                  marginBottom: 14,
                  textAlign: "center",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Drag to set your energy level
              </p>
              <MoodSlider onMoodChange={handleSliderChange} />
              {sliderMood && (
                <button
                  className="btn-glow"
                  style={{ width: "100%", marginTop: 16 }}
                  onClick={() => handleGetRecs(sliderMood)}
                >
                  Get {sliderMood.charAt(0).toUpperCase() + sliderMood.slice(1)}{" "}
                  Movies ✨
                </button>
              )}
            </div>
          )}
        </div>

        {/* Emoji Mood Chips */}
        <div className="mood-selector">
          <div className="mood-selector-label">Or pick a vibe:</div>
          <div className="mood-chips">
            {MOODS_LIST.map(({ id, label, emoji }) => (
              <button
                key={id}
                id={`mood-chip-${id}`}
                className={`mood-chip${mood === id ? " selected" : ""}`}
                onClick={() => {
                  onMoodSelect(id);
                  setAiMoodResult({
                    mood: id,
                    confidence: 90,
                    scores: [{ mood: id, pct: 90 }],
                  });
                }}
                aria-label={`Select ${label} mood`}
                aria-pressed={mood === id}
              >
                <span className="mood-emoji">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* DAILY AI PICK */}
      <div className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">✨ Today's AI Pick</h2>
            <p className="section-sub">Curated by our AI just for today</p>
          </div>
        </div>
        <DailyPickBanner onOpen={onOpenMovie} />
      </div>

      {/* TRENDING */}
      <div className="section" style={{ position: "relative" }}>
        <div className="section-header">
          <div>
            <h2 className="section-title">🔥 Trending on OTT</h2>
            <p className="section-sub">What the world is watching right now</p>
          </div>
          <span className="section-link" onClick={() => onNav("trending")}>
            View All →
          </span>
        </div>
        {trending.length === 0 ? (
          <SkeletonGrid count={6} />
        ) : (
          <Carousel
            movies={trending}
            mood={mood}
            userData={userData}
            onOpen={onOpenMovie}
          />
        )}
      </div>

      {/* TOP RATED */}
      <div className="section" style={{ position: "relative" }}>
        <div className="section-header">
          <div>
            <h2 className="section-title">⭐ Top IMDb Rated</h2>
            <p className="section-sub">Critically acclaimed masterpieces</p>
          </div>
        </div>
        {topRated.length === 0 ? (
          <SkeletonGrid count={6} />
        ) : (
          <Carousel
            movies={topRated}
            mood={mood}
            userData={userData}
            onOpen={onOpenMovie}
          />
        )}
      </div>

      {/* MOOD ANALYTICS */}
      {userData?.moodHistory?.length > 0 && (
        <div className="section">
          <div className="section-header">
            <div>
              <h2 className="section-title">📊 Your Mood Analytics</h2>
              <p className="section-sub">Your viewing patterns over time</p>
            </div>
          </div>
          <MoodAnalytics userData={userData} />
        </div>
      )}
    </div>
  );
}
