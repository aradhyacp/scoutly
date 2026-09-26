// web/src/components/scoutly/logo.tsx
/**
 * Three nested contour rings with a survey point — the same topographic idea
 * as the hero's lines, small enough to sit beside the wordmark.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <path
        d="M16 2.5c7.9 0 13.5 5.3 13.5 12.6 0 8-6.4 14.4-14.2 14.4C7.8 29.5 2.5 23.9 2.5 16.4 2.5 8.4 8.3 2.5 16 2.5Z"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <path
        d="M16.4 8c4.6 0 8 3.2 8 7.6 0 4.7-3.8 8.5-8.4 8.5-4.4 0-7.7-3.3-7.7-7.8C8.3 11.6 11.8 8 16.4 8Z"
        stroke="currentColor"
        strokeOpacity="0.65"
        strokeWidth="1.5"
      />
      <circle cx="16.3" cy="16" r="3" fill="currentColor" />
    </svg>
  );
}
