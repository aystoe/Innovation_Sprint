# 200명 동시 접속 시나리오

## 환경과 준비

운영과 **별도 Supabase 프로젝트**를 사용한다. 프로젝트 지역·DB compute·Realtime 제한은 운영 예정 설정과 맞추고 값/버전을 결과에 기록한다. 실행기는 Node 22.18+와 설치된 프로젝트 의존성이 필요하다. 실제 브라우저 200개가 아닌, 각자 로그인 세션과 Realtime client를 가진 200개의 SDK 사용자다. 이미지 업로드/다운로드·렌더링·모바일 성능은 별도 브라우저 테스트 대상이다.

가드 3개: 명시적 프로젝트 ref와 URL 일치, `LOADTEST_CONFIRM=isolated-staging-only`, DB에 설치한 staging marker. 이 가드는 이름만 보고 production을 자동 판별하지 않으므로 운영에는 marker를 설치하지 않는다.

```bash
npm install
# 전용 환경 파일에 loadtest/.env.example의 값을 채운다.
# Supabase SQL Editor 또는 psql로 001–008 적용 후 loadtest/staging-only.sql 적용
node --env-file=loadtest/.env.local loadtest/prepare.mjs
node --env-file=loadtest/.env.local scripts/test-release.mjs
node --env-file=loadtest/.env.local loadtest/run.mjs
```

prepare는 전용 TUM 도메인 테스트 계정 200개와 실제 Auth UUID에 연결된 프로필·행사 60개를 만든다. 인증 이메일은 전송하지 않는다. 하나의 JWT를 200명이 공유하지 않는다. 생성한 비밀번호가 든 fixture는 0600 권한으로 로컬에 저장하고 Git/배포 ZIP에서 제외한다. 서비스 키는 provisioning에만 사용하며 부하 트래픽은 publishable key+각 사용자 세션으로 RLS를 통과한다. fixture가 있으면 중복 생성하지 않고 중단한다. 부분 실패 시 `.partial` 파일로 만들어진 계정을 기록하므로 재생성 전에 관리자가 확인한다.

API 테스트 메시지는 실제 staging DB에 남는다. 반복 측정은 동일한 초기 데이터 스냅샷/별도 동일 구성 프로젝트를 사용하고, 기존 신청/채팅 이력이 다른 상태의 결과를 직접 비교하지 않는다. 준비 스크립트는 자동 대량 삭제를 하지 않는다.

## 부하 모델

| 시간 | 사용자 | 동작 |
| --- | --- | --- |
| 0–2분 | 1→50 | 점진적 로그인·초기 조회·구독 |
| 2–5분 | 50→200 | 점진적 증가 |
| 5–20분 | 200 유지 | 아래의 혼합 사용 |
| 10분 | 200 | 같은 정원 20 행사에 동시에 신청, 정원 오류를 예상 결과로 별도 집계 |
| 12분 | 20명 | WebSocket 5초 끊기 후 복구·누락 메시지 조회 |
| 20–21분 | 200→0 | 로그아웃·구독/연결 종료 |

- 검색 100명(50%): 5–15초 생각 시간, 이름 변경/직업 필터, 20%는 다음 페이지. 기존 프론트 입력 지연 이후 서버에 도달하는 검색만 모델링한다.
- 채팅 60명(30%): 30개 1대1 쌍, 10–25초마다 짧은 메시지, 5%는 같은 전송 ID 재시도. 구독 수신 뒤 메시지 catch-up RPC, 15초 보완 조회. 별도 API 테스트와 단위 테스트가 이전 메시지 페이지네이션 정확성을 검증한다.
- 행사 40명(20%): 10–25초마다 참여/취소, 신청의 15%는 같은 신청을 반복. 대화 목록 구독도 유지해 혼합 화면 사용을 모델링한다.
- 모든 사용자: event_sync 구독, 변경 신호 150ms 병합, 행사 전체 페이지 조회, 30초 보완 조회. 서버 fan-out 부하를 숨기지 않는다.

예상 **입력 목표**는 검색 약 10req/s, 메시지 약 3.4건/s, 참여·취소 약 2.3req/s와 조회·알림 부가 트래픽이다. 측정 결과가 아니다. 실제 throughput은 응답 지연과 think time에 따라 줄어드는 closed-loop 모델이다. 포화 상태에서도 고정 RPS를 계속 넣는 시험은 별도 open-loop 단계로 추가한다.

