export function toLocalDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function isYesterday(dateKey: string, today = new Date()): boolean {
  return dateKey === toLocalDateKey(addDays(today, -1))
}

export function getRecentDays(count: number): Array<{ key: string; label: string; shortDate: string }> {
  const formatter = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' })
  const result = []

  for (let index = count - 1; index >= 0; index -= 1) {
    const date = addDays(new Date(), -index)
    result.push({
      key: toLocalDateKey(date),
      label: index === 0 ? '今天' : formatter.format(date).replace('周', ''),
      shortDate: `${date.getMonth() + 1}/${date.getDate()}`,
    })
  }

  return result
}

export function formatRelativeReview(isoDate: string): string {
  const target = new Date(isoDate)
  const now = new Date()
  const diff = target.getTime() - now.getTime()

  if (diff <= 0) return '现在可复习'
  const hours = Math.ceil(diff / 3_600_000)
  if (hours < 24) return `${hours} 小时后复习`
  return `${Math.ceil(hours / 24)} 天后复习`
}
