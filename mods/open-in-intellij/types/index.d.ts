/** 세션에 포함된 폴더의 절대 경로 목록 */
export type Folders = string[]

declare module 'claude-code' {
  interface PluginState {
    'open-in-intellij': {
      folders: Folders
      /** 선택 상자에서 폴더를 고른 횟수 (고를 때마다 선택 상자를 처음 상태로 되돌리는 데 쓴다) */
      selectPickCount: number
    }
  }
}
