import React from 'react';
import { MovieCard } from '../components/MovieCard';
import { loadUserData, saveUserData } from '../services/personalization';

export function FavoritesPage({ userData, onOpenMovie, onUpdateUserData }) {
  const favorites = userData?.favorites || [];

  function removeFav(movieId) {
    const d = loadUserData();
    d.favorites = d.favorites.filter(f => f.id !== movieId);
    saveUserData(d);
    onUpdateUserData(d);
  }

  if (favorites.length === 0) {
    return (
      <div className="page">
        <div className="recs-header">
          <h1 className="gradient-text" style={{ fontSize:'clamp(1.8rem,4vw,3rem)', fontWeight:900 }}>❤️ Saved Films</h1>
          <p className="recs-subtitle">Your personal watchlist</p>
        </div>
        <div className="favorites-empty">
          <div className="favorites-empty-icon">🎬</div>
          <p className="favorites-empty-text">No saved movies yet! Tap the ❤️ on any movie to save it here.</p>
          <button className="btn-glow" onClick={() => window.history.back()}>Browse Movies</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="recs-header">
        <div className="recs-title-row">
          <h1 className="gradient-text" style={{ fontSize:'clamp(1.8rem,4vw,3rem)', fontWeight:900 }}>❤️ Saved Films</h1>
          <span className="mood-badge">{favorites.length} films</span>
        </div>
        <p className="recs-subtitle">Your personal watchlist — curated by you</p>
      </div>

      <div className="movie-grid">
        {favorites.map((fav, i) => (
          <div key={fav.id} style={{ position:'relative' }}>
            <MovieCard
              movie={fav}
              mood={null}
              userData={userData}
              onOpen={onOpenMovie}
              index={i}
            />
            <button
              onClick={() => removeFav(fav.id)}
              style={{
                position:'absolute', top:8, right:8, zIndex:20,
                padding:'5px 10px', borderRadius:'var(--r-full)',
                background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.4)',
                color:'#ef4444', fontSize:'0.78rem', cursor:'pointer',
                transition:'all 0.2s', backdropFilter:'blur(8px)'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.35)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
              aria-label={`Remove ${fav.title} from favorites`}
            >
              ✕ Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
