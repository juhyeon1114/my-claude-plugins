/** 패널에 올라온 수도코드의 처리 상태 */
export type DraftStatus = 'waiting' | 'confirmed' | 'edited'

/** 수도코드가 무엇을 바꾼 것인지 (request는 Claude가 요청을 이해한 것, answer는 답변을 바꾼 것) */
export type DraftSource = 'request' | 'answer'

/** 패널에 올라온 수도코드 하나 */
export type Draft = {
  /** 요청이나 답변을 한 줄로 줄인 말 */
  title: string
  /** 수도코드 본문 (사용자가 고쳐서 보낸 뒤에는 고친 본문) */
  code: string
  status: DraftStatus
  source: DraftSource
}

declare module 'claude-code' {
  interface McpToolInputs {
    'mcp__pseudocode-panel__show': {
      /** 요청을 한 줄로 줄인 말 */
      title: string
      pseudocode: string
    }
  }

  interface PluginState {
    'pseudocode-panel': {
      /** 패널에 올라온 수도코드 (올라온 것이 없으면 null) */
      draft: Shaped<Draft | null>
      isEditing: boolean
      /** 입력칸에서 고치고 있는 수도코드 */
      editText: string
      isPaneClosed: boolean
      isConverting: boolean
    }
  }
}
