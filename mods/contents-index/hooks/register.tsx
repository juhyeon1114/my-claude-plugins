import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Heading, ReplyToc } from '../types'
import { formatElapsed, MINUTE_MS } from './elapsed'
import { parseFirstLine, parseHeadings } from './headings'

const PANE = 'contents-index'
const PANE_TITLE = '목차'
const TOGGLE_BUTTON = 'toggle-toc'
const INDENT_PER_LEVEL = 2
const TOC_TEXT_SIZE = 'caption'
const REPLY_BORDER_STYLE = 'round'
/** 응답 상자 테두리에 쓰는 반투명 회색 */
const REPLY_BORDER_COLOR = '#80808040'
const REPLY_GAP = 'sm'
const SAVE_DELAY_MS = 50
const SCROLL_DENIED_TOAST = '이 화면에서는 목차 항목의 위치로 이동할 수 없습니다.'

const replyTocs = atom(
  { plugin: 'contents-index', key: 'replyTocs' } as const,
  [],
  { shape: 'reply-tocs-2' },
)

const isPaneClosed = atom(
  { plugin: 'contents-index', key: 'isPaneClosed' } as const,
  false,
)

const blockSeenAt = atom(
  { plugin: 'contents-index', key: 'blockSeenAt' } as const,
  {},
  { shape: 'block-seen-at-2' },
)

const now = atom({ plugin: 'contents-index', key: 'now' } as const, 0)

/** 그려진 답변 조각 하나에서 뽑은 내용 */
type Block = {
  /** 조각의 id (시간 순으로 사전순이 커진다) */
  requestId: string
  headings: Heading[]
  firstLine: string
  /** 응답을 여는 조각인지 여부 */
  isFirstOfReply: boolean
}

/** 글자가 있는 답변 조각 (키는 조각의 requestId) */
const blocks = new Map<string, Block>()

/** 그려진 답변 조각의 id 가운데 대화 순서로 가장 뒤인 것 (그려진 조각이 없으면 null) */
let latestRequestId: string | null = null

/** 턴이 도는 동안 대화의 맨 뒤에 새로 나왔고 아직 시각을 기록하지 않은 답변 조각의 id */
const unstampedBlocks = new Set<string>()

/** 메인 대화의 턴이 돌고 있는지 여부 */
let isTurnRunning = false

/** 마지막으로 저장한 목차 목록의 JSON */
let savedReplyTocsJson = JSON.stringify([])

let isSaveScheduled = false

/** 답변 조각을 대화 순서로 늘어놓고 응답 단위로 묶는다 */
function groupBlocksByReply(): Block[][] {
  const blocksInOrder = [...blocks.values()].sort((a, b) =>
    a.requestId < b.requestId ? -1 : 1,
  )
  const replies: Block[][] = []

  for (const block of blocksInOrder) {
    const currentReply = replies.at(-1)

    if (currentReply && !block.isFirstOfReply) {
      currentReply.push(block)
    } else {
      replies.push([block])
    }
  }

  return replies
}

/** 응답의 조각 가운데 가장 늦게 기록된 시각을 고른다 (기록된 조각이 없으면 null) */
function latestSeenAt(reply: Block[], seenAt: Record<string, number>): number | null {
  const recordedTimes = reply.flatMap(block => seenAt[block.requestId] ?? [])

  return recordedTimes.length > 0 ? Math.max(...recordedTimes) : null
}

/** 응답 하나의 목차를 만든다 (제목이 없는 응답은 마지막 조각의 첫 줄이 항목 하나가 된다) */
function toReplyToc(reply: Block[], seenAt: Record<string, number>): ReplyToc {
  const answeredAt = latestSeenAt(reply, seenAt)
  const headingEntries = reply.flatMap(block =>
    block.headings.map(heading => ({ ...heading, requestId: block.requestId })),
  )
  if (headingEntries.length > 0) return { entries: headingEntries, answeredAt }

  const lastBlock = reply[reply.length - 1]!

  return {
    entries: [{ level: 1, title: lastBlock.firstLine, requestId: lastBlock.requestId }],
    answeredAt,
  }
}

/** 모든 응답의 목차를 가장 최근 응답부터 늘어놓는다 */
function pickReplyTocs(seenAt: Record<string, number>): ReplyToc[] {
  return groupBlocksByReply()
    .reverse()
    .map(reply => toReplyToc(reply, seenAt))
}

/** 아직 시각을 기록하지 않은 새 답변 조각에 지금 시각을 기록한다 */
async function stampNewBlocks($: EngineInterface): Promise<void> {
  if (unstampedBlocks.size === 0) return

  const stampedAt = await $.clock.now()
  const newlySeenAt = Object.fromEntries(
    [...unstampedBlocks].map(requestId => [requestId, stampedAt]),
  )
  unstampedBlocks.clear()

  await update($, blockSeenAt, seenAt => ({ ...seenAt, ...newlySeenAt }))
  await update($, now, () => stampedAt)
}

