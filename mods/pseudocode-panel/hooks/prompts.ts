const CODE_FENCE = '```'
const MIN_INPUT_ROWS = 6
const MAX_INPUT_ROWS = 30
/** 입력칸에서 줄을 더 쓸 수 있게 본문 아래에 남기는 빈 줄 수 */
const SPARE_INPUT_ROWS = 2

/** 수도코드를 python 코드블록으로 감싼다 */
function fence(code: string): string {
  return [`${CODE_FENCE}python`, code.trim(), CODE_FENCE].join('\n')
}

/** 수도코드를 그대로 확인했을 때 Claude에게 보내는 글을 만든다 */
export function buildConfirmPrompt(code: string): string {
  return ['패널의 수도코드를 확인했다. 아래 절차대로 진행해.', '', fence(code)].join('\n')
}

/** 수도코드를 고쳤을 때 Claude에게 보내는 글을 만든다 */
export function buildEditedPrompt(code: string): string {
  return [
    '패널의 수도코드를 고쳤다. 고친 절차를 다시 읽고, 처음 올린 것과 달라진 곳을 한 줄씩 말한 뒤 고친 절차대로 진행해.',
    '',
    fence(code),
  ].join('\n')
}

/** 수도코드를 고치는 입력칸의 줄 수를 정한다 */
export function countInputRows(code: string): number {
  const rows = code.split('\n').length + SPARE_INPUT_ROWS

  return Math.min(Math.max(rows, MIN_INPUT_ROWS), MAX_INPUT_ROWS)
}
