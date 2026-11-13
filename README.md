# 설치

마켓플레이스를 먼저 추가한다.

```zsh
claude plugin marketplace add juhyeon1114/my-claude-plugins
```

그다음 쓰고 싶은 플러그인을 골라 설치한다.

```zsh
claude plugin install open-in-anything-mac@juhyeon1114
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

```zsh
claude plugin install pseudocode@juhyeon1114
```

```zsh
claude plugin install pseudocode-panel@juhyeon1114
```

# 플러그인

## 1) open-in-anything-mac
세션에 포함된 폴더를 입력창 위에 버튼으로 보여준다. 버튼을 누르면 그 폴더를 IntelliJ IDEA나 VS Code, 터미널, GitHub로 연다.

- 프로젝트 루트와 `--add-dir`로 추가한 폴더가 버튼으로 나온다.
- macOS에서만 동작한다.
- 맨 앞의 버튼을 누를 때마다 여는 앱이 `IJ`, `VS`, `Term`, `GH` 순서로 바뀐다. 고른 앱은 다음 세션에도 유지된다.
- `Term`을 고르면 macOS 기본 터미널 앱에서 그 폴더로 새 창이 열린다.
- `GH`를 고르면 그 폴더가 속한 GitHub 저장소 페이지가 기본 브라우저로 열린다. git 원격 `origin`이 GitHub 주소여야 한다.
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

## 8) pseudocode
AI에게 주는 지침 가운데 절차를 수도코드로 쓰게 돕는다. 순서, 분기, 반복이 있는 부분만 수도코드로 바꾸고 어조나 이유는 자연어로 둔다.

- `/pseudocode:extract`: 세션, 문서, 파일에서 수도코드로 쓰면 좋은 절차를 찾아 위치, 종류, 효과, 모호한 표현 표로 정리한다. 대상을 지정하지 않으면 이 세션을 다룬다.
- `/pseudocode:convert`: 자연어 지침을 수도코드를 쓴 지침으로 바꾼다. "필요하면", "적절히" 같은 모호한 표현은 추측하지 않고 묻는다. 바꾼 뒤 원문과 규칙을 하나씩 대조한다.
- "수도코드로 뽑을 것 찾아줘", "수도코드로 바꿔줘"라고 말해도 동작한다.
- 해석 규칙은 `syntax` 스킬에 있어, 수도코드로 쓴 지침을 받으면 Claude가 직접 불러 참고한다. 문법은 같은 스킬의 `grammar.md`에, 바꿀지 판단하는 기준은 `criteria.md`에 있다.
- 바꾼 결과에는 해석에 필요한 약속 세 줄이 머리말로 들어가, 이 플러그인이 없는 곳에서도 같은 뜻으로 읽힌다.

## 9) pseudocode-panel
무엇인가를 시키면 Claude가 일을 시작하기 전에 요청을 이해한 내용을 수도코드로 써서 대화 옆 패널에 띄운다. 패널에서 그대로 확인하거나 고쳐서 다시 보낸다.

- 코드 작업뿐 아니라 글쓰기, 조사, 계획, 의견을 구하는 일 같은 일반 대화도 수도코드로 띄운다.
- 인사나 한두 문장으로 답이 끝나는 질문에는 띄우지 않는다.
- "이대로 진행"을 누르면 Claude가 그 수도코드대로 일을 시작한다.
- "고치기"를 누르면 수도코드를 고칠 수 있다. "고친 대로 진행"을 누르면 Claude가 달라진 곳을 말한 뒤 고친 내용대로 진행한다.
- 범위, 분량, 어조처럼 말로 준 조건은 수도코드의 `지킬 것:` 목록에 들어간다.
- 답변 아래의 "Pseudo로 보기"를 누르면 그 답변을 대화 맥락과 함께 수도코드로 바꿔 패널에 띄운다. 고쳐서 보내면 Claude가 달라진 곳을 말한 뒤 고친 내용에 맞춰 다시 답한다. 대화에 메시지는 남지 않는다.
- 답변 버튼은 도구 호출 사이의 글 덩어리마다 붙는다. 아주 짧은 덩어리에는 붙지 않는다.
- 입력창 근처의 "Pseudo" 버튼으로 패널을 켜고 끈다.
- `pseudocode` 플러그인이 함께 설치되어 있으면 그 문법을 따른다. 없어도 동작한다.
