/** 세션에 포함된 폴더의 절대 경로 목록 */
export type Folders = string[]

declare module 'claude-code' {
  interface PluginState {
    'open-in-intellij': { folders: Folders }
  }
}
