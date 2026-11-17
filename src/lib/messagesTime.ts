/** Compact list timestamps matching the floating panel mock (12m, Yesterday, Tue). */
export function compactRelativeTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const start = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  const dayDiff = Math.round((start(now) - start(date)) / 86_400_000)
  const mins = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000))

  if (dayDiff === 0) {
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m`
    return `${Math.floor(mins / 60)}h`
  }
  if (dayDiff === 1) return 'Yesterday'
  if (dayDiff < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function dayLabel(iso: string): string {
  const date = new Date(iso)
  const start = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  const diff = Math.round((start(new Date()) - start(date)) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
