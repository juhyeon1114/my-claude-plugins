# arc42

소프트웨어 아키텍처를 문서로 남기는 틀이다. 페터 흐루샤카 (Peter Hruschka)와 게르노트 슈타르케 (Gernot Starke)가 만들었다.
절 12개가 미리 정해져 있어서, 무엇을 써야 할지 고민하지 않고 빈칸을 채우듯 쓸 수 있다.
모든 절을 채울 필요는 없다. 쓸 내용이 없는 절은 비워 둔다. 누구나 무료로 쓸 수 있다.

## 구성

1. 소개와 목표 (Introduction and Goals): 시스템이 하는 일과 가장 중요한 품질 목표 서너 개를 쓴다.
2. 제약 (Constraints): 마음대로 바꿀 수 없는 조건을 쓴다. 정해진 기술, 법, 조직 규칙 같은 것이다.
3. 맥락과 범위 (Context and Scope): 시스템 바깥에 누가 있고 무엇과 주고받는지 쓴다.
4. 해결 전략 (Solution Strategy): 목표를 이루려고 고른 큰 방향을 몇 줄로 쓴다.
5. 구성 요소 관점 (Building Block View): 시스템을 어떤 부분으로 나눴는지 쓴다.
6. 실행 관점 (Runtime View): 중요한 동작 몇 가지가 어떤 순서로 일어나는지 쓴다.
7. 배포 관점 (Deployment View): 어떤 서버에 무엇이 올라가는지 쓴다.
8. 공통 개념 (Crosscutting Concepts): 여러 부분에서 똑같이 쓰는 규칙을 모은다.
9. 설계 결정 (Architecture Decisions): 중요한 결정을 쓴다. 보통 ADR을 링크한다.
10. 품질 요구 (Quality Requirements): 품질 목표를 확인할 수 있는 문장으로 쓴다.
11. 위험과 기술 부채 (Risks and Technical Debt): 알고 있는 위험과 미뤄 둔 문제를 쓴다.
12. 용어 (Glossary): 이 시스템에서 쓰는 낱말의 뜻을 쓴다.

3절과 5절에는 C4 모델 그림을 함께 넣는 경우가 많다.

## 예시

[arc42-example.md](arc42-example.md)에 있다.

## 자주 하는 실수

- 12개 절을 모두 억지로 채운다. 쓸 것이 없는 절은 비워 두는 편이 낫다.
- 품질 목표를 "빠르다", "안정적이다"처럼 확인할 수 없게 쓴다.
- 1절의 품질 목표와 10절의 품질 요구가 따로 논다. 목표마다 확인할 상황이 있어야 한다.

## 참고 자료

- [arc42 Overview](https://arc42.org/overview): 공식 사이트의 소개 페이지다. 절 12개와 만든 사람, 사용 조건이 나온다.
- [arc42 Documentation](https://docs.arc42.org/home/): 절마다 무엇을 쓰는지 조언과 예시를 모은 공식 문서다.
- [arc42 Download](https://arc42.org/download): 빈 틀을 Markdown, AsciiDoc, Word 같은 형식으로 받을 수 있다. 한국어판은 없다.
- [arc42 Examples](https://examples.arc42.org): 실제 시스템을 arc42로 정리한 예시 모음이다.
