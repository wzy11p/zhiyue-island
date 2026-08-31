interface ProgressRingProps {
  value: number
  size?: number
  stroke?: number
  label?: string
}

export function ProgressRing({ value, size = 84, stroke = 8, label }: ProgressRingProps) {
  const safeValue = Math.max(0, Math.min(100, value))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="progress-ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
        <circle
          className="progress-ring-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - safeValue / 100)}
        />
      </svg>
      <span><strong>{safeValue}%</strong>{label && <small>{label}</small>}</span>
    </div>
  )
}
