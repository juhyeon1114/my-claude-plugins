# 설치

마켓플레이스를 먼저 추가한다.

```zsh
claude plugin marketplace add juhyeon1114/my-claude-plugins
```

그다음 쓰고 싶은 플러그인을 골라 설치한다.

```zsh
claude plugin install open-in-ide@juhyeon1114
```

```zsh
claude plugin install contents-index@juhyeon1114
```

```zsh
claude plugin install writing-format@juhyeon1114
```

```zsh
claude plugin install pull-request@juhyeon1114
```

```zsh
claude plugin install git@juhyeon1114
```

```zsh
claude plugin install session@juhyeon1114
```

```zsh
claude plugin install skill@juhyeon1114
```

# 플러그인

## 1) open-in-ide
세션에 포함된 폴더를 입력창 위에 버튼으로 보여준다. 버튼을 누르면 그 폴더를 IntelliJ IDEA나 VS Code로 연다.

- 프로젝트 루트와 `--add-dir`로 추가한 폴더가 버튼으로 나온다.
- macOS에서만 동작한다.
- 맨 앞의 `IJ`, `VS` 버튼을 누르면 여는 IDE가 바뀐다. 고른 IDE는 다음 세션에도 유지된다.
- 폴더가 5개를 넘으면 버튼 대신 선택 상자 하나로 나온다.
- 쓰려는 IDE(IntelliJ IDEA, Visual Studio Code)가 설치되어 있어야 한다.

## 2) contents-index
응답마다 목차를 만들어 대화 옆 패널에 띄운다. 항목을 누르면 대화에서 그 위치로 이동한다.

- 답변 본문의 제목을 뽑아 최근 응답부터 보여준다.
- 제목이 없는 응답은 첫 줄이 항목이 된다.
- 턴 중에 새로 나온 응답에는 그 턴의 질문 첫 줄이 붙는다.
- 응답에 마우스를 올리면 그 턴에 걸린 시간, 도구 호출 수, 오류 수, 고친 파일이 펼쳐진다. 도는 중인 턴의 응답은 테두리가 초록색으로 바뀐다.
- 패널 맨 위의 입력칸에 말을 넣으면 질문이나 제목에 그 말이 들어 있는 응답만 남는다.
- 입력창 근처의 "목차" 버튼으로 패널을 켜고 끈다.

## 3) writing-format
설계 문서, ADR, BLUF, SCQA 같은 글쓰기 양식 20개를 모아 두고, 글에 맞는 양식을 골라 쓰게 한다. 글을 짧게 줄이는 스킬도 들어 있다.

- `/writing-format:analyze`: 글에 어울리는 문서 종류와 글의 짜임 조합을 적합도와 함께 표로 보여준다.
- `/writing-format:write`: 조합을 고르게 한 뒤 그 양식으로 글을 쓰거나 고친다.
- `/writing-format:simplify`: 글이나 답변을 중요한 내용만 남겨 짧게 줄인다. "줄여줘", "간단히 써줘"라고 말해도 동작한다.
- 대상 글을 지정하지 않으면 직전 답변을 다룬다.
- 양식 목록은 `formats` 스킬에 있어, 기술 글을 쓸 때 Claude가 직접 불러 참고한다.

## 4) pull-request
GitHub PR을 리뷰하거나 PR 글을 쓴다. 결과는 채팅으로만 보여주고 GitHub에는 쓰지 않는다.

- `/pull-request:review <PR 링크>`: PR을 리뷰하고 리뷰 요약과 코멘트 초안을 보여준다.
- `/pull-request:review-with-agent <PR 링크>`: `review`에 `pr-review-toolkit` 에이전트 검증을 더한다.
- `/pull-request:comment-review <코멘트 또는 PR 링크>`: 달린 코멘트가 타당한지 판단하고 답글 초안을 보여준다.
- `/pull-request:write`: 작업 내용을 보고 PR 제목과 본문 초안을 보여준다.
- `gh` CLI가 로그인되어 있어야 한다.
- `review-with-agent`는 `pr-review-toolkit` 플러그인이 있어야 한다. `comment-review`는 있으면 함께 쓴다.

## 5) git
커밋과 푸시를 정해진 규칙대로 한다. "커밋해", "푸시해"처럼 말해도 동작한다.

- `/git:commit`: 변경 사항을 목적별로 나눠 커밋한다.
- `/git:commit-one`: 변경 사항을 커밋 하나로 커밋한다.
- `/git:commit-amend`: 변경 사항을 가장 최근 커밋에 합친다.
- `/git:commit-reword`: 가장 최근 커밋의 메시지를 변경 내용에 맞게 고친다.
- `/git:commit-squash`: remote에 올리지 않은 커밋들을 하나로 합친다.
- `/git:push`: 현재 브랜치를 푸시한다. 강제 푸시는 지시했을 때만 한다.
- 커밋 메시지는 `~/.claude/commit-message.md`가 있으면 그 규칙을 따르고, 없으면 Conventional Commits 형식으로 쓴다.
- 커밋 스킬은 푸시하지 않고, 푸시 스킬은 커밋하지 않는다.

## 6) session
세션에서 한 일을 정리하거나 다음 세션으로 넘긴다.

- `/session:decisions`: 결정 사항을 결론, 근거, 링크 표로 뽑는다. 대상을 지정하지 않으면 이 세션을 다룬다.
- `/session:handoff`: 새 세션이 작업을 이어받을 수 있게 목표, 지금 상태, 남은 일, 주의할 점을 붙여 넣을 글로 정리한다.
- `/session:retro`: 세션에서 Claude를 바로잡은 지점을 찾아 `CLAUDE.md`나 스킬에 넣을 규칙을 제안한다. 고른 규칙만 반영한다.
- `/session:print-id`: 현재 세션의 Id를 복사하기 쉽게 출력한다.
- `decisions`, `handoff`, `retro`는 "결정 사항 정리해", "핸드오프 써줘", "세션 회고해"라고 말해도 동작한다.

## 7) skill
- `/skill:improve <스킬 폴더>`: 스킬을 Anthropic 스킬 작성 모범 사례 체크리스트로 점검하고, 통과하지 못한 항목을 고친다. "스킬 개선해", "스킬 점검해"라고 말해도 동작한다.
- 점검만 하라고 하면 고치지 않고 표로 보고한다.
