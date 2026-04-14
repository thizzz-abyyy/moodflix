import React from 'react';

export function VoiceWaveform({ active }) {
  if (!active) return null;
  return (
    <div className="voice-waveform" aria-label="Listening...">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="wave-bar" />
      ))}
    </div>
  );
}
