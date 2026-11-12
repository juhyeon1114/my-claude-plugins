---
name: commit
description: "로컬 변경 사항을 커밋한다. \"커밋해\", \"변경 사항 커밋해\" 요청 시 사용한다. \"커밋은 하지 마\"처럼 커밋하지 말라는 말에는 쓰지 않는다."
---

- 아직 커밋하지 않은 변경 사항을 모두 커밋한다.
- 변경의 목적이 서로 다르면 목적별로 나눠 여러 커밋으로 만든다.
- 커밋 메시지는 `~/.claude/commit-message.md` 규칙을 따른다.
- `~/.claude/commit-message.md`가 없으면 Conventional Commits 형식(`<type>: <description>`)으로 쓴다.
- 푸시는 하지 않는다.
