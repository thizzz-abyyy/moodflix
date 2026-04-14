import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchMoviesByMood } from '../services/tmdb';
import { loadUserData, saveUserData } from '../services/personalization';

export function SwipeModal({ mood, userData, onClose, toast }) {
  const [movies, setMovies] = useState([]);
  const [idx, setIdx] = useState(0);
  const [likedMovies, setLikedMovies] = useState([]);
  const [swipeDir, setSwipeDir] = useState(null);
  const stackRef = useRef(null);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0 });

  useEffect(() => {
    fetchMoviesByMood(mood || 'bored').then(setMovies).catch(() => { });
  }, [mood]);

  const current = movies[idx];
  const next = movies[idx + 1];

  function doSwipe(liked) {
    if (!current) return;
    setSwipeDir(liked ? 'right' : 'left');
    if (liked) {
      setLikedMovies(prev => [...prev, current]);
      const d = loadUserData(); d.genreAffinity = d.genreAffinity || {};
      (current.genreIds || []).forEach(g => { d.genreAffinity[g] = (d.genreAffinity[g] || 0) + 2; });
      saveUserData(d);
    }
    setTimeout(() => { setIdx(i => i + 1); setSwipeDir(null); }, 380);
  }

  const attachDrag = useCallback((el, movie) => {
    if (!el) return;
    let sx = 0, sy = 0;
    const onDown = e => {
      sx = e.touches ? e.touches[0].clientX : e.clientX;
      sy = e.touches ? e.touches[0].clientY : e.clientY;
      dragRef.current.dragging = true;
      el.style.transition = 'none';
    };
    const onMove = e => {
      if (!dragRef.current.dragging) return;
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const dx = cx - sx, dy = (e.touches ? e.touches[0].clientY : e.clientY) - sy;
      el.style.transform = `translateX(${dx}px) translateY(${dy * .3}px) rotate(${dx * .08}deg)`;
      const likeEl = el.querySelector('.like-indicator'), skipEl = el.querySelector('.skip-indicator');
      if (dx > 40 && likeEl) { likeEl.style.opacity = Math.min((dx - 40) / 80, 1); if (skipEl) skipEl.style.opacity = 0; }
      else if (dx < -40 && skipEl) { skipEl.style.opacity = Math.min((-dx - 40) / 80, 1); if (likeEl) likeEl.style.opacity = 0; }
      else { if (likeEl) likeEl.style.opacity = 0; if (skipEl) skipEl.style.opacity = 0; }
    };
    const onUp = e => {
      if (!dragRef.current.dragging) return;
      dragRef.current.dragging = false;
      const cx = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      const dx = cx - sx;
      if (dx > 100) doSwipe(true);
      else if (dx < -100) doSwipe(false);
      else { el.style.transition = 'transform .4s cubic-bezier(.34,1.56,.64,1)'; el.style.transform = 'translateX(0) rotate(0)'; const l = el.querySelector('.like-indicator'), s = el.querySelector('.skip-indicator'); if (l) l.style.opacity = 0; if (s) s.style.opacity = 0; }
    };
    el.addEventListener('mousedown', onDown); el.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('mousemove', onMove); window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('mouseup', onUp); window.addEventListener('touchend', onUp);
    return () => { el.removeEventListener('mousedown', onDown); el.removeEventListener('touchstart', onDown); window.removeEventListener('mousemove', onMove); window.removeEventListener('touchmove', onMove); window.removeEventListener('mouseup', onUp); window.removeEventListener('touchend', onUp); };
  }, [idx, movies]);

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="swipe-modal glass-deep">
        <button className="modal-close" onClick={onClose} style={{ position: 'absolute', top: 16, right: 16 }}>✕</button>
        <h2 className="gradient-text">🎴 Swipe to Discover</h2>
        <p>Swipe right to like → Swipe left to skip</p>
        <div className="swipe-stack" ref={stackRef}>
          {!movies.length && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,.4)' }}>Loading...</div>}
          {next && (
            <div className="swipe-card" style={{ transform: 'scale(.95) translateY(16px)', zIndex: 1, pointerEvents: 'none' }}>
              {next.poster ? <img src={next.poster} alt={next.title} /> : <div style={{ width: '100%', height: '100%', background: 'rgba(168,85,247,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem' }}>🎬</div>}
              <div className="swipe-card-overlay"><div className="swipe-card-title">{next.title}</div></div>
            </div>
          )}
          {current && (
            <div key={idx} ref={el => attachDrag(el, current)} className={`swipe-card${swipeDir === 'right' ? ' swipe-going-right' : swipeDir === 'left' ? ' swipe-going-left' : ''}`} style={{ zIndex: 2 }}>
              {current.poster ? <img src={current.poster} alt={current.title} draggable={false} /> : <div style={{ width: '100%', height: '100%', background: 'rgba(168,85,247,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem' }}>🎬</div>}
              <div className="like-indicator">LIKE</div>
              <div className="skip-indicator">SKIP</div>
              <div className="swipe-card-overlay">
                <div className="swipe-card-title">{current.title}</div>
                <div className="swipe-card-meta">⭐ {current.rating} · {current.genres}</div>
              </div>
            </div>
          )}
          {!current && movies.length > 0 && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', color: 'rgba(255,255,255,.4)', gap: 12 }}><span style={{ fontSize: '3rem' }}>🎬</span><p>No more movies!</p></div>}
        </div>
        <div className="swipe-actions">
          <button className="swipe-btn skip" onClick={() => doSwipe(false)}>✕ Skip</button>
          <button className="swipe-btn like" onClick={() => doSwipe(true)}>❤ Like</button>
        </div>
        {likedMovies.length > 0 && (
          <div className="liked-section">
            <h3>Liked Movies ({likedMovies.length})</h3>
            <div className="liked-thumbs">
              {likedMovies.map(m => m.poster ? <img key={m.id} className="liked-thumb" src={m.poster} alt={m.title} title={m.title} /> : null)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
