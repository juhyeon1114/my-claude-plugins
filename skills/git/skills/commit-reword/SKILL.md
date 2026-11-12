---
name: commit-reword
description: "로컬의 가장 최근 커밋 메시지를 작업 내용에 맞게 고친다. \"커밋 메세지 수정해\", \"메세지 amend해\" 요청 시 사용한다."
---

- 가장 최근 커밋의 변경 내용을 보고 메시지를 `~/.claude/commit-message.md` 규칙에 맞게 다시 쓴다.
- `~/.claude/commit-message.md`가 없으면 Conventional Commits 형식(`<type>: <description>`)으로 쓴다.
- 메시지만 고친다. 아직 커밋하지 않은 변경 사항은 커밋에 넣지 않는다.
- 이미 remote에 올라간 커밋이면 고친 뒤 강제 푸시가 필요하다고 알린다.
- 푸시는 하지 않는다.