## 측정과 판정

실행기는 5초마다 `timeseries.ndjson`, 종료 시 `summary.json`을 쓴다. SDK 요청 p50/p95/p99, 오류율, 예상 정원 거부, 수신 payload 수/바이트, 실제 클라이언트 소켓 연결 수, 구독된 채널 수, 200연결 유지 비율, 정상 구간 메시지의 상대 관찰 지연, 누락 수, 실행기 event loop 지연을 기록한다. 재조회로 회복한 메시지와 WebSocket payload 수는 구분한다. 상대 관찰 지연은 WebSocket 또는 catch-up 중 먼저 관찰한 시점이므로 순수 WebSocket 지연과 같지 않다.

| 목표(측정 전 임시 기준) | 통과 조건 |
| --- | --- |
| 검색·행사 조회·메시지 저장 | p95 ≤ 1초 |
| 참여 신청 및 경합 요청 | p95 ≤ 2초 |
| 상대 메시지 관찰 | 정상 유지 구간 p95 ≤ 2초 |
| 예상 밖 오류 | 각 작업 ≤ 1%; 429/5xx/timeout은 오류에 포함 |
| 연결 유지 | peak 200, 정상 구간 200연결 sample 비율 ≥ 98% |
| 무결성 | 제3자 유출·발신자 위조·중복 저장·정원 초과 0 |
| 복구 | 정상 구간 전송 중 상대가 끝까지 관찰하지 못한 메시지 0 |

구독 오류 수와 종료 후 소켓 수는 별도 확인한다. finalConnectedSockets는 0이어야 한다. interrupted 실행이나 기준 미달은 성공으로 취급하지 않는다. 200명 유지가 안 되거나 실행기 event loop 지연이 커지면 실행기 자체 포화도 먼저 조사한다. p99는 반드시 기록하고 이후 실제 제품 요구에 맞춰 임계값을 확정한다.

**Dashboard 실측을 반드시 추가한다.** 클라이언트 payload 카운터는 heartbeat·프로토콜 프레임·서버 과금 정의를 포함하지 않으므로 Supabase 메시지 사용량과 동일하지 않다.

1. UTC 시작/종료 시간과 실행 region 기록. Realtime Reports의 Connected Clients, Postgres Changes Events, payload size, lag를 구간별 보관.
2. 프로젝트 Usage에서 Realtime 메시지/egress 사용량의 전후 값을 기록. 집계 지연이 있으면 반영 후 다시 기록. 다른 트래픽 없는 전용 환경을 사용.
3. DB CPU/memory/연결 수, slow queries/pg_stat_statements, 잠금 대기와 WAL 증가 확인. 특히 participation notify와 list_events/search_members 측정.
4. HTTP 429/5xx와 Auth/Realtime 로그를 대조. Realtime 한도는 현재 프로젝트 설정에서 확인하며 플랜 명칭만으로 200연결 지원을 가정하지 않는다.

공식 기준: https://supabase.com/docs/guides/realtime/reports , https://supabase.com/docs/guides/realtime/limits

## 개선 전후 비교

같은 compute/region/fixture에서 baseline(007)과 candidate(008 및 채팅 구독 정리)을 각각 3회 실행한다. 실행기 코드·부하·데이터는 동일하게 유지한다. 이 harness는 화면당 현재 구독을 모델링하므로 100개 방 순차 방문 누적 문제는 별도 로컬 회귀/브라우저 navigation 시험으로 비교한다. DB 인덱스 효과는 실제 DB 전후 측정 대상이다.

`validation/explain.sql`에 fixture user_id/event_id를 전달해 실행 계획·buffer를 저장한다. 이후 데이터량을 2천/2만 회원 및 수백 행사로 늘릴 때 검색 비용도 별도로 확인한다. 측정된 병목에만 수정하고 권한 테스트를 먼저 재실행한 뒤 부하 결과를 비교한다.

현재 이 시나리오는 **작성·구문/보조 로직 검사만 완료**, 실제 부하 실행과 Dashboard 사용량 측정은 미수행이다.
