import React, { useState, useEffect } from 'react';
import { MOOD_EMOJI } from '../services/moods';
import { loadUserData } from '../services/personalization';

function getMostFrequent(arr) {
  if (!arr || !arr.length) return null;
  const freq = {};
  arr.forEach(x => { freq[x] = (freq[x] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
}

export function MoodAnalytics({ userData }) {
  const { moodHistory = [], favorites = [], history = [] } = userData || {};

  if (moodHistory.length === 0 && favorites.length === 0) return null;

  const moods = moodHistory.map(m => m.mood).filter(Boolean);
  const topMood = getMostFrequent(moods);
  const moodCounts = moods.reduce((acc, m) => { acc[m] = (acc[m] || 0) + 1; return acc; }, {});
  const topGenres = history.flatMap(h => (h.genres || '').split(', ')).filter(Boolean);
  const topGenre = getMostFrequent(topGenres);

  return (
    <div className="analytics-card glass">
      <div className="analytics-title">
        📊 Your Mood Analytics
      </div>
      <div className="analytics-stats">
        <div className="stat-box">
          <div className="stat-label">Top Mood</div>
          <div className="stat-value">{topMood ? `${MOOD_EMOJI[topMood] || '🎭'} ${topMood}` : '—'}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Sessions</div>
          <div className="stat-value">{moodHistory.length}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Favourites</div>
          <div className="stat-value">❤️ {favorites.length}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Top Genre</div>
          <div className="stat-value">{topGenre || '—'}</div>
        </div>
      </div>

      {moods.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Recent Sessions</div>
          <div className="mood-history-grid">
            {moodHistory.slice(0, 10).map((m, i) => (
              <span key={i} className="mood-hist-chip">
                {MOOD_EMOJI[m.mood] || '🎭'} {m.mood}
              </span>
            ))}
          </div>
        </div>
      )}

      {Object.keys(moodCounts).length > 1 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Mood Breakdown</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {Object.entries(moodCounts).sort((a,b)=>b[1]-a[1]).map(([mood, count]) => (
              <div key={mood} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ width:80, fontSize:'0.82rem', color:'rgba(255,255,255,0.7)' }}>{MOOD_EMOJI[mood]} {mood}</span>
                <div style={{ flex:1, height:6, borderRadius:3, background:'rgba(255,255,255,0.06)', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${(count/moods.length)*100}%`, background:'linear-gradient(90deg,var(--mood-primary),var(--mood-accent))', borderRadius:3, transition:'width 1s' }} />
                </div>
                <span style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.45)', width:24, textAlign:'right' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
