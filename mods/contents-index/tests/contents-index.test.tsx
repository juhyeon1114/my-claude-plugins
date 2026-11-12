import type { UiPane } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { formatElapsed } from '../hooks/elapsed'
import { parseFirstLine, parseHeadings } from '../hooks/headings'

const SAVE_DELAY_MS = 50
const MINUTE_MS = 60_000

const ANSWER = {
  plugin: 'contents-index',
  component: 'AssistantMessage',
  surface: 'desktop',
} as const

const PANE = {
  plugin: 'contents-index',
  component: 'Pane',
  requestId: 'contents-index',
  surface: 'desktop',
  props: {
    title: '목차',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

const MODES = {
  plugin: 'contents-index',
  component: 'SessionMode',
  surface: 'desktop',
  props: { modes: [] },
} as const

test('코드 블록 밖의 제목만 단계와 함께 뽑는다', () => {
  const markdown = [
    '# 요약',
    '본문',
    '```bash',
    '# 주석은 제목이 아니다',
    '```',
    '## 1) `BOM` 과 **버전**',
    '#해시태그',
  ].join('\n')

  expect(parseHeadings(markdown)).toEqual([
    { level: 1, title: '요약' },
    { level: 2, title: '1) BOM 과 버전' },
  ])
})

test('코드 블록 밖의 첫 줄을 40자까지 뽑는다', () => {
  const markdown = ['```bash', 'ls', '```', '', '**테스트** 5건이 통과했습니다.', '둘째 줄'].join(
    '\n',
  )

  expect(parseFirstLine(markdown)).toBe('테스트 5건이 통과했습니다.')
  expect(parseFirstLine('가'.repeat(41))).toBe(`${'가'.repeat(40)}…`)
  expect(parseFirstLine('  \n')).toBeNull()
})

test('조각이 그려진 순서와 상관없이 최근 응답부터 응답 단위로 묶어 그린다', async ($, on) => {
  const clock = mock.clock(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

  const latestReply = await $.ui.mount({
    ...ANSWER,
    requestId: 'msg_03-t0',
    props: { text: '제목 없는 최근 응답', isFirstOfReply: true },
  })
  const olderReplyAnswer = await $.ui.mount({
    ...ANSWER,
    requestId: 'msg_02-t0',
    props: { text: '# 예전 응답\n## 세부', isFirstOfReply: false },
  })
  const olderReplyProgress = await $.ui.mount({
    ...ANSWER,
    requestId: 'msg_01-t0',
    props: { text: '확인해 보겠습니다.', isFirstOfReply: true },
  })
  await clock.advance(SAVE_DELAY_MS)
  const pane = await $.ui.mount(PANE)

  const titles = (await pane.findAll({ type: 'Button' })).map(button => button.text)
  expect(titles).toEqual(['제목 없는 최근 응답', '예전 응답', '세부'])
  expect(await pane.find({ type: 'Box', key: 'reply:1' })).toBeDefined()
  expect(await pane.find({ type: 'Box', key: 'reply:2' })).toBeUndefined()

  await pane.unmount()
  await olderReplyProgress.unmount()
  await olderReplyAnswer.unmount()
  await latestReply.unmount()
})

test('제목이 없는 응답은 마지막 조각의 첫 줄을 항목으로 그린다', async ($, on) => {
  const clock = mock.clock(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

  const progress = await $.ui.mount({
    ...ANSWER,
    requestId: 'msg_01-t0',
    props: { text: '확인해 보겠습니다.', isFirstOfReply: true },
  })
  const answer = await $.ui.mount({
    ...ANSWER,
    requestId: 'msg_02-t0',
    props: { text: '네, 됩니다.', isFirstOfReply: false },
  })
  await clock.advance(SAVE_DELAY_MS)
  const pane = await $.ui.mount(PANE)

  const titles = (await pane.findAll({ type: 'Button' })).map(button => button.text)
  expect(titles).toEqual(['네, 됩니다.'])

  await pane.unmount()
  await answer.unmount()
  await progress.unmount()
})

test('응답이 많아도 모두 패널에 그린다', async ($, on) => {
  const clock = mock.clock(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

  const answers = []
  for (let number = 1; number <= 30; number += 1) {
    answers.push(
      await $.ui.mount({
        ...ANSWER,
        requestId: `msg_${String(number).padStart(2, '0')}-t0`,
        props: { text: `${number}번 응답`, isFirstOfReply: true },
      }),
    )
  }
  await clock.advance(SAVE_DELAY_MS)
  const pane = await $.ui.mount(PANE)

  const titles = (await pane.findAll({ type: 'Button' })).map(button => button.text)
  expect(titles.length).toBe(30)
  expect(titles[0]).toBe('30번 응답')
  expect(titles.at(-1)).toBe('1번 응답')

  await pane.unmount()
  for (const answer of answers) await answer.unmount()
})

test('답변이 없으면 패널에 안내 문구를 그린다', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

  const pane = await $.ui.mount(PANE)

  expect((await pane.find({ type: 'Text' }))?.text).toBe('아직 답변이 없습니다.')

  await pane.unmount()
})

test('모드 표시 자리의 목차 버튼은 닫힌 패널을 열고, 열린 패널을 닫는다', async ($, on) => {
  let openPanes: UiPane[] = []
  on('ui.panes', () => ({ value: openPanes }))
  on('ui.open', (_, e) => {
    openPanes = [
      { id: e.id, title: '목차', isShown: true, isFocused: false, isPlaced: true },
    ]

    return { value: { isPlaced: true } }
  })
  on('ui.close', () => {
    openPanes = []

    return { value: undefined }
  })
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine modes</Text>
  })

  const modesWhileClosed = await $.ui.mount(MODES)
  expect((await modesWhileClosed.find({ type: 'Button' }))?.text).toBe('목차')
  expect((await modesWhileClosed.find({ type: 'Text' }))?.text).toBe('engine modes')
  await modesWhileClosed.press({ key: 'toggle-toc' })
  expect(openPanes.map(pane => pane.id)).toEqual(['contents-index'])
  await modesWhileClosed.unmount()

  const modesWhileOpen = await $.ui.mount(MODES)
  await modesWhileOpen.press({ key: 'toggle-toc' })
  expect(openPanes).toEqual([])
  await modesWhileOpen.unmount()
})

test('흐른 시간을 분, 시간, 일 단위 문구로 만든다', () => {
  const answeredAt = 1_000_000

  expect(formatElapsed(answeredAt, answeredAt + 59_000)).toBe('방금')
  expect(formatElapsed(answeredAt, answeredAt + 3 * MINUTE_MS)).toBe('3분 전')
  expect(formatElapsed(answeredAt, answeredAt + 125 * MINUTE_MS)).toBe('2시간 전')
  expect(formatElapsed(answeredAt, answeredAt + 50 * 60 * MINUTE_MS)).toBe('2일 전')
})

test('턴 중에 대화 맨 뒤에 새로 나온 응답에만 경과 시간을 붙이고, 시간이 지나면 문구를 바꾼다', async ($, on) => {
  const clock = mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const replyBeforeTurn = await $.ui.mount({
    ...ANSWER,
    requestId: 'msg_01-t0',
    props: { text: '턴 전에 있던 응답', isFirstOfReply: true },
  })
  await $.turn.start({ text: '질문', turnId: 'turn-1' })
  const replyDuringTurn = await $.ui.mount({
    ...ANSWER,
    requestId: 'msg_02-t0',
    props: { text: '턴 중에 나온 응답', isFirstOfReply: true },
  })
  const olderReplyDrawnLate = await $.ui.mount({
    ...ANSWER,
    requestId: 'msg_00-t0',
    props: { text: '턴 중에 뒤늦게 그려진 예전 응답', isFirstOfReply: true },
  })
  await clock.advance(SAVE_DELAY_MS)

  const paneRightAfter = await $.ui.mount(PANE)
  const elapsedRightAfter = await paneRightAfter.findAll({ type: 'Text', text: /^(방금|.+ 전)$/ })
  expect(elapsedRightAfter.map(elapsed => elapsed.text)).toEqual(['방금'])
  await paneRightAfter.unmount()

  const fourMinutesAfterSessionStart = 4 * MINUTE_MS
  await clock.set(fourMinutesAfterSessionStart)

  const paneLater = await $.ui.mount(PANE)
  const elapsedLater = await paneLater.findAll({ type: 'Text', text: /^(방금|.+ 전)$/ })
  expect(elapsedLater.map(elapsed => elapsed.text)).toEqual(['3분 전'])
  await paneLater.unmount()

  await olderReplyDrawnLate.unmount()
  await replyDuringTurn.unmount()
  await replyBeforeTurn.unmount()
})
