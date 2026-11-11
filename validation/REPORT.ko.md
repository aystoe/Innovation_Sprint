# 배포 전 검증 결과 — 2026-11-11

**판정: 배포 검증 미완료. 200명 동시 접속 지원을 확인하지 못했다.**

실행 환경에 Supabase URL/publishable key, 테스트 계정, DB 접속 정보가 없고 PostgreSQL/Docker가 설치되어 있지 않다. npm 설치는 registry의 HTTP 403으로 실패했다. 운영 환경에 요청을 보내거나 DB를 변경하지 않았다.

## 실제 실행 결과

| 항목 | 결과 | 근거 |
| --- | --- | --- |
| Node 단위 테스트 | 55개 통과, 실패 0 | `results/unit.txt` |
| 채팅 로그아웃 정리·늦은 응답 폐기 | 통과, 테스트 transport 사용 | `tests/chatSession.node.test.mjs` |
| 100개 방 순차 방문 후 활성 구독 | 1개 유지, 종료 후 0개 | 같은 테스트, 실제 WebSocket 측정 아님 |
| 스테이징 가드·200명 단계·통계 계산 | 통과 | `tests/loadtest.node.test.mjs` |
| TypeScript 비-TSX 구문 검사 / 스크립트 구문 검사 | 통과 | `results/syntax.txt`, 의미적 타입 검사는 아님 |
| 패키지 설치 | 실패 | npm `E403`, `@eslint/js` 다운로드 거부 |
| 프로덕션 빌드 | 도구 부재로 시작 실패 | `results/build.txt`: tsc not found |
| 타입 검사 | 도구 부재로 시작 실패 | `results/typecheck.txt`: tsc not found |
| 전체 테스트 명령 | Node 단계는 당시 49개 통과, React 단계 실행 불가 | `results/tests.txt`: vitest not found. 이후 추가분 포함 Node 최종 결과는 55개 |
| lint | 도구 부재로 시작 실패 | `results/lint.txt`: eslint not found |

실행 도중 발견한 테스트 스크립트 구문 오류는 수정했으며 최종 Node 결과가 55/55다. 도구 부재는 코드가 빌드/타입 검사를 통과했다는 뜻이 아니다.

## 아직 실행하지 못한 검증

| 요구사항 | 준비된 검증 | 실행 상태 |
| --- | --- | --- |
| A 프로필 수정 → B 검색·상세 조회, 이메일 비노출 | `scripts/test-release.mjs` | DB 미연결 |
| A 행사 생성 → B 조회, 본인 외 수정 차단 | 같은 통합 테스트 | DB 미연결 |
| Member/Organizer 전환의 접근권한 불변 | Organizer 사용자 메타데이터 위조 후 제한 행사 조회/수정 차단 테스트 + `supabase/tests/permissions.sql` | DB 및 화면 미실행 |
| B 반복 신청은 1행, B/C 정원 1 동시 신청은 1명만 성공 | 통합 테스트 + `events_live.sql` | DB 미연결 |
| A/B 동일 방·실시간 채팅, C 조회/전송·발신자 위조 차단 | `test-direct-chat.mjs`, `direct_chat.sql` | DB/WebSocket 미실행 |
| 실제 UI 로그아웃 → C 로그인 시 초안·대화 없음 | 기존 React 테스트 및 수동 3브라우저 체크 | React/브라우저 미실행. 상태 객체의 정리 단위 테스트만 통과 |
| 200명 검색·채팅·신청 부하 | `loadtest/run.mjs` | 미실행 |

응답 시간 p50/p95/p99, 실제 오류율, Realtime 동시 연결 수, 메시지 사용량은 **측정값 없음(N/A)**이다. 단위 테스트 실행 시간을 서버 응답 시간으로 대체하지 않았다.

## 코드에서 확인하고 개선한 부분

1. **방 이동 후 구독·조회 누적**: 이전에는 방문한 모든 방이 계속 구독되고 15초마다 재조회됐다. 이제 페이지 이탈 시 구독을 해제하고 열린 방만 주기 조회한다. 미전송 메시지/커서는 계정 메모리에 유지하고 재진입 시 누락을 조회한다. 방 생성 요청이 끝나기 전에 이동한 경우도 숨은 구독을 만들지 않는다. 100개 방을 방문하는 로컬 회귀 테스트로 활성 구독 1개를 확인했다.
2. **신청자 집계 인덱스**: migration `202611110008_query_indexes.sql`에 `event_id WHERE registration_status='registered'` 인덱스 추가. 기존 user_id 선두 인덱스와 용도가 다르다.
3. **전체 행사 날짜 정렬 인덱스**: 같은 migration에 `(starts_at,id)` 추가. 기존 type 선두 인덱스는 전체 피드 정렬과 다르다.

2·3은 DB에 적용하지 않았으며 실제 지연 개선율은 측정하지 않았다. 200행 규모에서는 planner가 순차 스캔을 선택하는 것이 정상일 수 있다. 단순히 인덱스 사용 여부가 아니라 실행 시간·buffer·행 수를 전후 비교해야 한다.

## 남은 병목 후보

- `notify_participation_change`는 공개 행사 신청마다 조회 가능한 회원들의 event_sync를 갱신한다. 200명 공개 행사라면 요청 1회당 최대 200행 변경과 다수의 수신/재조회가 발생한다. 해당 공유 행들의 잠금 경합과 WAL/Realtime 사용량이 가장 중요한 관찰 대상이다.
- 변경 신호마다 전체 접근 가능 행사를 다시 읽는다. 데모 60개보다 실제 행사 수가 많아지면 커서 기반 피드와 변경 행사 단위 조회가 필요하다.
- 이름 부분 문자열 검색은 현재 `strpos` 조건으로 일반 이름 정렬 인덱스를 효율적으로 쓰지 못할 수 있다. 실제 계획 확인 후 trigram/검색용 정규화 열을 검토한다. 검색 의미를 바꾸는 미검증 rewrite는 하지 않았다.
- 200명 전체가 같은 행사에 신청하는 순간에는 정원 보호를 위한 행사 행 잠금 자체가 직렬화 지점이다. 정원 무결성을 포기하는 방식으로 최적화하지 않는다.

부하 측정 없이 DB notification 구조나 RLS를 변경해 성능 개선을 주장하지 않았다. `LOAD_SCENARIO.ko.md`의 동일 데이터·동일 환경 기준 baseline/candidate 비교가 남아 있다.

## 배포 승인 전 조건

1. 패키지 접근 가능한 환경에서 npm install → build/typecheck/test/lint. 최초 성공 설치의 lockfile을 저장하고 이후 npm ci 사용.
2. 별도 Supabase 프로젝트에 001–008 migration 적용, staging marker와 fixture 준비.
3. SQL 권한 테스트, 3계정 API·Realtime 통합 테스트, 실제 화면의 프로필/행사/채팅/모드 전환·로그아웃 확인.
4. 200명 시나리오 실행 및 Dashboard 측정, 병목 조정 후 동일 시나리오 재실행.
5. 실패 0건인 권한·정원 무결성 검증과 정의한 성능 기준 충족 확인 후 배포 판단.

필요한 연결 정보는 `loadtest/.env.example`에 정리했다. 비밀번호/service-role/JWT는 채팅으로 보내지 말고 테스트 실행 환경에 주입한다.
