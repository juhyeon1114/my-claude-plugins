import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Ide } from './ide'
import { DEFAULT_IDE_ID, ICON_SIZE, findIde, isIdeId, nextIde } from './ide'

/** 고른 IDE를 세션이 바뀌어도 기억하도록 `$.store` 에 두는 키 */
const IDE_STORE_KEY = 'ide'
const SWITCH_IDE_BUTTON = 'switch-ide'
/** 데스크톱 앱이 폴더를 정하기 전의 세션을 띄워 두는 임시 폴더 */
const SPARE_SESSION_DIR = '/.claude/spares/'

/** 폴더가 이 개수를 넘으면 버튼 대신 선택 상자 하나로 보여준다 */
const MAX_FOLDER_BUTTONS = 5
/** 선택 상자에서 아무 폴더도 고르지 않은 상태를 나타내는 값 */
const SELECT_PLACEHOLDER = ''
const SELECT_PLACEHOLDER_LABEL = '폴더 열기'
const GROUP_GAP = 1

const folders = atom({ plugin: 'open-in-ide', key: 'folders' } as const, [])

const selectedIde = atom(
  { plugin: 'open-in-ide', key: 'ide' } as const,
  DEFAULT_IDE_ID,
)

const selectPickCount = atom(
  { plugin: 'open-in-ide', key: 'selectPickCount' } as const,
  0,
)

/** 실행 인자 한 줄에서 `--add-dir` 값을 하나씩 잡는 패턴 */
const ADD_DIR_PATTERN = /--add-dir[= ](.+?)(?= --[a-z]|$)/g

/** 세션 프로세스의 실행 인자에서 `--add-dir` 로 추가된 폴더 경로를 읽는다 */
const readAddedFolders = async ($: EngineInterface): Promise<string[]> => {
  const { stdout } = await $.process.run([
    'sh',
    '-c',
    'ps -ww -o args= -p "$PPID"',
  ])

  return [...stdout.trim().matchAll(ADD_DIR_PATTERN)].flatMap(([, path]) =>
    path === undefined ? [] : [path.trim()],
  )
}

/** 세션의 프로젝트 루트와 추가된 폴더를 중복 없이 모은다 */
const collectFolders = async ($: EngineInterface): Promise<string[]> => {
  const root = await $.session.root()
  const added = await readAddedFolders($)

  return [...new Set([root, ...added])]
}

const folderName = (path: string): string =>
  path.split('/').filter(Boolean).pop() ?? path

/** 폴더를 고른 IDE로 열고, 실패하면 토스트로 알린다 */
const openInIde = async ($: EngineInterface, ide: Ide, path: string) => {
  const { exitCode, stderr } = await $.process.run(['open', '-a', ide.app, path])

  if (exitCode !== 0) {
    $.ui.toast(`${ide.app}로 열지 못했습니다: ${stderr.trim() || path}`)
  }
}

/** 지난 세션에서 고른 IDE를 `$.store` 에서 읽어 이번 세션에 반영한다 */
const restoreIde = async ($: EngineInterface) => {
  const stored = await $.store.get(IDE_STORE_KEY)

  if (isIdeId(stored)) {
    await update($, selectedIde, () => stored)
  }
}

/** 다음 IDE로 바꾸고, 다른 세션에서도 쓰도록 `$.store` 에 남긴다 */
const switchIde = async ($: EngineInterface) => {
  const switched = await update($, selectedIde, id => nextIde(id).id)

  await $.store.set(IDE_STORE_KEY, switched)
}

/** 폴더 목록을 지금 세션 기준으로 다시 모으고, 이미 알던 폴더는 유지한다 */
const refreshFolders = async ($: EngineInterface) => {
  const collected = await collectFolders($)

  await update($, folders, known =>
    [...new Set([...collected, ...known])].filter(
      path => !path.includes(SPARE_SESSION_DIR),
    ),
  )
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await restoreIde($)
    await refreshFolders($)

    return next(e)
  })

  on('classic.CwdChanged', async ($, e, next) => {
    await refreshFolders($)

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    await refreshFolders($)

    return next(e)
  })

  on('classic.DirectoryAdded', async ($, e, next) => {
    await update($, folders, list => [...new Set([...list, e.directory])])

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, folders)

    if (e.props.hasSurvey || list.length === 0) {
      return next(e)
    }

    const elements = $.ui.resolve(e)
    const { Box, Button, Select } = elements
    const pickCount = await read($, selectPickCount)
    const ide = findIde(await read($, selectedIde))

    return (
      <Box alignItems="center" gap={GROUP_GAP}>
        {'Svg' in elements && (
          <elements.Svg
            source={ide.icon}
            alt={ide.app}
            width={ICON_SIZE}
            height={ICON_SIZE}
          />
        )}
        <Button
          key={SWITCH_IDE_BUTTON}
          label={ide.shortName}
          dimColor
          onPress={() => switchIde($)}
        />
        {list.length > MAX_FOLDER_BUTTONS ? (
          <Select
            key={`folder-select-${pickCount}`}
            options={[
              { value: SELECT_PLACEHOLDER, label: SELECT_PLACEHOLDER_LABEL },
              ...list.map(path => ({ value: path, label: folderName(path) })),
            ]}
            value={SELECT_PLACEHOLDER}
            onSelect={async path => {
              if (path === SELECT_PLACEHOLDER) {
                return
              }

              await openInIde($, ide, path)
              await update($, selectPickCount, count => count + 1)
            }}
          />
        ) : (
          list.map(path => (
            <Button
              key={path}
              label={folderName(path)}
              onPress={() => openInIde($, ide, path)}
            />
          ))
        )}
      </Box>
    )
  })
}
