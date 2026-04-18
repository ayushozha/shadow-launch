type SpinnerProps = {
  className?: string;
  size?: number;
};

export default function Spinner({ className, size = 16 }: SpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ animation: "spinner-rotate 1s linear infinite" }}
      role="status"
      aria-label="Loading"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="2"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <style>{`@keyframes spinner-rotate { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
