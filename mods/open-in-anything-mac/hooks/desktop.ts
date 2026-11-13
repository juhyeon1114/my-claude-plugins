import type { EngineInterface } from 'claude-code'

/** 데스크톱 앱이 세션마다 메타데이터 파일을 두는 폴더 (`$HOME` 기준 상대 경로) */
const DESKTOP_SESSIONS_DIR =
  'Library/Application Support/Claude/claude-code-sessions'

/** 최근 하루 안에 바뀐 메타데이터 파일 중 `cliSessionId` 가 `$2` 인 파일의 경로를 출력하는 셸 스크립트 */
const FIND_SESSION_FILE_SCRIPT =
  'find "$HOME/$1" -name "local_*.json" -mtime -1 -exec grep -l -F "\\"cliSessionId\\":\\"$2\\"" {} +'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/** 세션 메타데이터의 `requestedAdditionalFolders` 에서 폴더 경로만 꺼낸다 */
const additionalFolderPaths = (metadata: unknown): string[] => {
  if (!isRecord(metadata) || !Array.isArray(metadata.requestedAdditionalFolders)) {
    return []
  }

  return metadata.requestedAdditionalFolders.flatMap((folder: unknown) =>
    isRecord(folder) && typeof folder.path === 'string' ? [folder.path] : [],
  )
}

/** 데스크톱 앱이 남긴 메타데이터 파일 중 지금 세션의 파일 경로를 찾는다 */
async function findSessionFile(
  $: EngineInterface,
): Promise<string | undefined> {
  const sessionId = await $.session.id()
  const { stdout } = await $.process.run([
    'sh',
    '-c',
    FIND_SESSION_FILE_SCRIPT,
    'sh',
    DESKTOP_SESSIONS_DIR,
    sessionId,
  ])

  return stdout.split('\n').find(line => line !== '')
}

/** 데스크톱 앱이 지금 세션에 추가한 폴더 경로를 세션 메타데이터 파일에서 읽는다 */
export async function readDesktopFolders(
  $: EngineInterface,
): Promise<string[]> {
  const sessionFile = await findSessionFile($)

  if (sessionFile === undefined) {
    return []
  }

  return additionalFolderPaths(JSON.parse(await $.fs.read(sessionFile)))
}
