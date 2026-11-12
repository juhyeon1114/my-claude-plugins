/** 답변 본문의 제목 한 줄 */
export type Heading = {
  /** `#` 개수 (1 이 가장 큰 제목) */
  level: number
  title: string
}

/** 목차 항목 하나 */
export type TocEntry = Heading & {
  /** 항목을 눌렀을 때 이동할 답변 조각의 id */
  requestId: string
}

/** 응답 하나의 목차 */
export type ReplyToc = {
  entries: TocEntry[]
  /** 응답이 그려진 시각 (기록하지 못한 응답은 null) */
  answeredAt: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'contents-index': {
      replyTocs: Shaped<ReplyToc[]>
      isPaneClosed: boolean
      /** 답변 조각이 처음 그려진 시각 (키는 조각의 requestId) */
      blockSeenAt: Shaped<Record<string, number>>
      /** 경과 시간을 계산할 때 기준으로 삼는 시각 */
      now: number
    }
  }
}
