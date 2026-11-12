import type { Heading } from '../types'

const CODE_FENCE = /^\s*(```|~~~)/
const HEADING_MARKS = /^#{1,6}(?=\s)/
const INLINE_MARKS = /[*`]/g
const MAX_FIRST_LINE_LENGTH = 40

/** 마크다운 본문에서 코드 블록 밖의 줄을 순서대로 뽑는다 */
function linesOutsideCodeBlocks(markdown: string): string[] {
  const lines: string[] = []
  let isInCodeBlock = false

  for (const line of markdown.split('\n')) {
    if (CODE_FENCE.test(line)) {
      isInCodeBlock = !isInCodeBlock
      continue
    }
    if (!isInCodeBlock) lines.push(line)
  }

  return lines
}

/** 굵게, 기울임, 코드 표시를 뺀 글자만 남긴다 */
function withoutInlineMarks(text: string): string {
  return text.replace(INLINE_MARKS, '').trim()
}

/** 글자 수가 한도를 넘으면 한도까지만 남기고 말줄임표를 붙인다 */
function shorten(text: string): string {
  const characters = [...text]
  if (characters.length <= MAX_FIRST_LINE_LENGTH) return text

  return `${characters.slice(0, MAX_FIRST_LINE_LENGTH).join('')}…`
}

/** 마크다운 본문에서 코드 블록 밖의 제목 줄을 순서대로 뽑는다 */
export function parseHeadings(markdown: string): Heading[] {
  const headings: Heading[] = []

  for (const line of linesOutsideCodeBlocks(markdown)) {
    const marks = HEADING_MARKS.exec(line)?.[0]
    if (!marks) continue

    const title = withoutInlineMarks(line.slice(marks.length))
    if (title) headings.push({ level: marks.length, title })
  }

  return headings
}

/** 코드 블록 밖의 첫 줄을 한도 길이로 줄여서 뽑는다 (글자가 있는 줄이 없으면 null) */
export function parseFirstLine(markdown: string): string | null {
  const firstLine = linesOutsideCodeBlocks(markdown)
    .map(withoutInlineMarks)
    .find(line => line !== '')

  return firstLine ? shorten(firstLine) : null
}
