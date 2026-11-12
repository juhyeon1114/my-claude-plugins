---
name: commit-squash
description: "remote에 올리지 않은 로컬 커밋들을 하나로 squash한다. \"로컬 커밋들 하나로 합쳐\", \"squash해\" 요청 시 사용한다."
---

- remote에 올리지 않은 커밋들을 하나로 합친다.
    - upstream이 있으면 `@{u}..HEAD` 의 커밋을 합친다.
    - upstream이 없으면 base 브랜치에서 갈라진 지점 이후의 커밋을 합친다.
- 합칠 커밋이 하나뿐이면 아무것도 하지 않고 알린다.
- 아직 커밋하지 않은 변경 사항은 건드리지 않는다.
- 합친 커밋의 메시지는 전체 변경을 보고 `~/.claude/commit-message.md` 규칙에 맞게 새로 쓴다.
- `~/.claude/commit-message.md`가 없으면 Conventional Commits 형식(`<type>: <description>`)으로 쓴다.
- 푸시는 하지 않는다.
