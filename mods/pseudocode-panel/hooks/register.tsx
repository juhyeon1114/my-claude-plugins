import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Draft, DraftStatus } from '../types'
import { buildConfirmPrompt, buildEditedPrompt, countInputRows } from './prompts'

const PANE = 'pseudocode-panel'
const PANE_TITLE = 'Pseudo'
const TOOL_NAME = 'show'
/** Claude가 부르는 도구의 전체 이름 */
const TOOL = 'mcp__pseudocode-panel__show'
const TOGGLE_BUTTON = 'toggle-pseudocode'
const CONFIRM_BUTTON = 'confirm'
const EDIT_BUTTON = 'edit'
const SEND_BUTTON = 'send-edited'
const CANCEL_BUTTON = 'cancel-edit'
const EDIT_INPUT = 'edit-input'
const CODE_LANGUAGE = 'python'
const SECTION_GAP = 'sm'
const EMPTY_CODE_DENY = 'pseudocode가 비어 있다. 수도코드를 넣어 다시 불러라.'
const EMPTY_EDIT_TOAST = '수도코드가 비어 있어 보내지 않았습니다.'
const POST_FAILED_DENY =
  '수도코드를 패널에 올리지 못했다. 채팅에 수도코드를 보여주고 사용자의 확인을 받아라.'

const TOOL_DESCRIPTION = [
  '사용자의 요청을 수행하기 전에, 이해한 내용을 수도코드로 써서 대화 옆 패널에 올린다. 사용자가 패널에서 확인하거나 고친다.',
  '',
  '부르는 때',
  '- 사용자가 무엇인가를 시켰을 때. 코드 작업뿐 아니라 글쓰기, 조사, 계획, 정리, 의견을 구하는 일처럼 프로그래밍과 관계없는 요청도 여기에 든다.',
  '- 사용자가 수도코드로 보여 달라고 했을 때.',
  '',
  '부르지 않는 때',
  '- 인사, 맞장구, 한두 문장으로 답이 끝나는 질문.',
  '- 이미 확인받은 요청을 진행하는 중에 온 작은 수정.',
  '- 사용자가 패널에서 확인하거나 고친 수도코드를 보낸 뒤. 다시 부르지 않고 그 절차대로 진행한다.',
  '',
  '쓰는 법',
  '- Python 문법을 빌려 쓴다. 요청은 def 하나로 쓰고, docstring 첫 줄에 목적을, `지킬 것:` 목록에 내내 지킬 조건을 적는다.',
  '- 본문에는 무엇을 받아, 무엇을 살피고, 어떤 결과를 내놓는지를 순서대로 쓴다. 분기와 반복이 없는 요청은 if와 for 없이 순서만 쓴다.',
  '- 범위, 분량, 어조, 형식처럼 사용자가 말한 조건은 코드로 바꾸지 않고 `지킬 것:`에 사용자의 말에 가깝게 적는다.',
  '- 정의가 없는 함수는 이름의 뜻대로 수행하는 동작이다. 이름은 영어 snake_case로, docstring과 주석은 사용자의 언어로 쓴다.',
  '- 줄 하나에 동작 하나만 쓴다.',
  '- 사용자가 말하지 않은 분기나 기본값을 지어내지 않는다. 사용자가 정해야 하는 곳은 `ask_user("질문")`으로 쓴다.',
  '- pseudocode:syntax 스킬이 있으면 그 문법을 따른다.',
  '',
  '부른 뒤',
  '- 작업을 시작하지 않고 턴을 끝낸다. 채팅에는 수도코드를 다시 쓰지 않고, 패널을 확인해 달라고 한 줄만 말한다.',
].join('\n')

const TOOL_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: '요청을 한 줄로 줄인 말' },
    pseudocode: { type: 'string', description: '이해한 내용을 쓴 수도코드. 코드블록 표시 없이 본문만 넣는다' },
  },
  required: ['title', 'pseudocode'],
}

const POSTED_RESULT = [
  '패널에 수도코드를 올렸다.',
  '작업을 시작하지 말고 지금 턴을 끝내라.',
  '채팅에는 패널을 확인해 달라고 한 줄만 말하라.',
  '사용자가 확인하거나 고치면 새 메시지로 온다.',
].join(' ')

const STATUS_TEXTS: Record<DraftStatus, string> = {
  waiting: '확인을 기다리는 중입니다.',
  confirmed: '이대로 진행하라고 보냈습니다.',
  edited: '고친 내용을 보냈습니다.',
}

const draft = atom({ plugin: 'pseudocode-panel', key: 'draft' } as const, null, {
  shape: 'draft-1',
})

const isEditing = atom({ plugin: 'pseudocode-panel', key: 'isEditing' } as const, false)

const editText = atom({ plugin: 'pseudocode-panel', key: 'editText' } as const, '')

const isPaneClosed = atom({ plugin: 'pseudocode-panel', key: 'isPaneClosed' } as const, true)

/** 수도코드 패널을 연다 */
async function openPane($: EngineInterface): Promise<void> {
  await $.ui.open({ id: PANE, title: PANE_TITLE })
  await update($, isPaneClosed, () => false)
}

