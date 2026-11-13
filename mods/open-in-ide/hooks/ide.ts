import type { IdeId } from '../types'

/** 폴더 버튼을 눌렀을 때 폴더를 여는 앱 하나 (IDE 또는 터미널) */
export type Ide = {
  id: IdeId
  /** `open -a` 에 넘기는 macOS 앱 이름 */
  app: string
  /** 전환 버튼에 쓰는 짧은 이름 */
  shortName: string
  /** 묶음 맨 앞에 그리는 아이콘의 SVG 문서 */
  icon: string
}

/** 묶음 맨 앞 아이콘의 한 변 길이 (CSS 픽셀) */
export const ICON_SIZE = 16

/** 검정 상자 안에 흰색 IJ 글자와 밑줄을 그린 아이콘 */
const INTELLIJ_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
  <rect width="320" height="320" fill="#000000"/>
  <g fill="none" stroke="#FFFFFF" stroke-width="22">
    <path d="M39 50H119M39 148H119M79 50V148"/>
    <path d="M129 50H179M168 50V118Q168 148 138 148H129"/>
  </g>
  <rect x="39" y="254" width="130" height="25" fill="#FFFFFF"/>
</svg>
`.trim()

/** 파란 상자 안에 흰색 꺾쇠와 세로 막대를 그린 아이콘 */
const VSCODE_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
  <rect width="320" height="320" rx="56" fill="#007ACC"/>
  <g fill="none" stroke="#FFFFFF" stroke-width="30" stroke-linejoin="round" stroke-linecap="round">
    <path d="M222 78L92 190L60 164"/>
    <path d="M222 242L92 130L60 156"/>
    <path d="M232 66V254"/>
  </g>
</svg>
`.trim()

/** 어두운 상자 안에 흰색 프롬프트 꺾쇠와 밑줄을 그린 아이콘 */
const TERMINAL_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
  <rect width="320" height="320" rx="56" fill="#2D2D2D"/>
  <g fill="none" stroke="#FFFFFF" stroke-width="26" stroke-linejoin="round" stroke-linecap="round">
    <path d="M72 100L144 160L72 220"/>
    <path d="M170 224H250"/>
  </g>
</svg>
`.trim()

const INTELLIJ: Ide = {
  id: 'intellij',
  app: 'IntelliJ IDEA',
  shortName: 'IJ',
  icon: INTELLIJ_ICON,
}

const VSCODE: Ide = {
  id: 'vscode',
  app: 'Visual Studio Code',
  shortName: 'VS',
  icon: VSCODE_ICON,
}

const TERMINAL: Ide = {
  id: 'terminal',
  app: 'Terminal',
  shortName: 'Term',
  icon: TERMINAL_ICON,
}

/** 전환 버튼을 누를 때마다 넘어가는 순서대로 둔 목록 */
const IDES: Ide[] = [INTELLIJ, VSCODE, TERMINAL]

export const DEFAULT_IDE_ID: IdeId = 'intellij'

export const findIde = (id: IdeId): Ide =>
  IDES.find(ide => ide.id === id) ?? INTELLIJ

/** 전환 버튼을 눌렀을 때 지금 IDE 대신 쓰게 되는 IDE */
export const nextIde = (id: IdeId): Ide => {
  const nextIndex = (IDES.findIndex(ide => ide.id === id) + 1) % IDES.length

  return IDES[nextIndex] ?? INTELLIJ
}

export const isIdeId = (value: unknown): value is IdeId =>
  IDES.some(ide => ide.id === value)
