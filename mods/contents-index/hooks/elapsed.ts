export const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

/** 두 시각 사이에 흐른 시간을 "3분 전" 같은 문구로 만든다 */
export function formatElapsed(fromMs: number, nowMs: number): string {
  const elapsedMs = Math.max(0, nowMs - fromMs)

  if (elapsedMs < MINUTE_MS) return '방금'
  if (elapsedMs < HOUR_MS) return `${Math.floor(elapsedMs / MINUTE_MS)}분 전`
  if (elapsedMs < DAY_MS) return `${Math.floor(elapsedMs / HOUR_MS)}시간 전`

  return `${Math.floor(elapsedMs / DAY_MS)}일 전`
}
