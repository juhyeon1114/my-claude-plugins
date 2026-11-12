import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Heading, ReplyToc, TocEntry, TurnInfo } from '../types'
import { formatDuration } from './duration'
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
const FILTER_INPUT = 'filter'
const FILTER_PLACEHOLDER = '질문 또는 제목'
/** `<task-notification>` 처럼 태그 하나로만 된 줄 */
const TAG_ONLY_LINE = /^<[a-z-]+>$/
const SAVE_DELAY_MS = 50
/** 턴 정보에 이름을 그대로 보여주는 고친 파일의 최대 개수 */
const MAX_SHOWN_EDITED_FILES = 3
const FILE_EDIT_TOOLS = ['Edit', 'Write']
const SCROLL_DENIED_TOAST = '이 화면에서는 목차 항목의 위치로 이동할 수 없습니다.'

const replyTocs = atom(
  { plugin: 'contents-index', key: 'replyTocs' } as const,
  [],
  { shape: 'reply-tocs-5' },
)

const isPaneClosed = atom(
  { plugin: 'contents-index', key: 'isPaneClosed' } as const,
  false,
)

const filterText = atom({ plugin: 'contents-index', key: 'filterText' } as const, '')

const turnInfos = atom({ plugin: 'contents-index', key: 'turnInfos' } as const, {}, {
  shape: 'turn-infos-2',
})

const blockTurnIds = atom(
  { plugin: 'contents-index', key: 'blockTurnIds' } as const,
  {},
  { shape: 'block-turn-ids-1' },
)

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

/** 지금 돌고 있는 메인 대화의 턴 하나 */
type RunningTurn = { turnId: string; info: TurnInfo }

/** 지금 돌고 있는 메인 대화의 턴 (돌고 있지 않으면 null) */
let runningTurn: RunningTurn | null = null

/** 턴이 도는 동안 대화의 맨 뒤에 새로 나왔고 아직 저장하지 않은 답변 조각의 턴 id (키는 조각의 requestId) */
const unsavedBlockTurnIds = new Map<string, string>()

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

/** 목차를 만들 때 응답에 붙이는 기록 */
type BlockRecords = {
  /** 답변 조각이 나온 턴의 id (키는 조각의 requestId) */
  turnIds: Record<string, string>
  /** 턴의 정보 (키는 턴의 id) */
  infos: Record<string, TurnInfo>
}

/** 응답의 조각 가운데 턴이 기록된 첫 조각의 턴 id를 찾는다 (기록된 조각이 없으면 null) */
function findTurnId(reply: Block[], turnIds: Record<string, string>): string | null {
  return reply.flatMap(block => turnIds[block.requestId] ?? [])[0] ?? null
}

/** 응답 하나의 목차 항목을 만든다 (제목이 없는 응답은 마지막 조각의 첫 줄이 항목 하나가 된다) */
function toTocEntries(reply: Block[]): TocEntry[] {
  const headingEntries = reply.flatMap(block =>
    block.headings.map(heading => ({ ...heading, requestId: block.requestId })),
  )
  if (headingEntries.length > 0) return headingEntries

  const lastBlock = reply[reply.length - 1]!

  return [{ level: 1, title: lastBlock.firstLine, requestId: lastBlock.requestId }]
}

/** 응답 하나의 목차를 만든다 */
function toReplyToc(reply: Block[], records: BlockRecords): ReplyToc {
  const turnId = findTurnId(reply, records.turnIds)

  return {
    entries: toTocEntries(reply),
    turn: turnId === null ? null : (records.infos[turnId] ?? null),
    isRunning: turnId !== null && turnId === runningTurn?.turnId,
  }
}

/** 모든 응답의 목차를 가장 최근 응답부터 늘어놓는다 */
function pickReplyTocs(records: BlockRecords): ReplyToc[] {
  return groupBlocksByReply()
    .reverse()
    .map(reply => toReplyToc(reply, records))
}

/** 응답의 질문이나 제목에 거르는 말이 들어 있는지 확인한다 (거르는 말이 비어 있으면 참) */
function matchesFilter(reply: ReplyToc, filter: string): boolean {
  const word = filter.trim().toLowerCase()
  const texts = [reply.turn?.question ?? '', ...reply.entries.map(entry => entry.title)]

  return texts.some(text => text.toLowerCase().includes(word))
}

/** 아직 저장하지 않은 새 답변 조각의 턴 id를 저장한다 */
async function saveNewBlockTurnIds($: EngineInterface): Promise<void> {
  if (unsavedBlockTurnIds.size === 0) return

  const newTurnIds = Object.fromEntries(unsavedBlockTurnIds)
  unsavedBlockTurnIds.clear()

  await update($, blockTurnIds, turnIds => ({ ...turnIds, ...newTurnIds }))
}

