/** 걸린 시간을 "42초", "3분 5초" 같은 문구로 만든다 */
export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return minutes === 0 ? `${seconds}초` : `${minutes}분 ${seconds}초`
}
