import React, { useState, useEffect } from "react";
import { useParticles } from "./hooks/useParticles";
import { useToast } from "./hooks/useToast";
import { Navbar } from "./components/Navbar";
import { HomePage } from "./pages/HomePage";
import { RecsPage } from "./pages/RecsPage";
import { TrendingPage } from "./pages/TrendingPage";
import { FavoritesPage } from "./pages/FavoritesPage";
import { MovieModal } from "./modals/MovieModal";
import { SmartPickModal } from "./modals/SmartPickModal";
import { GroupModal } from "./modals/GroupModal";
import { SwipeModal } from "./modals/SwipeModal";
import { FaceScanModal } from "./modals/FaceScanModal";
import { Chatbot } from "./components/Chatbot";
import { AIOrb } from "./components/AIOrb";
import { ToastContainer } from "./components/ToastContainer";
import {
  fetchTrending,
  fetchTopRated,
  fetchMoviesByMood,
  fetchTamilSpotlight,
  fetchHollywoodSpotlight,
  fetchNewTamilReleases,
  fetchOttHighlights,
  fetchMoodBoosters,
} from "./services/tmdb";
import { loadUserData, saveUserData } from "./services/personalization";
import ParticleBackground from "./components/ParticleBackground";

function App() {
  const { toasts, push: addToast } = useToast();
  const [page, setPage] = useState("home");
  const [mood, setMood] = useState(null);
  const [recMovies, setRecMovies] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [tamilSpotlight, setTamilSpotlight] = useState([]);
  const [hollywoodSpotlight, setHollywoodSpotlight] = useState([]);
  const [newTamilReleases, setNewTamilReleases] = useState([]);
  const [ottHighlights, setOttHighlights] = useState([]);
  const [moodBoosters, setMoodBoosters] = useState([]);
  const [userData, setUserData] = useState(loadUserData());

  const [selectedMovie, setSelectedMovie] = useState(null);
  const [showSmartPick, setShowSmartPick] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [showSwipe, setShowSwipe] = useState(false);
  const [showFaceScan, setShowFaceScan] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useParticles();

  useEffect(() => {
    fetchTrending()
      .then(setTrending)
      .catch(() => {});
    fetchTopRated()
      .then(setTopRated)
      .catch(() => {});
    fetchTamilSpotlight()
      .then(setTamilSpotlight)
      .catch(() => {});
    fetchHollywoodSpotlight()
      .then(setHollywoodSpotlight)
      .catch(() => {});
    fetchNewTamilReleases()
      .then(setNewTamilReleases)
      .catch(() => {});
    fetchOttHighlights()
      .then(setOttHighlights)
      .catch(() => {});
    fetchMoodBoosters(mood || "neutral")
      .then(setMoodBoosters)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchMoodBoosters(mood || "neutral")
      .then(setMoodBoosters)
      .catch(() => {});
  }, [mood]);

  // Adaptive mood theme
  useEffect(() => {
    document.body.className = mood ? `mood-${mood}` : "mood-default";
  }, [mood]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  async function handleGetRecs(m, filters = {}) {
    setMood(m);
    setPage("recommendations");
    setRecLoading(true);
    setRecMovies([]);
    try {
      const movies = await fetchMoviesByMood(m, filters);
      setRecMovies(movies);
      const d = loadUserData();
      d.moodHistory = [
        { mood: m, ts: Date.now() },
        ...(d.moodHistory || []),
      ].slice(0, 30);
      saveUserData(d);
      setUserData(d);
    } catch (e) {
      addToast("Failed to load movies. Check your connection.", "error");
    } finally {
      setRecLoading(false);
    }
  }

  function handleOpenMovie(movie) {
    setSelectedMovie(movie);
    // Track genre affinity
    const d = loadUserData();
    d.genreAffinity = d.genreAffinity || {};
    (movie.genreIds || []).forEach((g) => {
      d.genreAffinity[g] = (d.genreAffinity[g] || 0) + 1;
    });
    saveUserData(d);
    setUserData(d);
  }

  function handleFaceDetected(detectedMood) {
    setMood(detectedMood);
    addToast(`🙂 Emotion detected: ${detectedMood}`, "success");
    handleGetRecs(detectedMood);
  }

  return (
    <>
      <ParticleBackground />

      <Navbar
        page={page}
        onNav={setPage}
        mood={mood}
        chatOpen={chatOpen}
        setChatOpen={setChatOpen}
        setShowGroup={setShowGroup}
        setShowSwipe={setShowSwipe}
      />

      <div className="page-container">
        {page === "home" && (
          <HomePage
            mood={mood}
            onMoodSelect={(m) => {
              setMood(m);
              handleGetRecs(m);
            }}
            onNav={setPage}
            onGetRecs={handleGetRecs}
            onSmartPick={() => setShowSmartPick(true)}
            onFaceScanOpen={() => setShowFaceScan(true)}
            trending={trending}
            topRated={topRated}
            tamilSpotlight={tamilSpotlight}
            hollywoodSpotlight={hollywoodSpotlight}
            newTamilReleases={newTamilReleases}
            ottHighlights={ottHighlights}
            moodBoosters={moodBoosters}
            userData={userData}
            onOpenMovie={handleOpenMovie}
          />
        )}
        {page === "recommendations" && (
          <RecsPage
            mood={mood}
            movies={recMovies}
            loading={recLoading}
            userData={userData}
            onOpenMovie={handleOpenMovie}
            onApplyFilters={(m, f) =>
              handleGetRecs(m, {
                rating: parseFloat(f.rating) || 0,
                platform: f.platform,
                language: f.language,
                year: f.year,
                query: f.query?.trim() || undefined,
              })
            }
          />
        )}
        {page === "trending" && (
          <TrendingPage userData={userData} onOpenMovie={handleOpenMovie} />
        )}
        {page === "favorites" && (
          <FavoritesPage
            userData={userData}
            onOpenMovie={handleOpenMovie}
            onUpdateUserData={setUserData}
          />
        )}
      </div>

      {/* Modals */}
      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          mood={mood}
          userData={userData}
          onClose={() => setSelectedMovie(null)}
          onUpdateUserData={setUserData}
          toast={addToast}
        />
      )}
      {showSmartPick && (
        <SmartPickModal
          mood={mood}
          userData={userData}
          onClose={() => setShowSmartPick(false)}
          onOpen={handleOpenMovie}
        />
      )}
      {showGroup && (
        <GroupModal
          onClose={() => setShowGroup(false)}
          onOpen={handleOpenMovie}
          toast={addToast}
        />
      )}
      {showSwipe && (
        <SwipeModal
          mood={mood}
          userData={userData}
          onClose={() => setShowSwipe(false)}
          toast={addToast}
        />
      )}
      {showFaceScan && (
        <FaceScanModal
          onDetected={handleFaceDetected}
          onClose={() => setShowFaceScan(false)}
          toast={addToast}
        />
      )}

      {/* AI Chatbot */}
      <Chatbot
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        currentMood={mood}
        setMood={setMood}
        onNav={setPage}
        onLoadMovies={(m) => handleGetRecs(m)}
        toast={addToast}
      />
      <AIOrb onClick={() => setChatOpen((o) => !o)} />
      <ToastContainer toasts={toasts} />
    </>
  );
}

export default App;
