import React, { useState, useEffect } from 'react';
import { fetchOTT, fetchTrailer, fetchCredits, fetchSimilar, OTT_MAP } from '../services/tmdb';
import { loadUserData, saveUserData, getMoodBoostScore } from '../services/personalization';

const MOOD_REASONS = {
  happy:    m => `Recommended because upbeat and feel-good energy matches your happy mood perfectly.`,
  sad:      m => `This deeply emotional story will help you process your feelings with empathy and beauty.`,
  stressed: m => `A light, engaging watch that helps shift focus away from stress and into entertainment.`,
  bored:    m => `Gripping enough to cure boredom — packed with unexpected twists and riveting storytelling.`,
  romantic: m => `A heartfelt romantic journey that captures the warmth and tenderness you're feeling.`,
  anxious:  m => `Its calming pace and wholesome story will bring a smile and ease your anxious mind.`,
  angry:    m => `Channel your energy into this high-octane film — the perfect release valve.`,
  excited:  m => `An adrenaline-charged adventure that perfectly matches your high energy and excitement.`,
};

export function MovieModal({ movie, mood, userData, onClose, onUpdateUserData, toast }) {
  const [trailer, setTrailer] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [ottList, setOttList] = useState([]);
  const [cast, setCast] = useState([]);
  const [director, setDirector] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loadingOtt, setLoadingOtt] = useState(true);
  const [loadingCast, setLoadingCast] = useState(true);

  const fav = (userData?.favorites || []).some(f => f.id === movie.id);
  const watched = (userData?.watchedIds || []).includes(movie.id);
  const boost = mood ? getMoodBoostScore(movie, mood, userData) : null;
  const reason = mood ? (MOOD_REASONS[mood] ? MOOD_REASONS[mood](movie) : null) : null;

  useEffect(() => {
    // Close on Escape
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    setLoadingOtt(true); setLoadingCast(true);
    Promise.all([
      fetchOTT(movie.id),
      fetchCredits(movie.id),
      fetchSimilar(movie.id),
    ]).then(([otts, credits, sims]) => {
      setOttList((otts || []).map(p => OTT_MAP[p.provider_id]).filter(Boolean).slice(0, 4));
      setCast(credits?.cast || []);
      setDirector(credits?.director || null);
      setSimilar(sims || []);
      setLoadingOtt(false);
      setLoadingCast(false);
    }).catch(() => { setLoadingOtt(false); setLoadingCast(false); });
  }, [movie.id]);

  function toggleFav() {
    const d = loadUserData();
    const already = d.favorites.some(f => f.id === movie.id);
    if (already) { d.favorites = d.favorites.filter(f => f.id !== movie.id); toast?.('Removed from favorites', 'info'); }
    else { d.favorites = [{ id: movie.id, title: movie.title, poster: movie.poster, ts: Date.now() }, ...d.favorites]; toast?.('Saved to favorites! ❤️', 'success'); }
    saveUserData(d); onUpdateUserData(d);
  }

  function markWatched() {
    const d = loadUserData();
    if (!d.watchedIds.includes(movie.id)) {
      d.watchedIds = [...d.watchedIds, movie.id];
      d.history = [{
        id: movie.id, title: movie.title, poster: movie.poster,
        genres: movie.genres, genreIds: movie.genreIds || [], mood, ts: Date.now()
      }, ...d.history].slice(0, 50);
      (movie.genreIds || []).forEach(g => { d.genreAffinity[g] = (d.genreAffinity[g] || 0) + 3; });
      saveUserData(d); onUpdateUserData(d);
      toast?.(`"${movie.title}" marked as watched! ✓`, 'success');
    }
  }

  async function openTrailer() {
    if (trailer) { setShowTrailer(true); return; }
    const key = await fetchTrailer(movie.id);
    if (key) { setTrailer(key); setShowTrailer(true); }
    else toast?.('No trailer available for this film', 'info');
  }

  const genres = (movie.genres || '').split(', ').filter(Boolean);

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="movie-modal glass-deep" role="dialog" aria-modal="true" aria-label={movie.title}>

        {/* Cinematic backdrop */}
        {movie.backdrop && <div className="modal-bg" style={{ backgroundImage: `url(${movie.backdrop})` }} />}
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="modal-body">
          {/* Poster + Fav */}
          <div className="modal-poster">
            {movie.poster
              ? <img src={movie.poster} alt={movie.title} loading="lazy" />
              : <div style={{ width:220, height:330, background:'rgba(255,255,255,0.05)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'4rem' }}>🎬</div>
            }
            <button className={`fav-btn${fav ? ' active' : ''}`} onClick={toggleFav} aria-label={fav ? 'Remove from favorites' : 'Save to favorites'}>
              {fav ? '❤️' : '🤍'}
            </button>
          </div>

          <div className="modal-info">
            {/* Genre + Language Badges */}
            <div className="modal-badges">
              {genres.map(g => <span key={g} className="genre-badge">{g}</span>)}
              {movie.language && (
                <span className={`lang-badge-modal ${movie.language}`}>
                  {movie.isTamil ? '🎬 Tamil' : movie.langLabel || movie.language.toUpperCase()}
                </span>
              )}
            </div>

            {/* Title */}
            <h2 className="modal-title">{movie.title}</h2>

            {/* Meta */}
            <div className="modal-meta">
              <span className="meta-rating">⭐ {movie.rating}</span>
              {movie.releaseYear && <span>📅 {movie.releaseYear}</span>}
              {director && <span>🎬 {director}</span>}
            </div>

            {/* Overview */}
            <p className="modal-overview">{movie.overview || 'No description available.'}</p>

            {/* Cast Row */}
            {!loadingCast && cast.length > 0 && (
              <div className="modal-cast-row">
                <div className="modal-cast-label">Cast</div>
                <div className="cast-list">
                  {cast.slice(0, 6).map(c => (
                    <div key={c.id} className="cast-item" title={c.name}>
                      {c.photo
                        ? <img className="cast-photo" src={c.photo} alt={c.name} loading="lazy" />
                        : <div className="cast-photo-placeholder">👤</div>
                      }
                      <span className="cast-name">{c.name.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OTT */}
            <div className="modal-ott">
              {loadingOtt
                ? <span style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.3)' }}>Loading platforms...</span>
                : ottList.length > 0
                  ? ottList.map(o => (
                      <div key={o.name} className="ott-badge" style={{ background:o.bg, border:`1px solid ${o.color}` }}>
                        {o.icon} {o.name}
                        <span style={{ fontSize:'0.72rem', opacity:0.8, marginLeft:4 }}>Watch →</span>
                      </div>
                    ))
                  : <span style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.3)' }}>Not on major OTT platforms in India</span>
              }
            </div>

            {/* AI Recommendation Reason */}
            {reason && (
              <div className="ai-reason-box">
                <div className="ai-reason-label">🧠 Why this is recommended</div>
                <div className="ai-reason-text">{reason}</div>
              </div>
            )}

            {/* Mood Boost Score */}
            {boost !== null && (
              <div className="mood-boost-box">
                <div className="boost-label">Mood Compatibility Score</div>
                <div className="boost-bar-wrap">
                  <div className="boost-bar"><div className="boost-fill" style={{ width:`${boost}%` }} /></div>
                  <span className="boost-pct">{boost}%</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="modal-actions">
              <button className="btn-glow" onClick={openTrailer}>▶ Watch Trailer</button>
              <button className="btn-ghost" onClick={markWatched}>{watched ? '✓ Watched' : '+ Mark Watched'}</button>
              <button className="btn-ghost" onClick={toggleFav}>{fav ? '❤️ Saved' : '🤍 Save'}</button>
            </div>
          </div>
        </div>

        {/* Similar Movies Row */}
        {similar.length > 0 && (
          <div className="modal-similar">
            <div className="modal-similar-title">🎬 More Like This</div>
            <div className="similar-row">
              {similar.map(m => (
                <div key={m.id} className="similar-card" onClick={() => { onClose(); setTimeout(() => onUpdateUserData && onUpdateUserData(userData), 100); }}>
                  {m.poster
                    ? <img src={m.poster} alt={m.title} loading="lazy" />
                    : <div style={{ width:100, height:140, background:'rgba(255,255,255,0.06)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>🎬</div>
                  }
                  <div className="similar-card-title">{m.title}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Trailer Modal */}
      {showTrailer && trailer && (
        <div className="trailer-wrap" onClick={e => { if (e.target === e.currentTarget) setShowTrailer(false); }}>
          <button className="trailer-close" onClick={() => { setShowTrailer(false); }} aria-label="Close trailer">✕</button>
          <iframe
            className="trailer-iframe"
            src={`https://www.youtube.com/embed/${trailer}?autoplay=1&rel=0&modestbranding=1`}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            title={`${movie.title} Trailer`}
          />
        </div>
      )}
    </div>
  );
}
