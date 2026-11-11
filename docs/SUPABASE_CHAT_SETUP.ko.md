# 실제 1대1 채팅 — 5단계

기존 채팅 디자인과 Member/Organizer 전환을 유지하며 sendDemoMessage와 자동 답장을 제거했다. 두 모드 모두 같은 인증 UUID와 채팅 데이터를 사용한다. VITE_DATA_MODE=demo에서도 채팅은 실제 가입자 사이에서만 동작한다. 가짜 프로필/자동 대화 이력을 운영 DB로 옮기지 않는다.

## 적용 순서

1. 기존 migration 001–006 이후 `supabase/migrations/202611100007_direct_chat.sql` 실행. 메시지 순번·재시도 키를 기존 메시지에도 채우므로 데이터가 많다면 별도 점검 후 적용한다.
2. Supabase Dashboard → Database → Publications → `supabase_realtime`에서 `messages`, `conversation_members`가 포함됐는지 확인. migration이 추가한다. 기존 `event_sync`는 유지한다.
3. 기존 `.env.local`의 URL/publishable key를 유지. `npm install`, `npm run build`, `npm test` 실행 후 앱 배포. 서비스 역할 키는 앱에 넣지 않는다.
4. 프로필을 작성한 실제 TUM 계정 A/B/C로 아래 SQL 및 통합 테스트 수행. 원격 DB 적용·실제 WebSocket 테스트는 이번 작업에서 실행하지 않았다.

추가 Auth Hook/Storage 설정이나 관리자 역할은 필요 없다. 프로필의 Chat 버튼과 Chatting 이름 검색은 동일한 `get_or_create_direct_conversation` RPC로 진입한다. canonical UUID pair UNIQUE 제약으로 A→B와 B→A의 동시 생성도 하나의 방이 된다. 채팅 진입 시 빈 대화방은 생성되지만 메시지는 자동으로 생성하지 않는다.

## 조회와 실시간

- 이름 검색은 기존 서버 회원 검색 RPC, 입력 지연, 20명 페이지네이션을 사용한다. 실제 프로필만 표시하며 이메일은 반환하지 않는다. 본인은 목록에서 제외한다(페이지 수에는 디렉터리의 본인 한 명이 포함될 수 있다).
- 대화 목록은 최신 메시지 시각순 20개 페이지. 현재 페이지는 새 메시지/자신의 대화방 멤버십 INSERT 및 재연결 시 다시 조회한다.
- 메시지는 최근 40개부터 시작하며 “Load earlier messages”로 더 이전의 순번을 조회한다. 이전 페이지를 추가할 때 스크롤 위치를 보존한다. 새 메시지는 하단 근처에서만 자동 스크롤한다.
- 방별 `messages INSERT`를 구독하며 RLS로 해당 방 회원에게만 전달한다. 받은 payload를 바로 병합하지 않고, 마지막 연속 조회 순번 이후의 DB 메시지를 페이지 단위로 조회한다.
- SUBSCRIBED/재연결, 온라인·포커스·가시성 복귀, 15초 보완 조회를 통해 누락을 복구한다. 접속이 끊긴 동안 즉시 수신을 보장하지 않는다.
- 순번은 DB bigint를 문자열로 전송하고 프론트에서 BigInt로 비교한다. 타임스탬프 동률, JS 정수 정밀도, 최신 발신 확인이 먼저 도착하는 상황에서도 조회 커서를 건너뛰지 않는다.
- 대화방 행 잠금 아래에서 순번 할당과 메시지 삽입을 같은 트랜잭션으로 처리한다. 후속 순번이 먼저 커밋돼 복구 커서가 앞선 메시지를 놓치는 문제를 방지한다.

## 전송 상태와 중복 방지

입력한 메시지는 Sending… → Sent 또는 Failed · not confirmed로 표시된다. 전송 요청은 15초 후 실패 표시로 전환할 수 있다. 네트워크 오류는 DB 저장 여부가 불명확하므로 실패를 “미저장 확정”으로 표시하지 않는다.

Retry는 같은 client_message_id와 원문을 재사용한다. `(sender_id, client_message_id)` UNIQUE와 서버 멱등 RPC로 응답 유실·동시 재시도 시 저장은 한 번만 한다. 같은 재시도 ID에 다른 방/본문을 보내면 거부한다. 재전송 전에 실시간 조회로 저장 사실이 확인되면 Sent로 바뀐다. 내용이 같더라도 새로 작성해 Send를 누른 메시지는 별도 메시지다.

Sent는 서버 저장 완료이며 읽음/상대 접속을 뜻하지 않는다. 읽음 표시·푸시 알림·첨부 파일·그룹 채팅·수정/삭제·차단 기능은 이번 범위 밖이다.

추천 문구 3개는 빈 대화에서 유지된다. 클릭하면 입력창만 채우며 실제 Send 전에는 저장하지 않는다. 자동 답장은 없다.

