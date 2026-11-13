/** 세션에 포함된 폴더의 절대 경로 목록 */
export type Folders = string[]

/** 폴더를 여는 데 쓸 수 있는 앱의 식별자 */
export type AppId = 'intellij' | 'vscode' | 'terminal'

declare module 'claude-code' {
  interface PluginState {
    'open-in-anything-mac': {
      folders: Folders
      /** 폴더 버튼을 눌렀을 때 폴더를 여는 앱 */
      app: AppId
      /** 선택 상자에서 폴더를 고른 횟수 (고를 때마다 선택 상자를 처음 상태로 되돌리는 데 쓴다) */
      selectPickCount: number
    }
  }
}
