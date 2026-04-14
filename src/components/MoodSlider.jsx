import React, { useState } from 'react';
import { MOOD_EMOJI, MOODS_LIST } from '../services/moods';

const ENERGY_MAP = [
  { max: 15, mood: 'sad',      label: 'Very Low Energy',   emoji: '😢' },
  { max: 30, mood: 'stressed', label: 'Low Energy',        emoji: '😤' },
  { max: 50, mood: 'bored',    label: 'Medium Energy',     emoji: '😑' },
  { max: 65, mood: 'neutral',  label: 'Balanced',          emoji: '😐' },
  { max: 80, mood: 'happy',    label: 'High Energy',       emoji: '😄' },
  { max: 92, mood: 'excited',  label: 'Very High Energy',  emoji: '🤩' },
  { max: 100, mood: 'excited', label: 'Max Energy!',       emoji: '🚀' },
];

export function MoodSlider({ onMoodChange }) {
  const [value, setValue] = useState(50);

  const entry = ENERGY_MAP.find(e => value <= e.max) || ENERGY_MAP[ENERGY_MAP.length - 1];

  function handleChange(e) {
    const v = parseInt(e.target.value);
    setValue(v);
    onMoodChange && onMoodChange(entry.mood, v);
  }

  return (
    <div className="mood-slider-wrap">
      <div className="slider-label-row">
        <span>😴 Low Energy</span>
        <span>Energy Level: <strong style={{ color: 'var(--mood-primary)' }}>{value}%</strong></span>
        <span>High Energy 🚀</span>
      </div>
      <input
        type="range"
        className="energy-slider"
        min={0} max={100} step={1}
        value={value}
        onChange={handleChange}
        aria-label="Energy level slider"
      />
      <div className="slider-mood-display">
        <span className="big-emoji">{entry.emoji}</span>
        &nbsp; {entry.label} — <strong style={{ color: 'var(--mood-primary)' }}>{entry.mood}</strong>
      </div>
    </div>
  );
}
