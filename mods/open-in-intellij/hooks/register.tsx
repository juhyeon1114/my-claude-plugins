import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { ICON_SIZE, ICON_SVG } from './icon'

const INTELLIJ_APP = 'IntelliJ IDEA'
/** 데스크톱 앱이 폴더를 정하기 전의 세션을 띄워 두는 임시 폴더 */
const SPARE_SESSION_DIR = '/.claude/spares/'

const folders = atom({ plugin: 'open-in-intellij', key: 'folders' } as const, [])

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

/** 폴더를 IntelliJ IDEA 로 열고, 실패하면 토스트로 알린다 */
const openInIntelliJ = async ($: EngineInterface, path: string) => {
  const { exitCode, stderr } = await $.process.run([
    'open',
    '-a',
    INTELLIJ_APP,
    path,
  ])

  if (exitCode !== 0) {
    $.ui.toast(`IntelliJ로 열지 못했습니다: ${stderr.trim() || path}`)
  }
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
    const { Box, Button } = elements

    return (
      <Box gap={1} flexWrap="wrap">
        {list.map(path => (
          <Box alignItems="center" gap={1}>
            {'Svg' in elements && (
              <elements.Svg
                source={ICON_SVG}
                alt="IntelliJ IDEA"
                width={ICON_SIZE}
                height={ICON_SIZE}
              />
            )}
            <Button
              key={path}
              label={folderName(path)}
              onPress={() => openInIntelliJ($, path)}
            />
          </Box>
        ))}
      </Box>
    )
  })
}
