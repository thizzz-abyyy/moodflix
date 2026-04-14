import React, { useState, useRef, useEffect } from 'react';
import { getMoodBoostScore } from '../services/personalization';
import { fetchTrailer } from '../services/tmdb';
import { loadUserData, saveUserData } from '../services/personalization';

const LANG_COLOR = { ta: 'ta', en: 'en', hi: 'hi' };

export function MovieCard({ movie, mood, userData, onOpen, style = {}, index = 0, showWatchBtn = true }) {
  const cardRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  const [trailerKey, setTrailerKey] = useState(null);
  const hoverTimeout = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isFav, setIsFav] = useState(false);

  if (!movie) {
    return (
      <div className="movie-card skeleton-card" style={{ ...style, minWidth: style.minWidth }}>
        <div className="card-poster">
          <div className="skeleton-pulse" style={{ position:'absolute', inset:0, background:'rgba(255,255,255,0.05)' }} />
        </div>
        <div className="card-info">
          <div className="skeleton-pulse" style={{ height:'18px', width:'75%', background:'rgba(255,255,255,0.05)', borderRadius:'4px', marginBottom:'8px' }} />
          <div className="skeleton-pulse" style={{ height:'13px', width:'50%', background:'rgba(255,255,255,0.05)', borderRadius:'4px' }} />
        </div>
      </div>
    );
  }

  useEffect(() => {
    const favs = (userData?.favorites || []);
    setIsFav(favs.some(f => f.id === movie.id));
  }, [userData, movie.id]);

  const boost = mood ? getMoodBoostScore(movie, mood, userData) : null;
  const watched = (userData?.watchedIds || []).includes(movie.id);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || window.innerWidth <= 768) return;
    const move = e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) scale(1.04)`;
      card.style.transition = 'transform 0.08s ease';
    };
    const leave = () => {
      card.style.transform = 'perspective(900px) rotateY(0) rotateX(0) scale(1)';
      card.style.transition = 'transform 0.5s ease';
    };
    card.addEventListener('mousemove', move);
    card.addEventListener('mouseleave', leave);
    return () => { card.removeEventListener('mousemove', move); card.removeEventListener('mouseleave', leave); };
  }, []);

  const handleMouseEnter = () => {
    if (window.innerWidth <= 768) return;
    setHovered(true);
    if (!trailerKey) {
      hoverTimeout.current = setTimeout(async () => {
        try {
          const key = await fetchTrailer(movie.id);
          if (key) setTrailerKey(key);
        } catch (e) {}
      }, 900);
    }
  };

  const handleMouseLeave = () => {
    setHovered(false);
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
  };

  function toggleFav(e) {
    e.stopPropagation();
    const d = loadUserData();
    const already = d.favorites.some(f => f.id === movie.id);
    if (already) { d.favorites = d.favorites.filter(f => f.id !== movie.id); }
    else { d.favorites = [{ id: movie.id, title: movie.title, poster: movie.poster, ts: Date.now() }, ...d.favorites]; }
    saveUserData(d);
    setIsFav(!already);
  }

  const langClass = LANG_COLOR[movie.language] || 'default';

  return (
    <div
      ref={cardRef}
      className="movie-card"
      style={{
        ...style,
        scrollSnapAlign: 'start',
        animationDelay: `${index * 0.05}s`,
      }}
      onClick={() => onOpen(movie)}
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onOpen(movie); }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      aria-label={`View ${movie.title}`}
    >
      <div className="card-poster">
        {/* Skeleton while loading */}
        {!imageLoaded && movie.poster && (
          <div className="skeleton-pulse" style={{ position:'absolute', inset:0, background:'rgba(255,255,255,0.06)' }} />
        )}

        {movie.poster ? (
          <img
            className={`card-img${imageLoaded ? ' loaded' : ''}`}
            src={movie.poster}
            alt={movie.title}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
          />
        ) : (
          <div className="card-no-poster">🎬</div>
        )}

        {/* Hover Trailer Preview */}
        {hovered && trailerKey && (
          <div className="card-trailer-preview">
            <iframe
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=${trailerKey}`}
              allow="autoplay; encrypted-media"
              allowFullScreen
              title={`${movie.title} trailer`}
            />
          </div>
        )}

        <div className="card-gradient-overlay" />

        {/* Top badges */}
        <div className="card-overlay-top">
          <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
            <span className={`card-badge card-badge-lang ${langClass}`}>
              {movie.langLabel || movie.language?.toUpperCase()}
            </span>
            {movie.ott && (
              <span className="card-badge card-badge-ott" style={{ background: movie.ott.bg, border: `1px solid ${movie.ott.color}` }}>
                {movie.ott.icon} {movie.ott.name.split(' ')[0]}
              </span>
            )}
          </div>
          <span className="card-badge card-badge-rating">⭐ {movie.rating}</span>
        </div>

        {/* Bottom badges */}
        <div className="card-overlay-bottom">
          {boost !== null && <span className="card-badge card-badge-mood">+{boost}% Mood</span>}
          {watched && <span className="card-badge card-badge-watched">✓ Watched</span>}
        </div>

        {/* Heart / Favorite */}
        <button
          className={`card-heart${isFav ? ' fav' : ''}`}
          onClick={toggleFav}
          aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFav ? '❤️' : '🤍'}
        </button>
      </div>

      <div className="card-info">
        <div className="card-title">{movie.title}</div>
        <div className="card-meta">
          <span className="card-genre">{movie.genres || 'Movie'}</span>
          <span>{movie.releaseYear || ''}</span>
        </div>
        {showWatchBtn && (
          <button className="card-watch-btn" onClick={e => { e.stopPropagation(); onOpen(movie); }}>
            ▶ Watch Now
          </button>
        )}
      </div>
    </div>
  );
}
