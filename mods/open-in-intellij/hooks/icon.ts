/** 버튼 앞에 붙이는 아이콘의 한 변 길이 (CSS 픽셀) */
export const ICON_SIZE = 16

/** 검정 상자 안에 흰색 IJ 글자와 밑줄을 그린 아이콘의 SVG 문서 */
export const ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
  <rect width="320" height="320" fill="#000000"/>
  <g fill="none" stroke="#FFFFFF" stroke-width="22">
    <path d="M39 50H119M39 148H119M79 50V148"/>
    <path d="M129 50H179M168 50V118Q168 148 138 148H129"/>
  </g>
  <rect x="39" y="254" width="130" height="25" fill="#FFFFFF"/>
</svg>
`.trim()
