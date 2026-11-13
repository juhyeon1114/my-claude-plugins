# 변환 예시

PR 리뷰 지침 하나를 수도코드를 쓴 지침으로 바꾸는 과정이다.

## 원문

````markdown
# PR 리뷰 지침

PR을 리뷰할 때는 먼저 PR 설명과 연결된 티켓을 읽는다. 변경된 파일이 너무 많으면 사용자에게 어디부터 볼지 묻는다.
파일마다 버그, 빠진 테스트, 이름 짓기를 본다. 버그로 보이는 것은 필요하면 직접 재현해 본다.
코멘트는 정중하게, 한 코멘트에 한 가지만 쓴다. 고칠 방법을 아는 경우에는 제안 코드를 붙인다.
리뷰 결과는 채팅으로만 보여주고 GitHub에는 쓰지 않는다.
사소한 지적이 대부분이면 승인을, 버그가 하나라도 있으면 변경 요청을 권한다.
````

## 바꿀 부분 나누기

| 원문                                         | 판단                                          |
|----------------------------------------------|-----------------------------------------------|
| 설명과 티켓을 읽고, 파일마다 세 가지를 본다  | 수도코드. 순서가 있는 절차와 반복이다         |
| 파일이 많으면 묻는다, 필요하면 재현한다      | 수도코드. 분기다                              |
| 고칠 방법을 알면 제안 코드를 붙인다          | 수도코드. 분기다                              |
| 승인과 변경 요청을 권하는 조건               | 수도코드. 값에 따라 정해지는 결과다           |
| 채팅으로만 보여주고 GitHub에는 쓰지 않는다   | `지킬 것`. 절차 전체에 걸리는 단일 규칙이다   |
| 코멘트는 정중하게, 한 코멘트에 한 가지만     | 자연어. 어조와 정도를 다룬다                  |

분기와 반복이 합쳐서 여섯이라 효과 등급은 높음이다.

## 모호한 표현 정하기

| 원문 표현                                    | 종류                              | 다룬 방법         | 정한 내용              |
|----------------------------------------------|-----------------------------------|-------------------|------------------------|
| "너무 많으면"                                | 값으로 정할 수 있는 것            | 사용자에게 물었다 | 30개를 넘으면          |
| 사소한 지적이 대부분인데 버그도 있을 때      | 원문에 적히지 않은 경우에 할 일   | 사용자에게 물었다 | 변경 요청을 권한다     |
| 버그도 없고 사소한 지적이 대부분도 아닐 때   | 원문에 적히지 않은 경우에 할 일   | 사용자에게 물었다 | 의견만 남기기를 권한다 |
| "필요하면"                                   | 상황을 보고 판단해야 하는 것      | 함수로 뒀다       |                        |

"고칠 방법을 아는 경우에는"은 아니면 붙이지 않는다는 뜻이 당연히 따라 나오므로 묻지 않았다.

## 바꾼 결과

````markdown
# PR 리뷰 지침

```python
# 수도코드 지침: 실행할 코드가 아니라 따라야 할 절차다.
# 정의가 없는 함수는 이름과 주석의 뜻대로 직접 수행한다.
# 순서와 분기를 적힌 대로 지키고, 뜻을 정할 수 없으면 사용자에게 묻는다.

MAX_FILES = 30


def review_pull_request(pr):
    """PR을 리뷰한다.

    지킬 것:
    - 리뷰 결과는 채팅으로만 보여주고 GitHub에는 쓰지 않는다.
    """
    read(pr.description)
    read(pr.linked_ticket)

    files = pr.changed_files
    if len(files) > MAX_FILES:
        first_files = ask_user("변경된 파일이 많다. 어디부터 볼까?")
        files = move_to_front(files, first_files)

    findings = []
    for file in files:
        file_findings = review_file(file)
        findings.extend(file_findings)

    for finding in findings:
        comment = write_comment(finding)
        if can_suggest_fix(finding):
            attach_suggested_code(comment)
        report(comment)

    verdict = recommend_verdict(findings)
    report(verdict)


def review_file(file):
    """파일 하나에서 지적할 것을 찾는다."""
    findings = find_problems(file)  # 버그, 빠진 테스트, 이름 짓기
    for finding in findings:
        if is_bug(finding) and needs_reproduction(finding):  # 원문: "필요하면"
            reproduce(finding)
    return findings


def recommend_verdict(findings):
    """리뷰 결론을 권한다."""
    if has_bug(findings):
        return "변경 요청"
    if is_mostly_minor(findings):
        return "승인"
    return "의견만 남기기"
```

코멘트는 정중하게, 한 코멘트에 한 가지만 쓴다.
````

## 원문과 대조하기

| 원문 규칙                                    | 바꾼 결과의 위치                               | 상태          |
|----------------------------------------------|------------------------------------------------|---------------|
| 먼저 PR 설명과 연결된 티켓을 읽는다          | `review_pull_request`의 첫 두 줄               | 같음          |
| 파일이 너무 많으면 어디부터 볼지 묻는다      | `MAX_FILES`, `ask_user`, `move_to_front`       | 사용자가 정함 |
| 파일마다 버그, 빠진 테스트, 이름 짓기를 본다 | 첫 번째 `for`와 `find_problems`                | 같음          |
| 버그로 보이는 것은 필요하면 재현한다         | `review_file`의 `needs_reproduction`           | 같음          |
| 코멘트는 정중하게, 한 가지만 쓴다            | 블록 아래 자연어                               | 같음          |
| 고칠 방법을 알면 제안 코드를 붙인다          | `can_suggest_fix`                              | 같음          |
| 채팅으로만 보여주고 GitHub에는 쓰지 않는다   | `지킬 것`                                      | 같음          |
| 버그가 하나라도 있으면 변경 요청을 권한다    | `recommend_verdict`의 첫 번째 `if`             | 같음          |
| 사소한 지적이 대부분이면 승인을 권한다       | `recommend_verdict`의 두 번째 `if`             | 같음          |
| 없음                                         | `recommend_verdict`에서 버그를 먼저 보는 순서  | 사용자가 정함 |
| 없음                                         | `recommend_verdict`의 마지막 `return`          | 사용자가 정함 |

## 보여주기

바꾼 결과 아래에 이렇게 쓴다.

```
사용자가 정한 표현
- "너무 많으면": 30개를 넘으면
- 버그가 있으면 사소한 지적이 대부분이어도 변경 요청을 권한다
- 버그도 없고 사소한 지적이 대부분도 아니면 의견만 남기기를 권한다

함수로 둔 표현
- "필요하면": needs_reproduction

원문 규칙 9개가 모두 들어갔다.
```
