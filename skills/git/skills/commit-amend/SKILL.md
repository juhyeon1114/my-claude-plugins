---
name: commit-amend
description: "아직 커밋하지 않은 변경 사항을 가장 최근 커밋에 합친다. \"amend해\", \"마지막 커밋에 합쳐\", \"방금 커밋에 넣어\" 요청 시 사용한다. 커밋 메시지만 고칠 때는 쓰지 않는다."
---

- 아직 커밋하지 않은 변경 사항을 모두 가장 최근 커밋에 합친다. 새 커밋은 만들지 않는다.
- 합칠 변경 사항이 없으면 아무것도 하지 않고 알린다.
- 메시지는 그대로 둔다. 합친 뒤의 변경 내용과 맞지 않으면 `~/.claude/commit-message.md` 규칙에 맞게 다시 쓴다.
- `~/.claude/commit-message.md`가 없으면 Conventional Commits 형식(`<type>: <description>`)으로 쓴다.
- 이미 remote에 올라간 커밋이면 고친 뒤 강제 푸시가 필요하다고 알린다.
- 푸시는 하지 않는다.
