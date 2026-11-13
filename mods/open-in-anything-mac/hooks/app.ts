import type { AppId } from '../types'

/** 폴더 버튼을 눌렀을 때 폴더를 여는 곳 하나 (IDE, 터미널, GitHub) */
export type App = {
  id: AppId
  /** 화면에 보이는 이름 (`github` 가 아니면 `open -a` 에 넘기는 macOS 앱 이름이기도 하다) */
  name: string
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

/** 어두운 상자 안에 연두색 프롬프트 꺾쇠와 밑줄을 그린 아이콘 */
const TERMINAL_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
  <rect width="320" height="320" rx="56" fill="#2D2D2D"/>
  <g fill="none" stroke="#00FF41" stroke-width="26" stroke-linejoin="round" stroke-linecap="round">
    <path d="M72 100L144 160L72 220"/>
    <path d="M170 224H250"/>
  </g>
</svg>
`.trim()

/** 흰 상자 안에 GitHub 로고를 그린 아이콘 */
const GITHUB_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <rect width="240" height="240" rx="42" fill="#FFFFFF"/>
  <g transform="translate(24 216) scale(0.08 -0.08)" fill="#24292F">
    <path d="M970 2301 c-305 -68 -555 -237 -727 -493 -301 -451 -241 -1056 143 -1442 115 -116 290 -228 422 -271 49 -16 55 -16 77 -1 24 16 25 20 25 135 l0 118 -88 -5 c-103 -5 -183 13 -231 54 -17 14 -50 62 -73 106 -38 74 -66 108 -144 177 -26 23 -27 24 -9 37 43 32 130 1 185 -65 96 -117 133 -148 188 -160 49 -10 94 -6 162 14 9 3 21 24 27 48 6 23 22 58 35 77 l24 35 -81 16 c-170 35 -275 96 -344 200 -64 96 -85 179 -86 334 0 146 16 206 79 288 28 36 31 47 23 68 -15 36 -11 188 5 234 13 34 20 40 47 43 45 5 129 -24 214 -72 l73 -42 64 15 c91 21 364 20 446 0 l62 -16 58 35 c77 46 175 82 224 82 39 0 39 -1 55 -52 17 -59 20 -166 5 -217 -8 -30 -6 -39 16 -68 109 -144 121 -383 29 -579 -62 -129 -193 -219 -369 -252 l-84 -16 31 -55 32 -56 3 -223 4 -223 25 -16 c23 -15 28 -15 76 2 80 27 217 101 292 158 446 334 590 933 343 1431 -145 293 -419 518 -733 602 -137 36 -395 44 -525 15z"/>
  </g>
</svg>
`.trim()

const INTELLIJ: App = {
  id: 'intellij',
  name: 'IntelliJ IDEA',
  shortName: 'IJ',
  icon: INTELLIJ_ICON,
}

const VSCODE: App = {
  id: 'vscode',
  name: 'Visual Studio Code',
  shortName: 'VS',
  icon: VSCODE_ICON,
}

const TERMINAL: App = {
  id: 'terminal',
  name: 'Terminal',
  shortName: 'Term',
  icon: TERMINAL_ICON,
}

const GITHUB: App = {
  id: 'github',
  name: 'GitHub',
  shortName: 'GH',
  icon: GITHUB_ICON,
}

/** 전환 버튼을 누를 때마다 넘어가는 순서대로 둔 목록 */
const APPS: App[] = [INTELLIJ, VSCODE, TERMINAL, GITHUB]

export const DEFAULT_APP_ID: AppId = 'intellij'

export const findApp = (id: AppId): App =>
  APPS.find(app => app.id === id) ?? INTELLIJ

/** 전환 버튼을 눌렀을 때 지금 앱 대신 쓰게 되는 앱 */
export const nextApp = (id: AppId): App => {
  const nextIndex = (APPS.findIndex(app => app.id === id) + 1) % APPS.length

  return APPS[nextIndex] ?? INTELLIJ
}

export const isAppId = (value: unknown): value is AppId =>
  APPS.some(app => app.id === value)
