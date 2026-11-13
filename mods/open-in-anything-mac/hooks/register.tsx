import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { readDesktopFolders } from './desktop'
import type { App } from './app'
import { DEFAULT_APP_ID, ICON_SIZE, findApp, isAppId, nextApp } from './app'
import { readGithubUrl } from './github'

/** 고른 앱을 세션이 바뀌어도 기억하도록 `$.store` 에 두는 키 */
const APP_STORE_KEY = 'app'
const SWITCH_APP_BUTTON = 'switch-app'
/** 데스크톱 앱이 폴더를 정하기 전의 세션을 띄워 두는 임시 폴더 */
const SPARE_SESSION_DIR = '/.claude/spares/'

/** 폴더가 이 개수를 넘으면 버튼 대신 선택 상자 하나로 보여준다 */
const MAX_FOLDER_BUTTONS = 5
/** 선택 상자에서 아무 폴더도 고르지 않은 상태를 나타내는 값 */
const SELECT_PLACEHOLDER = ''
const SELECT_PLACEHOLDER_LABEL = '폴더 열기'
const GROUP_GAP = 1
/** 폴더 목록을 한 번 모은 뒤 다시 모으는 시점 (밀리초) */
const RECHECK_DELAYS_MS = [1_000, 5_000, 15_000]

const folders = atom(
  { plugin: 'open-in-anything-mac', key: 'folders' } as const,
  [],
)

const selectedApp = atom(
  { plugin: 'open-in-anything-mac', key: 'app' } as const,
  DEFAULT_APP_ID,
)

const selectPickCount = atom(
  { plugin: 'open-in-anything-mac', key: 'selectPickCount' } as const,
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
  const addedByArgs = await readAddedFolders($)
  const addedByDesktop = await readDesktopFolders($).catch(() => [])

  return [...new Set([root, ...addedByArgs, ...addedByDesktop])]
}

const folderName = (path: string): string =>
  path.split('/').filter(Boolean).pop() ?? path

/** 폴더를 macOS 앱으로 열고, 실패하면 토스트로 알린다 */
const openInMacApp = async ($: EngineInterface, app: App, path: string) => {
  const { exitCode, stderr } = await $.process.run([
    'open',
    '-a',
    app.name,
    path,
  ])

  if (exitCode !== 0) {
    $.ui.toast(`${app.name}로 열지 못했습니다: ${stderr.trim() || path}`)
  }
}

/** 폴더가 속한 GitHub 저장소 페이지를 기본 브라우저로 열고, 저장소를 찾지 못하면 토스트로 알린다 */
const openInGithub = async ($: EngineInterface, path: string) => {
  const url = await readGithubUrl($, path)

  if (url === undefined) {
    $.ui.toast(`GitHub 저장소를 찾지 못했습니다: ${path}`)

    return
  }

  await $.process.run(['open', url])
}

/** 폴더를 고른 앱으로 연다 */
const openFolder = ($: EngineInterface, app: App, path: string) =>
  app.id === 'github' ? openInGithub($, path) : openInMacApp($, app, path)

/** 지난 세션에서 고른 앱을 `$.store` 에서 읽어 이번 세션에 반영한다 */
const restoreApp = async ($: EngineInterface) => {
  const stored = await $.store.get(APP_STORE_KEY)

  if (isAppId(stored)) {
    await update($, selectedApp, () => stored)
  }
}

/** 다음 앱으로 바꾸고, 다른 세션에서도 쓰도록 `$.store` 에 남긴다 */
const switchApp = async ($: EngineInterface) => {
  const switched = await update($, selectedApp, id => nextApp(id).id)

  await $.store.set(APP_STORE_KEY, switched)
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

/** 폴더 목록을 지금 모으고, 데스크톱 앱이 세션 메타데이터 파일을 늦게 쓰는 경우에 대비해 몇 번 더 모은다 */
const refreshFoldersWithRechecks = async ($: EngineInterface) => {
  await refreshFolders($)

  RECHECK_DELAYS_MS.forEach(delayMs => {
    $.clock.after(delayMs, () => void refreshFolders($))
  })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await restoreApp($)
    await refreshFoldersWithRechecks($)

    return next(e)
  })

  on('classic.CwdChanged', async ($, e, next) => {
    await refreshFoldersWithRechecks($)

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    await refreshFoldersWithRechecks($)

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
    const app = findApp(await read($, selectedApp))

    return (
      <Box flexDirection="column">
        <Box alignItems="center" gap={GROUP_GAP}>
          {'Svg' in elements && (
            <elements.Svg
              source={app.icon}
              alt={app.name}
              width={ICON_SIZE}
              height={ICON_SIZE}
            />
          )}
          <Button
            key={SWITCH_APP_BUTTON}
            label={app.shortName}
            dimColor
            onPress={() => switchApp($)}
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

                await openFolder($, app, path)
                await update($, selectPickCount, count => count + 1)
              }}
            />
          ) : (
            list.map(path => (
              <Button
                key={path}
                label={folderName(path)}
                onPress={() => openFolder($, app, path)}
              />
            ))
          )}
        </Box>
      </Box>
    )
  })
}
