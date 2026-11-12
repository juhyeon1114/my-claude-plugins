/** 세션에 포함된 폴더의 절대 경로 목록 */
export type Folders = string[]

/** 폴더를 여는 데 쓸 수 있는 IDE의 식별자 */
export type IdeId = 'intellij' | 'vscode'

declare module 'claude-code' {
  interface PluginState {
    'open-in-ide': {
      folders: Folders
      /** 폴더 버튼을 눌렀을 때 여는 IDE */
      ide: IdeId
      /** 선택 상자에서 폴더를 고른 횟수 (고를 때마다 선택 상자를 처음 상태로 되돌리는 데 쓴다) */
      selectPickCount: number
    }
  }
}