/** 새 조각의 시각을 기록한 뒤, 고른 목차가 저장된 것과 다르면 저장한다 */
async function saveReplyTocs($: EngineInterface): Promise<void> {
  await stampNewBlocks($)

  const picked = pickReplyTocs(await read($, blockSeenAt))
  const pickedJson = JSON.stringify(picked)
  if (pickedJson === savedReplyTocsJson) return

  savedReplyTocsJson = pickedJson
  await update($, replyTocs, () => picked)
}

/** 잠시 뒤 목차를 저장한다 (기다리는 동안의 요청은 한 번으로 합친다) */
function scheduleSave($: EngineInterface): void {
  if (isSaveScheduled) return
  isSaveScheduled = true

  $.clock.after(SAVE_DELAY_MS, () => {
    isSaveScheduled = false
    void saveReplyTocs($)
  })
}

/** 지금 시각을 저장해, 경과 시간을 그리는 패널이 다시 그려지게 한다 */
async function refreshNow($: EngineInterface): Promise<void> {
  const currentTime = await $.clock.now()
  await update($, now, () => currentTime)
}

/** 목차 패널이 그려져 있으면 닫고 아니면 연다 */
async function togglePane($: EngineInterface): Promise<void> {
  const panes = await $.ui.panes()
  const isDrawn = panes.some(pane => pane.id === PANE && pane.isPlaced)

  if (isDrawn) {
    await $.ui.close({ id: PANE })
    await update($, isPaneClosed, () => true)

    return
  }

  await $.ui.open({ id: PANE, title: PANE_TITLE })
  await update($, isPaneClosed, () => false)
}

/** 답변 조각을 화면으로 끌어오고, 거절되면 알림을 띄운다 */
async function scrollToBlock($: EngineInterface, requestId: string): Promise<void> {
  const moved = await $.ui.scroll({ to: { requestId }, block: 'start' })
  if (moved.deny) $.ui.toast(SCROLL_DENIED_TOAST)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const isClosed = await read($, isPaneClosed)
    if (!isClosed) void $.ui.open({ id: PANE, title: PANE_TITLE })

    void refreshNow($)
    $.clock.every(MINUTE_MS, () => void refreshNow($))

    return next(e)
  })

  on('turn.start', ($, e, next) => {
    if (e.agentId === undefined) isTurnRunning = true

    return next(e)
  })

  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined) isTurnRunning = false

    return next(e)
  })

  on('ui.close', { id: PANE }, async ($, e, next) => {
    const closed = await next(e)
    await update($, isPaneClosed, () => true)

    return closed
  })

  on('ui.render', { component: 'AssistantMessage' }, ($, e, next) => {
    const { text, isFirstOfReply } = e.props
    const firstLine = parseFirstLine(text)

    if (firstLine === null) {
      blocks.delete(e.requestId)
    } else {
      const isAfterEveryKnownBlock =
        latestRequestId !== null && e.requestId > latestRequestId
      if (isTurnRunning && isAfterEveryKnownBlock) unstampedBlocks.add(e.requestId)
      if (latestRequestId === null || isAfterEveryKnownBlock) latestRequestId = e.requestId

      blocks.set(e.requestId, {
        requestId: e.requestId,
        headings: parseHeadings(text),
        firstLine,
        isFirstOfReply,
      })
    }

    scheduleSave($)

    return next(e)
  })

  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const { Box, Button } = $.ui.resolve(e)
    const isClosed = await read($, isPaneClosed)
    const engineModes = await next(e)

    return (
      <Box gap={1}>
        <Button
          key={TOGGLE_BUTTON}
          plain
          dimColor={isClosed}
          label="목차"
          onPress={() => togglePane($)}
        />
        {engineModes}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const shown = await read($, replyTocs)
    const currentTime = await read($, now)

    if (shown.length === 0) {
      return <Text dimColor>아직 답변이 없습니다.</Text>
    }

    return (
      <Box flexDirection="column" gap={REPLY_GAP}>
        {shown.map((reply, replyIndex) => {
          const topLevel = Math.min(...reply.entries.map(entry => entry.level))
          const elapsed =
            reply.answeredAt === null ? null : formatElapsed(reply.answeredAt, currentTime)

          return (
            <Box
              key={`reply:${replyIndex}`}
              flexDirection="column"
              borderStyle={REPLY_BORDER_STYLE}
              borderColor={REPLY_BORDER_COLOR}
              paddingX={1}
              overflow="hidden"
            >
              {reply.entries.map((entry, entryIndex) => (
                <Box gap={1} paddingLeft={(entry.level - topLevel) * INDENT_PER_LEVEL}>
                  {entryIndex === 0 && elapsed !== null && (
                    <Box flexShrink={0}>
                      <Text dimColor size={TOC_TEXT_SIZE} wrap="truncate">
                        {elapsed}
                      </Text>
                    </Box>
                  )}
                  <Box flexShrink={1} minWidth={0} overflow="hidden">
                    <Button
                      key={`entry:${replyIndex}:${entryIndex}`}
                      plain
                      onPress={() => scrollToBlock($, entry.requestId)}
                    >
                      <Text size={TOC_TEXT_SIZE} wrap="truncate-end">
                        {entry.title}
                      </Text>
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>
          )
        })}
      </Box>
    )
  })
}
