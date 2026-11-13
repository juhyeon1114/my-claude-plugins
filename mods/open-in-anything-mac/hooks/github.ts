import type { EngineInterface } from 'claude-code'

/** git 원격 주소에서 GitHub 저장소의 소유자와 이름을 잡는 패턴 (`github.com-personal` 같은 SSH 호스트 별칭도 잡는다) */
const GITHUB_REMOTE_PATTERN = /github\.com[^:/]*[:/]([^/]+)\/(.+?)(?:\.git)?\/?$/

/** git 원격 주소를 브라우저로 여는 GitHub 저장소 주소로 변환한다 */
export const toGithubUrl = (remoteUrl: string): string | undefined => {
  const [, owner, repository] =
    remoteUrl.trim().match(GITHUB_REMOTE_PATTERN) ?? []

  return owner === undefined || repository === undefined
    ? undefined
    : `https://github.com/${owner}/${repository}`
}

/** 폴더가 속한 git 저장소의 `origin` 이 가리키는 GitHub 저장소 주소를 읽는다 */
export async function readGithubUrl(
  $: EngineInterface,
  path: string,
): Promise<string | undefined> {
  const { exitCode, stdout } = await $.process.run([
    'git',
    '-C',
    path,
    'remote',
    'get-url',
    'origin',
  ])

  return exitCode === 0 ? toGithubUrl(stdout) : undefined
}
