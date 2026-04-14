import React from 'react';
import { MovieCard } from './MovieCard';
import { SkeletonGrid } from './SkeletonGrid';

export function MovieGrid({ movies = [], mood, userData, onOpen, loading = false }) {
  if (loading) return <SkeletonGrid count={12} />;
  if (!movies.length) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.4)' }}>
      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎬</div>
      <p>No movies found. Try adjusting your filters or mood.</p>
    </div>
  );
  return (
    <div className="movie-grid">
      {movies.map((m, i) => (
        <MovieCard key={m.id || i} movie={m} mood={mood} userData={userData} onOpen={onOpen} index={i} />
      ))}
    </div>
  );
}
