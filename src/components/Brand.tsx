import { Check } from 'lucide-react'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="知跃 AI 产品学习系统">
      <span className="brand-mark" aria-hidden="true">
        <Check size={19} strokeWidth={3.2} />
      </span>
      {!compact && (
        <span className="brand-wordmark">
          知跃 <small>AI PM LAB</small>
        </span>
      )}
    </div>
  )
}
