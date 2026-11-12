---
name: commit-one
description: "로컬 변경 사항을 커밋 하나로 커밋한다. \"하나의 커밋으로 커밋해\" 요청 시 사용한다."
---

- 아직 커밋하지 않은 변경 사항을 모두 커밋 하나로 만든다.
- 이미 있는 커밋은 건드리지 않는다.
- 커밋 메시지는 `~/.claude/commit-message.md` 규칙을 따른다.
- `~/.claude/commit-message.md`가 없으면 Conventional Commits 형식(`<type>: <description>`)으로 쓴다.
- 푸시는 하지 않는다.
