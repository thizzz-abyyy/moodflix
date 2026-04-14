import React, { useState } from 'react';
import { MOOD_EMOJI, MOOD_GENRES } from '../services/moods';
import { internalFetch, normalizeMovie } from '../services/tmdb';

export function GroupModal({ onClose, onOpen, toast }) {
  const [memberMoods, setMemberMoods] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const members = [
    { idx: 0, avatar: '🧑', name: 'Person 1' },
    { idx: 1, avatar: '👩', name: 'Person 2' },
    { idx: 2, avatar: '🧒', name: 'Person 3' },
  ];
  const moodPills = ['happy', 'sad', 'stressed', 'bored', 'romantic', 'excited'].map(m => ({ m, e: MOOD_EMOJI[m] }));

  async function find() {
    const selected = Object.values(memberMoods);
    if (!selected.length) { toast('Pick moods for at least one person!', 'warning'); return; }
    setLoading(true); setResult(null);
    try {
      // Merge genre scores
      const genreScores = {};
      selected.forEach(mood => {
        (MOOD_GENRES[mood] || []).forEach((g, i) => { genreScores[g] = (genreScores[g] || 0) + (5 - i); });
      });
      const topG = Object.entries(genreScores).sort((a, b) => b[1] - a[1])[0]?.[0];
      const data = await internalFetch('/api/recommendations', { genreIds: topG, rating: 7 });
      const movie = data.results?.[Math.floor(Math.random() * Math.min(5, data.results.length))];
      setResult(movie ? normalizeMovie(movie) : null);
    } catch (e) { toast('Could not load movies', 'error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="group-modal glass-deep">
        <button className="modal-close" onClick={onClose} style={{ position: 'absolute', top: 16, right: 16 }}>✕</button>
        <h2 className="gradient-text">👥 Group Mood Mode</h2>
        <p>Everyone picks a mood — AI finds the perfect movie for all of you!</p>
        <div className="group-members">
          {members.map(({ idx, avatar, name }) => (
            <div key={idx} className="group-member">
              <span className="member-avatar">{avatar}</span>
              <span className="member-name">{name}</span>
              <div className="member-chips">
                {moodPills.map(({ m, e }) => (
                  <button key={m} className={`member-chip${memberMoods[idx] === m ? ' selected' : ''}`} onClick={() => setMemberMoods(prev => ({ ...prev, [idx]: m }))}>{e}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button className="btn-glow" onClick={find} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
          {loading ? '🔄 Finding...' : 'Find Our Movie 🎬'}
        </button>
        {result && (
          <div className="group-result" style={{ marginTop: 24, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            {result.poster && <img src={result.poster} alt={result.title} style={{ width: 100, borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,.5)' }} />}
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ marginBottom: 8 }}>{result.title}</h3>
              <p style={{ fontSize: '.85rem', color: 'rgba(255,255,255,.5)', marginBottom: 8 }}>⭐ {result.rating} · {result.genres}</p>
              <p style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.45)', lineHeight: 1.6, maxWidth: 220 }}>{result.overview?.slice(0, 120)}...</p>
              <button className="btn-glow" style={{ marginTop: 16, padding: '10px 20px', fontSize: '.85rem' }} onClick={() => { onClose(); onOpen(result); }}>View Details</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