/** 수도코드 패널이 그려져 있으면 닫고 아니면 연다 */
async function togglePane($: EngineInterface): Promise<void> {
  const panes = await $.ui.panes()
  const isDrawn = panes.some(pane => pane.id === PANE && pane.isPlaced)

  if (!isDrawn) return openPane($)

  await $.ui.close({ id: PANE })
  await update($, isPaneClosed, () => true)
}

/** Claude가 올린 수도코드를 패널에 새로 올린다 */
async function postDraft($: EngineInterface, posted: Draft): Promise<void> {
  await update($, draft, () => posted)
  await update($, editText, () => posted.code)
  await update($, isEditing, () => false)
  await openPane($)
}

/** 확인을 기다리는 수도코드를 그대로 Claude에게 보낸다 */
async function confirmDraft($: EngineInterface): Promise<void> {
  const current = await read($, draft)
  if (current === null || current.status !== 'waiting') return

  await update($, draft, () => ({ ...current, status: 'confirmed' as const }))
  await update($, isEditing, () => false)
  void $.prompt.submit({ text: buildConfirmPrompt(current.code), asUser: true })
}

/** 고친 수도코드를 Claude에게 보낸다 (고친 곳이 없으면 그대로 확인한 것으로 보낸다) */
async function sendEdited($: EngineInterface): Promise<void> {
  const current = await read($, draft)
  if (current === null || current.status !== 'waiting') return

  const edited = (await read($, editText)).trim()
  if (edited === '') {
    $.ui.toast(EMPTY_EDIT_TOAST)

    return
  }
  if (edited === current.code) return confirmDraft($)

  await update($, draft, () => ({ ...current, code: edited, status: 'edited' as const }))
  await update($, isEditing, () => false)
  void $.prompt.submit({ text: buildEditedPrompt(edited), asUser: true })
}

/** 고치던 내용을 버리고 Claude가 올린 수도코드로 되돌린다 */
async function cancelEdit($: EngineInterface): Promise<void> {
  const current = await read($, draft)

  await update($, editText, () => current?.code ?? '')
  await update($, isEditing, () => false)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: TOOL_NAME,
      description: TOOL_DESCRIPTION,
      inputSchema: TOOL_INPUT_SCHEMA,
      isDeferred: false,
    })

    return next(e)
  })

  on('tool.call', { tool: TOOL }, async ($, e) => {
    const code = typeof e.pseudocode === 'string' ? e.pseudocode.trim() : ''
    if (code === '') return { deny: EMPTY_CODE_DENY }

    const title = typeof e.title === 'string' ? e.title.trim() : ''
    await postDraft($, { title, code, status: 'waiting' })

    return { result: POSTED_RESULT }
  }).catch(() => ({ deny: POST_FAILED_DENY }))

  on('ui.close', { id: PANE }, async ($, e, next) => {
    const closed = await next(e)
    await update($, isPaneClosed, () => true)

    return closed
  }).catch(($, e, next) => next(e))

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
          label={PANE_TITLE}
          onPress={() => togglePane($)}
        />
        {engineModes}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Input, Code } = $.ui.resolve(e)
    const current = await read($, draft)

    if (current === null) {
      return <Text dimColor>아직 올라온 수도코드가 없습니다.</Text>
    }

    const isWaiting = current.status === 'waiting'
    const isEditingNow = isWaiting && (await read($, isEditing))
    const editing = await read($, editText)
    const saveEditText = (value: string) => void update($, editText, () => value)

    return (
      <Box flexDirection="column" gap={SECTION_GAP}>
        {current.title !== '' && <Text bold>{current.title}</Text>}
        <Text dimColor size="caption">
          {STATUS_TEXTS[current.status]}
        </Text>
        {!isEditingNow && <Code source={current.code} language={CODE_LANGUAGE} />}
        {isEditingNow && (
          <Input
            key={EDIT_INPUT}
            value={editing}
            rows={countInputRows(editing)}
            submitLabel="보내기"
            autoFocus
            onInput={saveEditText}
            onSubmit={async value => {
              await update($, editText, () => value)
              await sendEdited($)
            }}
          />
        )}
        {isWaiting && !isEditingNow && (
          <Box gap={1}>
            <Button
              key={CONFIRM_BUTTON}
              variant="primary"
              label="이대로 진행"
              onPress={() => confirmDraft($)}
            />
            <Button
              key={EDIT_BUTTON}
              variant="secondary"
              label="고치기"
              onPress={() => void update($, isEditing, () => true)}
            />
          </Box>
        )}
        {isEditingNow && (
          <Box gap={1}>
            <Button
              key={SEND_BUTTON}
              variant="primary"
              label="고친 대로 진행"
              onPress={() => sendEdited($)}
            />
            <Button
              key={CANCEL_BUTTON}
              variant="secondary"
              label="취소"
              onPress={() => cancelEdit($)}
            />
          </Box>
        )}
      </Box>
    )
  })
}
