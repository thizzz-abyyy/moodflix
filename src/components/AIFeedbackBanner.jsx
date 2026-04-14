import React from 'react';
import { MOOD_EMOJI } from '../services/moods';

const FEEDBACK_MESSAGES = {
  happy:    { icon:'😄', text: "You're feeling happy! Here are some feel-good films to keep those good vibes going!" },
  sad:      { icon:'💙', text: "Sending you virtual hugs. Let these emotional films help you process your feelings." },
  stressed: { icon:'💆', text: "You seem stressed. Let me suggest some light, relaxing movies to help you unwind." },
  bored:    { icon:'🎯', text: "Feeling bored? Let's fix that! Here are some gripping thrillers and adventures." },
  romantic: { icon:'🥰', text: "In the mood for love? These romantic picks are guaranteed to warm your heart." },
  anxious:  { icon:'🌸', text: "Feeling anxious? These calming, feel-good films will help ease your mind." },
  angry:    { icon:'💥', text: "Let off some steam with these action-packed blockbusters!" },
  excited:  { icon:'🚀', text: "You're pumped up! Here are high-energy films that match your vibe!" },
  neutral:  { icon:'🎬', text: "Discovering your perfect movie. Here's a curated mix just for you." },
};

export function AIFeedbackBanner({ mood, confidence, scores = [] }) {
  if (!mood) return null;
  const fb = FEEDBACK_MESSAGES[mood] || FEEDBACK_MESSAGES.neutral;

  return (
    <div className="ai-feedback-banner" role="status" aria-live="polite">
      <span className="ai-feedback-icon">{fb.icon}</span>
      <div style={{ flex: 1 }}>
        <div className="ai-feedback-text">
          <span className="ai-feedback-mood">{MOOD_EMOJI[mood]} {mood.charAt(0).toUpperCase() + mood.slice(1)} mode</span>
          {confidence ? <span style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.82rem', marginLeft:8 }}>({confidence}% confidence)</span> : null}
          <br/>
          {fb.text}
        </div>
        {scores.length > 0 && (
          <div className="confidence-items" style={{ marginTop: 8 }}>
            {scores.map((s, i) => (
              <span key={s.mood} className={`conf-item${i === 0 ? ' top' : ''}`}>
                {MOOD_EMOJI[s.mood] || '•'} {s.mood} {s.pct}%
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
