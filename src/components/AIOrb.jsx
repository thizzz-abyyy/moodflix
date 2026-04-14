import React from 'react';

export function AIOrb({ onClick }) {
  return (
    <button
      className="ai-orb"
      onClick={onClick}
      title="MoodBot — Click to chat"
      aria-label="Open MoodBot AI chat"
      id="ai-orb-btn"
    >
      <div className="orb-ping" />
      🤖
    </button>
  );
}
