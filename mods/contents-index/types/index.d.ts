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

/** 응답이 나온 턴 하나의 정보 */
export type TurnInfo = {
  /** 턴을 시작한 사용자 메시지의 첫 줄 (메시지 없이 시작한 턴은 빈 문자열) */
  question: string
  /** 턴에 걸린 시간 (끝나지 않은 턴은 null) */
  durationMs: number | null
  toolCount: number
  /** 오류로 끝난 도구 호출 수 */
  errorCount: number
  /** 턴에서 고친 파일의 절대 경로 */
  editedFiles: string[]
}

/** 응답 하나의 목차 */
export type ReplyToc = {
  entries: TocEntry[]
  /** 응답이 나온 턴의 정보 (기록하지 못한 응답은 null) */
  turn: TurnInfo | null
  /** 응답이 나온 턴이 지금 돌고 있는지 여부 */
  isRunning: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'contents-index': {
      replyTocs: Shaped<ReplyToc[]>
      isPaneClosed: boolean
      /** 목차를 거르는 말 (거르지 않으면 빈 문자열) */
      filterText: string
      /** 턴의 정보 (키는 턴의 id) */
      turnInfos: Shaped<Record<string, TurnInfo>>
      /** 답변 조각이 나온 턴의 id (키는 조각의 requestId) */
      blockTurnIds: Shaped<Record<string, string>>
    }
  }
}
