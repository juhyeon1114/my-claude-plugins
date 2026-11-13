const CODE_FENCE = '```'
const MIN_INPUT_ROWS = 6
const MAX_INPUT_ROWS = 30
/** 입력칸에서 줄을 더 쓸 수 있게 본문 아래에 남기는 빈 줄 수 */
const SPARE_INPUT_ROWS = 2
const TITLE_PREFIX = '제목:'

/** 수도코드를 쓰는 규칙 (도구 설명과 답변 변환이 함께 쓴다) */
export const WRITING_RULES = [
  '- Python 문법을 빌려 쓴다. 요청은 def 하나로 쓰고, docstring 첫 줄에 목적을, `지킬 것:` 목록에 내내 지킬 조건을 적는다.',
  '- 본문에는 무엇을 받아, 무엇을 살피고, 어떤 결과를 내놓는지를 순서대로 쓴다. 분기와 반복이 없는 요청은 if와 for 없이 순서만 쓴다.',
  '- 범위, 분량, 어조, 형식처럼 사용자가 말한 조건은 코드로 바꾸지 않고 `지킬 것:`에 사용자의 말에 가깝게 적는다.',
  '- 정의가 없는 함수는 이름의 뜻대로 수행하는 동작이다. 이름은 영어 snake_case로, docstring과 주석은 사용자의 언어로 쓴다.',
  '- 줄 하나에 동작 하나만 쓴다.',
  '- 사용자가 말하지 않은 분기나 기본값을 지어내지 않는다. 사용자가 정해야 하는 곳은 `ask_user("질문")`으로 쓴다.',
  '- pseudocode:syntax 스킬이 있으면 그 문법을 따른다.',
]

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

/** 답변 하나를 수도코드로 바꿔 달라고 모델에게 보내는 글을 만든다 */
export function buildAnswerConvertPrompt(answer: string): string {
  return [
    '도구 없이 바로 답한다. 아래는 네가 이 대화에서 쓴 답변의 한 부분이다.',
    '이 답변이 말하는 내용을 수도코드로 표현해라. 답변에 들어 있지 않은 내용은 더하지 않는다.',
    '',
    '쓰는 법',
    ...WRITING_RULES,
    '',
    '출력 형식',
    `- 첫 줄에 \`${TITLE_PREFIX} \`로 시작하는 한 줄 제목을 쓴다.`,
    '- 빈 줄 하나 뒤에 수도코드 본문만 쓴다. 코드블록 표시와 설명은 쓰지 않는다.',
    '',
    '답변',
    answer.trim(),
  ].join('\n')
}

/** 답변을 바꾼 모델의 응답에서 제목과 수도코드를 꺼낸다 */
export function parseConvertedReply(reply: string): { title: string; code: string } {
  const lines = reply
    .trim()
    .split('\n')
    .filter(line => !line.trim().startsWith(CODE_FENCE))
  const firstLine = lines[0]?.trim() ?? ''
  if (!firstLine.startsWith(TITLE_PREFIX)) return { title: '', code: lines.join('\n').trim() }

  return {
    title: firstLine.slice(TITLE_PREFIX.length).trim(),
    code: lines.slice(1).join('\n').trim(),
  }
}

/** 답변을 바꾼 수도코드를 고쳤을 때 Claude에게 보내는 글을 만든다 */
export function buildAnswerEditedPrompt(code: string): string {
  return [
    '네 답변을 수도코드로 바꿔 보고 내가 고쳤다. 고친 수도코드가 내가 원하는 내용이다.',
    '네 답변과 달라진 곳을 한 줄씩 말한 뒤, 고친 내용에 맞춰 다시 답하거나 진행해.',
    '',
    fence(code),
  ].join('\n')
}

/** 수도코드를 고치는 입력칸의 줄 수를 정한다 */
export function countInputRows(code: string): number {
  const rows = code.split('\n').length + SPARE_INPUT_ROWS

  return Math.min(Math.max(rows, MIN_INPUT_ROWS), MAX_INPUT_ROWS)
}
