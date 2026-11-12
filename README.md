# 설치

마켓플레이스를 먼저 추가한다.

```zsh
claude plugin marketplace add juhyeon1114/my-claude-plugins
```

그다음 쓰고 싶은 플러그인을 골라 설치한다.

```zsh
claude plugin install open-in-intellij@juhyeon1114
```

```zsh
claude plugin install contents-index@juhyeon1114
```

# 플러그인

## 1) open-in-intellij
세션에 포함된 폴더를 입력창 위에 버튼으로 보여준다. 버튼을 누르면 그 폴더를 IntelliJ IDEA로 연다.

- 프로젝트 루트와 `--add-dir`로 추가한 폴더가 버튼으로 나온다.
- macOS에서만 동작한다.
- IntelliJ IDEA가 설치되어 있어야 한다.

## 2) contents-index
응답마다 목차를 만들어 대화 옆 패널에 띄운다. 항목을 누르면 대화에서 그 위치로 이동한다.

- 답변 본문의 제목을 뽑아 최근 응답부터 보여준다.
- 제목이 없는 응답은 첫 줄이 항목이 된다.
- 턴 중에 새로 나온 응답에는 "3분 전" 같은 경과 시간이 붙는다.
- 입력창 근처의 "목차" 버튼으로 패널을 켜고 끈다.
