import { expect, test } from 'claude-code/testing'

import {
  buildAnswerConvertPrompt,
  buildAnswerEditedPrompt,
  buildConfirmPrompt,
  buildEditedPrompt,
  countInputRows,
  parseConvertedReply,
} from '../hooks/prompts'

const TOOL = 'mcp__pseudocode-panel__show'

const CODE = ['def commit_changes(changed_files):', '    commit(changed_files)'].join('\n')

const EDITED_CODE = ['def commit_changes(changed_files):', '    stop("커밋하지 않는다")'].join('\n')

const PANE = {
  plugin: 'pseudocode-panel',
  component: 'Pane',
  requestId: 'pseudocode-panel',
  surface: 'desktop',
  props: {
    title: '수도코드',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

test('확인 글과 고친 글은 수도코드를 python 코드블록으로 담는다', () => {
  const fenced = ['```python', CODE, '```'].join('\n')

  expect(buildConfirmPrompt(`\n${CODE}\n`)).toBe(
    ['패널의 수도코드를 확인했다. 아래 절차대로 진행해.', '', fenced].join('\n'),
  )
  expect(buildEditedPrompt(CODE).endsWith(fenced)).toBe(true)
  expect(buildEditedPrompt(CODE)).toContain('달라진 곳을 한 줄씩 말한 뒤')
})

test('입력칸의 줄 수는 본문 줄 수에 2줄을 더하고 6줄과 30줄 사이로 맞춘다', () => {
  expect(countInputRows('한 줄')).toBe(6)
  expect(countInputRows(Array(10).fill('줄').join('\n'))).toBe(12)
  expect(countInputRows(Array(50).fill('줄').join('\n'))).toBe(30)
})

test('올라온 수도코드가 없으면 패널에 안내 문구만 보인다', async $ => {
  const pane = await $.ui.mount(PANE)

  expect((await pane.find({ type: 'Text' }))?.text).toBe('아직 올라온 수도코드가 없습니다.')
  await pane.unmount()
})

test('도구로 올린 수도코드가 패널에 뜨고 패널이 열린다', async ($, on) => {
  const openedPanes: string[] = []
  on('ui.open', (_, e) => {
    openedPanes.push(e.id)

    return { value: { isPlaced: true } }
  })

  const ran = await $.tool.call({ tool: TOOL, title: '변경 사항 커밋', pseudocode: `${CODE}\n` })
  const pane = await $.ui.mount(PANE)
  const texts = (await pane.findAll({ type: 'Text' })).map(found => found.text)
  const buttons = (await pane.findAll({ type: 'Button' })).map(found => found.text)

  expect(ran.deny).toBe(undefined)
  expect(openedPanes).toEqual(['pseudocode-panel'])
  expect(texts).toEqual(['변경 사항 커밋', '확인을 기다리는 중입니다.'])
  expect((await pane.find({ type: 'Code' }))?.text).toBe(CODE)
  expect(buttons).toEqual(['이대로 진행', '고치기'])
  await pane.unmount()
})

test('수도코드가 비어 있는 도구 호출은 거절한다', async $ => {
  const ran = await $.tool.call({ tool: TOOL, title: '빈 요청', pseudocode: '  ' })

  expect(ran.deny).toBe('pseudocode가 비어 있다. 수도코드를 넣어 다시 불러라.')
})

test('이대로 진행을 누르면 확인 글을 사용자의 말로 보내고 버튼을 치운다', async ($, on) => {
  const submitted: { text: string; asUser: boolean }[] = []
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('prompt.submit', (_, e) => {
    submitted.push({ text: e.text, asUser: e.origin?.kind === 'plugin' && e.origin.asUser === true })

    return { text: e.text }
  })

  await $.tool.call({ tool: TOOL, title: '변경 사항 커밋', pseudocode: CODE })
  const pane = await $.ui.mount(PANE)
  await pane.press({ key: 'confirm' })

  expect(submitted).toEqual([{ text: buildConfirmPrompt(CODE), asUser: true }])
  expect(await pane.findAll({ type: 'Button' })).toEqual([])
  expect((await pane.findAll({ type: 'Text' })).map(found => found.text)).toContain(
    '이대로 진행하라고 보냈습니다.',
  )
  await pane.unmount()
})

test('고쳐서 보내면 고친 글을 보내고 패널에 고친 수도코드가 남는다', async ($, on) => {
  const submitted: string[] = []
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('prompt.submit', (_, e) => {
    submitted.push(e.text)

    return { text: e.text }
  })

  await $.tool.call({ tool: TOOL, title: '변경 사항 커밋', pseudocode: CODE })
  const pane = await $.ui.mount(PANE)
  await pane.press({ key: 'edit' })
  await pane.input({ key: 'edit-input', text: EDITED_CODE, kind: 'change' })
  await pane.press({ key: 'send-edited' })

  expect(submitted).toEqual([buildEditedPrompt(EDITED_CODE)])
  expect((await pane.find({ type: 'Code' }))?.text).toBe(EDITED_CODE)
  expect((await pane.findAll({ type: 'Text' })).map(found => found.text)).toContain(
    '고친 내용을 보냈습니다.',
  )
  await pane.unmount()
})

test('고치지 않고 보내면 확인 글을 보낸다', async ($, on) => {
  const submitted: string[] = []
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('prompt.submit', (_, e) => {
    submitted.push(e.text)

    return { text: e.text }
  })

  await $.tool.call({ tool: TOOL, title: '변경 사항 커밋', pseudocode: CODE })
  const pane = await $.ui.mount(PANE)
  await pane.press({ key: 'edit' })
  await pane.press({ key: 'send-edited' })

  expect(submitted).toEqual([buildConfirmPrompt(CODE)])
  await pane.unmount()
})

test('고치다가 취소하면 올라온 수도코드로 되돌아간다', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))

  await $.tool.call({ tool: TOOL, title: '변경 사항 커밋', pseudocode: CODE })
  const pane = await $.ui.mount(PANE)
  await pane.press({ key: 'edit' })
  await pane.input({ key: 'edit-input', text: EDITED_CODE, kind: 'change' })
  await pane.press({ key: 'cancel-edit' })

  expect((await pane.find({ type: 'Code' }))?.text).toBe(CODE)
  await pane.press({ key: 'edit' })
  expect((await pane.find({ type: 'Input' }))?.text).toBe(CODE)
  await pane.unmount()
})

