import React, { useState, useEffect } from 'react';
import { MOOD_GENRES, getTimeContext } from '../services/moods';
import { internalFetch, normalizeMovie } from '../services/tmdb';
import { MovieCard } from '../components/MovieCard';

export function SmartPickModal({ mood, userData, onClose, onOpen }) {
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const tc = getTimeContext();

  useEffect(() => {
    const m = mood || 'bored';
    const genres = MOOD_GENRES[m] || MOOD_GENRES.bored;
    internalFetch('/api/recommendations', { genreIds: genres[0], rating: 8.0 })
      .then(d => {
        const results = d.results || [];
        const pick = results[Math.floor(Math.random() * Math.min(5, results.length))];
        setMovie(pick ? normalizeMovie(pick) : null);
      })
      .catch(() => setMovie(null))
      .finally(() => setLoading(false));
  }, [mood]);

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="smart-pick-modal glass-deep">
        <button className="modal-close" onClick={onClose} style={{ position: 'absolute', top: 16, right: 16 }}>✕</button>
        <h2 className="gradient-text">🎯 Watch This Right Now</h2>
        <p className="smart-pick-reason">Based on your {mood || 'current'} mood &amp; it's {tc} time</p>
        {loading && <div style={{ padding: '40px', color: 'rgba(255,255,255,.4)' }}>🔄 Finding your perfect movie...</div>}
        {!loading && movie && <MovieCard movie={movie} mood={mood} userData={userData} onOpen={m => { onClose(); onOpen(m); }} style={{ maxWidth: '280px', margin: '0 auto' }} />}
        {!loading && !movie && <div style={{ color: 'rgba(255,255,255,.4)' }}>Could not find a movie. Try again!</div>}
      </div>
    </div>
  );
}
