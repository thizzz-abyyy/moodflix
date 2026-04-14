import React, { useState, useEffect } from 'react';
import { fetchDailyPick, fetchTrailer } from '../services/tmdb';
import { normalizeMovie } from '../services/tmdb';

export function DailyPickBanner({ onOpen }) {
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDailyPick()
      .then(m => { setMovie(m); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="daily-pick-banner skeleton-card" style={{ background: 'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
        <div className="daily-pick-content">
          <div className="skeleton-pulse" style={{ height:14, width:140, background:'rgba(255,255,255,0.08)', borderRadius:4, marginBottom:12 }} />
          <div className="skeleton-pulse" style={{ height:36, width:'80%', background:'rgba(255,255,255,0.08)', borderRadius:4, marginBottom:12 }} />
          <div className="skeleton-pulse" style={{ height:14, width:'60%', background:'rgba(255,255,255,0.08)', borderRadius:4 }} />
        </div>
      </div>
    );
  }
  if (!movie) return null;

  const genres = (movie.genres || '').split(', ').filter(Boolean);

  return (
    <div className="daily-pick-banner" onClick={() => onOpen(movie)} role="button" tabIndex={0} aria-label={`Today's AI Pick: ${movie.title}`}>
      {movie.backdrop && <div className="daily-pick-backdrop" style={{ backgroundImage: `url(${movie.backdrop})` }} />}
      <div className="daily-pick-overlay" />
      <div className="daily-pick-content">
        <div className="daily-pick-label">✨ Today's AI Pick</div>
        <h2 className="daily-pick-title">{movie.title}</h2>
        <div className="daily-pick-meta">
          <span className="daily-pick-badge">⭐ {movie.rating}</span>
          {movie.releaseYear && <span className="daily-pick-badge">📅 {movie.releaseYear}</span>}
          <span className={`daily-pick-badge${movie.isTamil ? ' ta' : ''}`}>
            {movie.isTamil ? '🎬 Tamil' : '🎬 ' + (movie.langLabel || 'EN')}
          </span>
          {genres.slice(0,2).map(g => <span key={g} className="daily-pick-badge">{g}</span>)}
        </div>
        <p style={{ fontSize:'0.9rem', color:'rgba(255,255,255,0.65)', marginBottom:20, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {movie.overview}
        </p>
        <div className="daily-pick-actions">
          <button className="btn-glow" onClick={e => { e.stopPropagation(); onOpen(movie); }}>▶ Watch Now</button>
          <button className="btn-ghost" onClick={e => { e.stopPropagation(); onOpen(movie); }}>More Info</button>
        </div>
      </div>
    </div>
  );
}
