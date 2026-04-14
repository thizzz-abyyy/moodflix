import React, { useRef } from 'react';
import { MovieCard } from './MovieCard';

export function Carousel({ movies = [], mood, userData, onOpen, cardWidth = 220 }) {
  const trackRef = useRef(null);

  function scroll(dir) {
    if (!trackRef.current) return;
    const amount = (cardWidth + 18) * 3;
    trackRef.current.scrollBy({ left: dir * amount, behavior: 'smooth' });
  }

  if (!movies.length) return null;

  return (
    <div className="movie-carousel">
      <div className="carousel-track" ref={trackRef}>
        {movies.map((m, i) => (
          <MovieCard
            key={m.id || i}
            movie={m}
            mood={mood}
            userData={userData}
            onOpen={onOpen}
            index={i}
            style={{ flex: `0 0 ${cardWidth}px`, minWidth: `${cardWidth}px` }}
          />
        ))}
      </div>
      <div className="carousel-arrows" style={{ position:'absolute', top:'-44px', right:0 }}>
        <button className="carousel-arrow" onClick={() => scroll(-1)} aria-label="Scroll left">‹</button>
        <button className="carousel-arrow" onClick={() => scroll(1)} aria-label="Scroll right">›</button>
      </div>
    </div>
  );
}
