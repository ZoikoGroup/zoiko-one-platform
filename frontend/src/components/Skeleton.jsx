import React from 'react';

/**
 * Skeleton shimmer loader.
 * Props:
 *  - className: Tailwind utility classes controlling size/shape (e.g. "h-6 w-24 rounded-lg")
 *  - count: number of repeated skeleton lines (default 1)
 *  - gap: Tailwind gap class when count > 1 (default "gap-2")
 */
export default function Skeleton({ className = "h-4 w-full rounded", count = 1, gap = "gap-2" }) {
  if (count === 1) {
    return (
      <div
        role="status"
        aria-label="Loading…"
        className={`animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] ${className}`}
        style={{ animation: "shimmer 1.4s ease-in-out infinite" }}
      />
    );
  }
  return (
    <div className={`flex flex-col ${gap}`} role="status" aria-label="Loading…">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] ${className}`}
          style={{ animation: `shimmer 1.4s ease-in-out ${i * 0.1}s infinite` }}
        />
      ))}
    </div>
  );
}
