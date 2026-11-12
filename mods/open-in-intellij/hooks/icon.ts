/** 버튼 앞에 붙이는 아이콘의 한 변 길이 (CSS 픽셀) */
export const ICON_SIZE = 16

/** 주황, 분홍, 파랑 도형 세 개를 겹친 아이콘의 SVG 문서 */
export const ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="warm" x1="0.3" y1="0" x2="0.5" y2="1">
      <stop offset="0" stop-color="#FF8A00"/>
      <stop offset="0.55" stop-color="#FE2857"/>
      <stop offset="1" stop-color="#FE2857"/>
    </linearGradient>
    <linearGradient id="cool" x1="0.85" y1="0.1" x2="0.2" y2="0.95">
      <stop offset="0" stop-color="#087CFA"/>
      <stop offset="0.45" stop-color="#087CFA"/>
      <stop offset="0.8" stop-color="#FE2857"/>
      <stop offset="1" stop-color="#FE2857"/>
    </linearGradient>
  </defs>
  <rect x="300" y="300" width="166" height="166" rx="32" fill="#FF8A00"/>
  <path fill="url(#warm)" d="M35 45H125Q160 45 168 80L250 512H80Q48 512 43 480L0 85Q0 45 35 45Z"/>
  <path fill="url(#cool)" d="M215 0H470Q512 0 512 42V305Q512 328 492 341L245 506Q232 514 215 512H70L170 40Q178 0 215 0Z"/>
</svg>
`.trim()