const ANSWER = '이 답변은 버튼이 붙을 만큼 충분히 긴 답변이다. '.repeat(4)

const ANSWER_MESSAGE = {
  plugin: 'pseudocode-panel',
  component: 'AssistantMessage',
  surface: 'desktop',
  props: { text: ANSWER, isFirstOfReply: true },
} as const

test('답변을 바꾼 응답에서 제목과 수도코드를 꺼낸다', () => {
  expect(parseConvertedReply(`제목: 커밋\n\n\`\`\`python\n${CODE}\n\`\`\``)).toEqual({ title: '커밋', code: CODE })
  expect(parseConvertedReply(CODE)).toEqual({ title: '', code: CODE })
})

test('짧은 답변에는 버튼을 달지 않는다', async $ => {
  const message = await $.ui.mount({ ...ANSWER_MESSAGE, props: { text: '네.', isFirstOfReply: true } })

  expect(await message.findAll({ type: 'Button' })).toEqual([])
  await message.unmount()
})

test('답변의 버튼을 누르면 대화 맥락으로 바꾼 수도코드가 패널에 뜬다', async ($, on) => {
  const forkPrompts: string[] = []
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('model.fork', (_, e) => {
    forkPrompts.push(e.prompt)

    return { value: { isAnswered: true, text: `제목: 답변 요약\n\n${CODE}`, usage: {} } } as never
  })

  const message = await $.ui.mount(ANSWER_MESSAGE)
  await message.press({ key: 'answer-to-pseudocode' })
  const pane = await $.ui.mount(PANE)
  const buttons = (await pane.findAll({ type: 'Button' })).map(found => found.text)

  expect(forkPrompts).toEqual([buildAnswerConvertPrompt(ANSWER)])
  expect((await pane.find({ type: 'Code' }))?.text).toBe(CODE)
  expect(buttons).toEqual(['고치기'])
  await message.unmount()
  await pane.unmount()
})

test('답변을 바꾼 수도코드를 고쳐서 보내면 답변 수정 글을 보낸다', async ($, on) => {
  const submitted: string[] = []
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('model.fork', () => ({ value: { isAnswered: true, text: CODE, usage: {} } }) as never)
  on('prompt.submit', (_, e) => {
    submitted.push(e.text)

    return { text: e.text }
  })

  const message = await $.ui.mount(ANSWER_MESSAGE)
  await message.press({ key: 'answer-to-pseudocode' })
  const pane = await $.ui.mount(PANE)
  await pane.press({ key: 'edit' })
  await pane.press({ key: 'send-edited' })
  await pane.input({ key: 'edit-input', text: EDITED_CODE, kind: 'change' })
  await pane.press({ key: 'send-edited' })

  expect(submitted).toEqual([buildAnswerEditedPrompt(EDITED_CODE)])
  await message.unmount()
  await pane.unmount()
})

test('입력칸에서 Enter를 누르면 그때의 글을 고친 글로 보낸다', async ($, on) => {
  const submitted: string[] = []
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('prompt.submit', (_, e) => {
    submitted.push(e.text)

    return { text: e.text }
  })

  await $.tool.call({ tool: TOOL, title: '변경 사항 커밋', pseudocode: CODE })
  const pane = await $.ui.mount(PANE)
  await pane.press({ key: 'edit' })
  await pane.input({ key: 'edit-input', text: EDITED_CODE })

  expect(submitted).toEqual([buildEditedPrompt(EDITED_CODE)])
  await pane.unmount()
})