/** 새 조각의 턴 id를 저장한 뒤, 고른 목차가 저장된 것과 다르면 저장한다 */
async function saveReplyTocs($: EngineInterface): Promise<void> {
  await saveNewBlockTurnIds($)

  const picked = pickReplyTocs({
    turnIds: await read($, blockTurnIds),
    infos: await read($, turnInfos),
  })
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

/** 돌고 있는 턴의 정보를 저장하고, 목차에 반영되게 한다 */
async function saveRunningTurn($: EngineInterface, turn: RunningTurn): Promise<void> {
  await update($, turnInfos, infos => ({ ...infos, [turn.turnId]: turn.info }))
  scheduleSave($)
}

/** 턴의 질문에서 글자가 있는 첫 줄을 고른다 (없거나, 태그로 시작하는 알림이면 빈 문자열) */
function firstQuestionLine(text: string): string {
  const firstLine = text.split('\n').map(line => line.trim()).find(line => line !== '') ?? ''

  return TAG_ONLY_LINE.test(firstLine) ? '' : firstLine
}

/** 턴의 진행 상태나 걸린 시간, 도구 호출 수, 오류 수, 고친 파일 수를 한 줄로 만든다 (보여줄 것이 없으면 빈 문자열) */
function summarizeTurn(turn: TurnInfo, isRunning: boolean): string {
  const elapsed = turn.durationMs === null ? [] : formatDuration(turn.durationMs)
  const parts = [
    isRunning ? '진행 중' : elapsed,
    turn.toolCount === 0 ? [] : `도구 ${turn.toolCount}회`,
    turn.errorCount === 0 ? [] : `오류 ${turn.errorCount}회`,
    turn.editedFiles.length === 0 ? [] : `파일 ${turn.editedFiles.length}개 수정`,
  ]

  return parts.flat().join(', ')
}

/** 고친 파일의 이름을 정해진 개수까지 늘어놓고, 넘는 만큼은 개수로 줄인다 */
function listEditedFiles(paths: string[]): string {
  const names = paths.map(path => path.split('/').pop() ?? path)
  const shown = names.slice(0, MAX_SHOWN_EDITED_FILES).join(', ')
  const hiddenCount = names.length - MAX_SHOWN_EDITED_FILES

  return hiddenCount > 0 ? `${shown} 외 ${hiddenCount}개` : shown
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

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)

    runningTurn = {
      turnId: e.turnId,
      info: {
        question: firstQuestionLine(e.text),
        durationMs: null,
        toolCount: 0,
        errorCount: 0,
        editedFiles: [],
      },
    }
    await saveRunningTurn($, runningTurn)

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    const turn = runningTurn
    if (e.agentId !== undefined || turn === null) return ran

    const hasSucceeded = ran.deny === undefined && ran.isError !== true
    const editedFile =
      hasSucceeded && FILE_EDIT_TOOLS.includes(e.tool) && 'file_path' in e
        ? String(e.file_path)
        : null
    const editedFiles =
      editedFile === null || turn.info.editedFiles.includes(editedFile)
        ? turn.info.editedFiles
        : [...turn.info.editedFiles, editedFile]

    turn.info = {
      ...turn.info,
      toolCount: turn.info.toolCount + 1,
      errorCount: turn.info.errorCount + (ran.isError === true ? 1 : 0),
      editedFiles,
    }
    await saveRunningTurn($, turn)

    return ran
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const turn = runningTurn
    if (e.agentId !== undefined || turn === null) return next(e)

    runningTurn = null
    turn.info = { ...turn.info, durationMs: e.durationMs }
    await saveRunningTurn($, turn)

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
      if (runningTurn !== null && isAfterEveryKnownBlock) {
        unsavedBlockTurnIds.set(e.requestId, runningTurn.turnId)
      }
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
    const { Box, Text, Button, Input } = $.ui.resolve(e)
    const replies = await read($, replyTocs)
    const filter = await read($, filterText)

    if (replies.length === 0) {
      return <Text dimColor>아직 답변이 없습니다.</Text>
    }

    const shown = replies.filter(reply => matchesFilter(reply, filter))
    const saveFilter = (value: string) => void update($, filterText, () => value)

    return (
      <Box flexDirection="column" gap={REPLY_GAP}>
        <Input
          key={FILTER_INPUT}
          placeholder={FILTER_PLACEHOLDER}
          value={filter}
          onInput={saveFilter}
          onSubmit={saveFilter}
        />
        {shown.length === 0 && (
          <Text dimColor size={TOC_TEXT_SIZE}>
            맞는 응답이 없습니다.
          </Text>
        )}
        {shown.map((reply, replyIndex) => {
          const topLevel = Math.min(...reply.entries.map(entry => entry.level))
          const question = reply.turn?.question ?? ''

          return (
            <Box
              key={`reply:${replyIndex}`}
              flexDirection="column"
              borderStyle={REPLY_BORDER_STYLE}
              borderColor={REPLY_BORDER_COLOR}
              paddingX={1}
              overflow="hidden"
            >
              {question !== '' && (
                <Text dimColor size={TOC_TEXT_SIZE} wrap="truncate-end">
                  {question}
                </Text>
              )}
              {reply.entries.map((entry, entryIndex) => (
                <Box gap={1} paddingLeft={(entry.level - topLevel) * INDENT_PER_LEVEL}>
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
              {reply.turn !== null && (
                <Box flexDirection="column" display="none" hover={{ display: 'flex' }}>
                  {[
                    summarizeTurn(reply.turn, reply.isRunning),
                    listEditedFiles(reply.turn.editedFiles),
                  ]
                    .filter(line => line !== '')
                    .map(line => (
                      <Text dimColor size={TOC_TEXT_SIZE} wrap="truncate-end">
                        {line}
                      </Text>
                    ))}
                </Box>
              )}
            </Box>
          )
        })}
      </Box>
    )
  })
}
