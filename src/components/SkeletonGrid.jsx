import React from 'react';

export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="movie-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="movie-card skeleton-card">
          <div className="card-poster">
            <div className="skeleton-pulse" style={{ position:'absolute', inset:0, background:'rgba(255,255,255,0.05)' }} />
          </div>
          <div className="card-info">
            <div className="skeleton-pulse" style={{ height:16, width:'75%', background:'rgba(255,255,255,0.05)', borderRadius:4, marginBottom:8 }} />
            <div className="skeleton-pulse" style={{ height:12, width:'50%', background:'rgba(255,255,255,0.05)', borderRadius:4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
