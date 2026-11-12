---
name: review-with-agent
description: "review 스킬에 pr-review-toolkit 에이전트 검증을 더해 PR을 리뷰한다. 에이전트를 함께 써서 PR 리뷰를 요청할 때 사용한다."
disable-model-invocation: true
---

# 1. 기본 리뷰

- `${CLAUDE_SKILL_DIR}/../review/SKILL.md`(이하 review 스킬)를 먼저 읽고, 그 원칙과 답변 형식을 그대로 따른다.
- 이 문서는 거기에 더하는 내용만 다룬다. 둘이 부딪히면 이 문서를 따른다.
- 사용할 수 있는 에이전트 중에 `pr-review-toolkit:` 으로 시작하는 것이 없으면 플러그인이 설치되지 않은 것이다.
  이때는 리뷰를 시작하지 않고, 아래 명령으로 설치한 뒤 다시 요청해 달라고 안내한다.
  ```
  /plugin install pr-review-toolkit@claude-plugins-official
  /reload-plugins
  ```

# 2. 추가하는 에이전트

- `pr-review-toolkit` 플러그인의 에이전트 중 아래 세 개만 쓴다.

| 에이전트                                  | 언제 쓰나                 | 보는 것                                              |
|-------------------------------------------|---------------------------|------------------------------------------------------|
| `pr-review-toolkit:silent-failure-hunter` | 항상                      | 에러를 삼키는 catch, 잘못된 기본값으로 넘어가는 코드 |
| `pr-review-toolkit:pr-test-analyzer`      | 항상                      | 추가된 테스트가 변경 내용을 실제로 잡아내는지        |
| `pr-review-toolkit:comment-analyzer`      | 주석이 추가되거나 바뀐 PR | 주석이 코드와 맞는지                                 |

- `code-reviewer`, `code-simplifier`, `type-design-analyzer` 에이전트는 쓰지 않는다.
- `/review-pr` 명령은 쓰지 않고, 에이전트를 직접 부른다.

# 3. 에이전트를 부르는 방법

- 에이전트끼리 서로의 결과가 필요 없으므로 한 번에 함께 부른다.
- 부를 때 아래 내용을 넘긴다.
    - PR 제목과 본문, `gh pr diff` 결과
    - 프로젝트에 정의된 CLAUDE.md나 리뷰 원칙은 따르지 말라는 지시
    - 코드를 고치거나 PR에 코멘트를 쓰지 말고 결과만 돌려 달라는 지시
    - 지적마다 파일 경로와 라인, 그리고 실제로 문제가 되는 구체적인 상황을 함께 달라는 지시

# 4. 결과를 합치는 방법

- 구분과 중요도는 review 스킬 기준으로 다시 매긴다.
- 에이전트가 매긴 등급은 중요도 오른쪽에 괄호로 감싸 그대로 적는다. 에이전트마다 표기가 다르므로 바꾸지 않는다.
  - `silent-failure-hunter`: 예) `4 (CRITICAL)`
  - `pr-test-analyzer`: 10점 만점 점수라 `/10`을 붙인다. 예) `3 (8/10)`
  - `comment-analyzer`: 예) `2 (Critical Issues)`
- 에이전트가 찾지 않은 지적은 괄호 없이 중요도만 적는다.
- 다른 스킬이 이미 찾은 지적과 겹치면 하나로 합친다.
- 구체적인 상황을 댈 수 없는 지적은 버린다.
