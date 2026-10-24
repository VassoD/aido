/** Drawn chevron for disclosure rows; rotates when its <details> opens. */
export function Chevron({ className = "" }: { className?: string }): React.ReactElement {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={`size-4 shrink-0 transition-transform duration-200 ease-out group-open:rotate-180 motion-reduce:transition-none ${className}`}
    >
      <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