미전송/실패 메시지는 현재 로그인 앱 메모리에만 두어 화면 이동 후에도 재시도할 수 있다. 새로고침·로그아웃·인증 화면으로 전환되어 앱이 해제되면 미확정 전송 상태와 초안은 폐기된다. 서버에 저장된 메시지는 다음 로그인 때 다시 조회한다. 영구 오프라인 outbox는 구현하지 않았다.

## 접근 권한과 계정 정리

- conversations/conversation_members/messages의 기존 RLS를 유지. list RPC는 security invoker이고 비참여자는 방/메시지를 읽지 못한다.
- send RPC는 auth.uid()로 발신자를 결정하고 방 멤버십을 검사한다. 발신자 지정 인수가 없다.
- 직접 메시지 INSERT 권한도 회수하여 RPC 밖에서 순번·재시도 키를 우회하지 못하게 한다. UPDATE/DELETE 및 직접 멤버 추가도 허용하지 않는다. 기존 messages_insert RLS 검사도 유지한다.
- 로그아웃/계정 변경 시 UUID로 분리한 Provider를 해제하고 요청 abort, 방/목록 구독 해제, 보완 조회 타이머 제거, 메시지/실패 상태/초안 초기화를 수행한다. 이전 요청의 지연 응답도 버린다.
- 과거 데모 localRepository 데이터는 현재 채팅에서 읽지 않는다. 대화는 로컬 저장소에 기록하지 않는다. 신뢰된 DB 관리자/service-role은 일반 사용자 RLS 경계 밖이다.

Supabase의 Postgres Changes와 RLS 방식에 맞춰 INSERT만 구독한다: https://supabase.com/docs/guides/realtime/postgres-changes

## 검증

실행 완료: Node 단위 테스트 47개(기존 36 + 채팅 상태 11). 채팅 테스트는 85개 메시지 이전 페이지, 재연결 97개 누락 복구, 응답 유실 후 같은 ID 재시도, 중복 클릭, 발신 확인보다 앞선 누락 복구, 로그아웃/계정 재생성 이후 늦은 응답 폐기를 검증한다. 이는 주입한 테스트 transport로 수행하며 DB RLS 통과를 의미하지 않는다.

실행 완료: 비-TSX TypeScript 구문 검사, 통합 스크립트 구문 검사. CSS/이미지 파일은 변경하지 않았다.

작성했으나 미실행:

- `supabase/tests/direct_chat.sql`: 제3자 방/멤버/본문 조회 불가, 알려진 방 UUID로 RPC 조회/전송 차단, 발신자 위조 INSERT/UPDATE 차단, 익명 차단, 역순 동일 방, 재시도 중복 방지, 이전/이후 페이지.
- `tests/chatPage.test.tsx`: 추천 3개 비자동 발송, 실패·같은 ID 재시도, 계정 전환 시 데이터 제거. 기존 권한 테스트 `supabase/tests/permissions.sql`도 007의 RPC 전송 방식에 맞췄다.
- `scripts/test-direct-chat.mjs`: 실제 A/B/C의 동시 방 생성, 동시 재시도 5회, 상대 실시간 수신, C의 데이터 조회/전송 차단 및 payload 미수신, 직접 INSERT·RPC 발신자 위조 차단, 재접속 뒤 누락 조회.

패키지 설치가 네트워크 제한으로 완료되지 않아 전체 빌드/타입 검사/React 테스트를 실행하지 못했다. PostgreSQL/Supabase 연결이 없어 SQL과 실제 Realtime 보안 검증도 실행하지 못했다. 배포 전 다음을 실행한다:

```bash
npm install
npm run build
npm test
psql "$ADMIN_DB_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/direct_chat.sql
psql "$ADMIN_DB_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/permissions.sql
# 환경에 VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY 및
# 서로 다른 실제 staging 계정의 TEST_TOKEN_A / TEST_TOKEN_B / TEST_TOKEN_C를 주입
node scripts/test-direct-chat.mjs
```

SQL 테스트는 transaction rollback으로 테스트 행을 제거한다. 실제 API 통합 테스트는 의도적으로 메시지를 DB에 저장하므로 전용 staging 계정을 사용한다. 메시지 삭제 권한을 앱에 추가하지 않으며 테스트 종료 시 출력된 대화방 UUID를 관리자가 필요에 따라 정리한다. 토큰/비밀번호는 출력하거나 커밋하지 않는다.

수동 화면 확인: A가 Members→B→Chat으로 입장 후 추천 문구만 클릭하면 B에게 전송되지 않아야 한다. Send 후 B에서 실시간으로 보이고, B가 Chatting에서 A 이름 검색으로 들어가면 동일 대화가 보여야 한다. 오프라인 전송의 Failed·Retry, 40개 이상의 이전 메시지, 네트워크 복구, Organizer 전환, 로그아웃 후 C 로그인 시 이전 메시지/초안 소멸을 확인한다.
