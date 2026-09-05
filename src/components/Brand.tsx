function ZhiYueIslandMark() {
  return (
    <svg
      className="brand-symbol"
      viewBox="0 0 72 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
      aria-hidden="true"
    >
      <path
        className="brand-symbol-halo"
        d="M8.5 47.5C16.2 44.1 23.8 44.6 33.6 51.3C43.2 44.8 51.7 44.3 62.8 47.2C60.2 38.5 61.2 28.1 58.2 18.1C49.2 17.8 41.5 22.3 35.2 29.7C30.9 24.2 25.7 20.7 19.8 21.5C16.5 29.2 13.3 37.5 8.5 47.5Z"
      />

      <path
        className="brand-symbol-page"
        d="M8.5 47.5C17.4 43.5 25 44.7 33.6 51.3L34.5 31.3C30.2 25.6 25.5 21.5 19.8 21.5C16.5 29.2 13.3 37.5 8.5 47.5Z"
      />
      <path
        className="brand-symbol-island-left"
        d="M13.3 43.9C17.8 40.2 20.1 35.2 21.6 29.8C26 29.1 30.4 32.1 34.2 36.9L33.6 51.3C25.9 46.2 19.4 43.9 13.3 43.9Z"
      />
      <path
        className="brand-symbol-slope"
        d="M33.6 51.3C42.4 45.4 51 44.4 62.8 47.2C60.2 38.5 61.2 28.1 58.2 18.1C48.8 18.3 40.5 23.4 34.5 31.3L33.6 51.3Z"
      />

      <path
        className="brand-symbol-river"
        d="M37.7 27.7C34.3 33.2 37.6 36.2 34.3 41.3C32.7 43.9 33.7 47.8 33.6 51.3"
      />
      <path className="brand-symbol-spine" d="M33.6 51.3C33.8 54.2 33.6 56.1 33.1 58" />

      <path className="brand-symbol-spark" d="M49 7.5L52.2 12.1L48.3 16.1L45.1 11.6L49 7.5Z" />
      <circle className="brand-symbol-dot" cx="59.3" cy="10.8" r="1.8" />
    </svg>
  )
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`brand brand-v2${compact ? ' brand-v2-compact' : ''}`}
      role="img"
      aria-label="知越岛 AI 学习系统"
    >
      <span className="brand-mark" aria-hidden="true">
        <ZhiYueIslandMark />
      </span>

      {!compact && (
        <span className="brand-wordmark" aria-hidden="true">
          <strong className="brand-name">知越岛</strong>
          <small>AI LEARNING LAB</small>
        </span>
      )}
    </span>
  )
}
