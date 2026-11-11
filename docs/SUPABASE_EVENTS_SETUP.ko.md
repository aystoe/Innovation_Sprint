> 후속 5단계에서 채팅도 연결했습니다. 최신 채팅 상태는 [SUPABASE_CHAT_SETUP.ko.md](SUPABASE_CHAT_SETUP.ko.md)를 참조하세요.

# 행사 Supabase 연결 — 4단계

운영 모드의 행사 목록·상세·생성·수정·앱 내부 참여 신청/취소를 Supabase에 연결했다. 기존 카드/폼 CSS, Member/Organizer 버튼, Opportunities와 Social Events 분류를 유지한다. 로그인한 사용자의 실제 UUID가 작성자이며, 주최 기관명은 별도의 표시 필드다.

## 적용 순서

1. 기존 001–005 migration에 이어 `supabase/migrations/202611100006_events_live.sql` 실행.
2. Supabase Dashboard → Database → Publications에서 `supabase_realtime`에 **public.event_sync**가 포함됐는지 확인. migration이 이 테이블만 추가한다. events/event_participants를 별도로 publication에 추가할 필요는 없다. 이미 공개한 테이블이 있다면 불필요한 구독/공개 설정을 별도 점검한다.
3. `.env.local`의 URL/publishable key와 `VITE_DATA_MODE=production` 유지. 앱 서버 재시작 또는 재빌드.
4. 실제 seed 책임자가 먼저 가입하고 프로필을 작성. 그 UUID로 아래 seed 실행. 가상의 public-makers-host, bmw-mm-host 등을 Auth 사용자로 만들지 않는다.
5. 동일 책임자의 앱 로그인 정보로 이미지 업로드 스크립트 실행.
6. SQL·동시성·두 브라우저 실시간 테스트 후 운영에 적용한다. 이번 작업에서 원격 DB를 변경하거나 seed를 실제 실행하지는 않았다.

## 실제 행사 seed

```bash
psql "$ADMIN_DB_URL" -X -v ON_ERROR_STOP=1 \
  -v creator_id="실제_프로필_UUID" \
  -f supabase/seeds/upcoming_events.sql
```

| 원본 행사 | 등록 동작 | 앱 정원 | 시간 |
| --- | --- | --- | --- |
| Public Makers: Case Event mit der PD | Google Forms 외부 신청 | 없음 | 원본 유지 |
| BMW × MM Co-Creation Workshop | 앱 내부 신청 | 15 | 원본 유지 |
| Start and Spread 2026 | 외부 티켓 사이트 | 없음 | 원본 유지 |
| TUM IDEAward 2026 | Eventbrite 외부 티켓 | 없음 | 원본의 미확정 상태 유지 |

`src/data/upcomingEvents.ts`의 4개 행사 내용·날짜·링크를 옮긴다. 외부 사이트의 현재 접수 가능 여부나 일정은 별도로 확인하지 않았다. IDEAward는 원본에 시간이 미확정이라고 적혀 있어 `time_confirmed=false`로 저장하고 화면에는 “Time to be confirmed”라고 표시한다. 날짜 정렬용 원본 하루 범위는 보존하지만 자정 개최가 확정됐다는 의미로 표시하지 않는다.

- 고정 UUID와 UNIQUE `source_key`를 사용해 반복 실행해도 4개 행사가 중복 생성되지 않는다.
- `ON CONFLICT(source_key) DO NOTHING`: 이미 편집한 내용/이미지/작성자를 seed 재실행으로 덮어쓰지 않는다.
- 기존에 같은 행사를 수동 생성했다면, 운영자가 해당 행의 `source_key`를 manifest의 원본 ID와 연결한 뒤 seed를 실행한다. 제목 유사도를 이용해 무관한 행사를 자동 병합하지 않는다.
- author_id는 지정한 **실제 책임 계정 UUID**다. 주최 기관명은 host_label에 보관해 실제 주최자와 앱 게시자를 구분한다.
- BMW의 15명은 앱 신청 슬롯 상한이다. 외부 주최자의 공식 좌석/예약 시스템과 동기화된 것이 아니다. 필요하면 책임자가 정원을 수정하거나 외부 신청 URL을 확인해 모드를 변경한다. 이미 앱 신청자가 있을 때 내부 신청을 끄려면 먼저 신청 처리가 필요하다.
- `src/data/events.ts`, fictional 회원, 샘플 리뷰, 샘플 참여 이력은 seed에 넣지 않는다.

이미지 파일은 ZIP에 있는 public/events의 원본 4개를 사용한다. SQL만 실행하면 행사 내용이 생성되고 이미지 대신 기본 카드 이미지가 보인다. Storage에 실제 바이트를 올리려면 프로젝트 루트에서:

```bash
# 환경변수는 실행 환경에 주입. 비밀번호/토큰을 저장소에 커밋하지 않는다.
# VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SEED_EMAIL, SEED_PASSWORD
node scripts/upload-seed-images.mjs
```

Node 실행 시 .env.local을 자동 로드하지 않으므로 환경변수를 주입하거나 지원되는 Node의 `--env-file`을 사용한다. SEED_EMAIL/PASSWORD는 seed 작성자의 앱 전용 계정이다. 브라우저용 VITE_ 변수에 비밀번호를 넣지 않는다. 업로더는 실제 로그인 UUID와 author_id가 일치하는지 확인하고, 이미 연결된 image_path는 건너뛴다. 안정적인 seed 이미지 경로를 사용해 재실행 시 중복 파일을 늘리지 않는다. 임의의 타인 계정이나 service-role 소유권 없는 업로드를 사용하지 않는다.

## 조회·분류·수정

- `list_events`는 invoker RPC이며 events RLS를 적용한다. 외부 신청 URL도 행사 공개 대상에 해당하는 사용자에게만 반환한다.
- 100행씩 조회해 Supabase 기본 반환 제한으로 뒤쪽 행사가 누락되는 일을 피하고, 날짜/UUID 순으로 합친다. 현재 데모 규모에서는 접근 가능한 전체 행사를 읽고 기존 관심사 필터를 적용한다. 대규모 피드의 조건별 서버 페이지네이션은 후속 최적화다.
- Opportunities: job, cofounder, official. Social Events: hobby, alumni, party. 기존 announcement 분류도 보존.
- 날짜는 starts_at 오름차순, 동률은 UUID. 타임존 포함 저장. 작성/편집 폼에서는 사용자 브라우저 로컬 시간으로 변환한다.
- 공개 대상은 서버에서 OR 매칭하며 작성자 본인 조회 예외를 유지한다. Organizer 전환으로 조회 범위가 늘지 않는다. 운영 화면은 서버 조회 결과를 기준으로 사용한다.
- 본인이 작성한 상세에만 Edit event 버튼을 표시. 서버 RLS/컬럼 권한도 본인만 UPDATE를 허용한다.
- `revision`은 DB trigger가 증가시킨다. 편집 시작 시 버전을 기억하고 UPDATE WHERE revision으로 검사한다. 다른 변경이 있었다면 저장을 거부하므로 화면을 닫고 다시 열어 최신 내용을 확인한다.
- 신규 작성 폼의 UUID를 고정해 응답을 잃은 뒤 같은 폼에서 재시도해도 중복 행사를 만들지 않는다. 이미 생성된 행이면 그 행사를 반환하며, 남은 수정은 Edit로 안내한다. 페이지 새로고침 후 신규 폼을 다시 만드는 것은 별도 작성이다.

## 외부 신청과 앱 신청

`registration_mode`: internal / external / both / none.

- external: 외부 링크 버튼만 표시. 클릭은 새 탭 이동이며 DB에 참여 행을 쓰지 않는다. 외부 등록 완료 상태·티켓 보유 여부를 추정하지 않는다.
- internal: 앱 신청/취소 버튼. 신청은 실제 출석이 아니다.
- both: 외부 신청 버튼과 앱 관심/신청 버튼을 각각 표시하고, 외부 절차가 별도임을 안내한다.
- none: 신청 버튼 없음.
- job/cofounder/announcement는 기존처럼 내부 참여 대상이 아니다.
- 종료된 행사에 새 신청은 불가. 아직 출석 처리되지 않은 본인 신청은 취소할 수 있다. 실제 출석 기록은 이전 작성자 전용 RPC만 수정 가능하다. 이번 작업은 출석 관리 UI를 추가하지 않는다.

## 정원과 개인정보

`set_event_registration`은 행사 행에 `FOR UPDATE` 잠금을 획득한 뒤 유효 신청 수를 세고 정원을 확인한다. 신청/취소/정원 수정은 같은 행사 행 잠금으로 조정된다. 이미 신청한 사용자의 반복 요청은 한 행으로 수렴한다. 취소자는 다시 신청할 때 정원을 새로 검사한다.

정원을 현재 신청자 수 아래로 낮추거나, 신청자가 있는데 내부 신청을 끄거나 참여 불가능한 종류로 바꾸는 것은 DB가 거부한다. 클라이언트 직접 event_participants 쓰기는 이전처럼 차단한다. 서비스 역할 등 신뢰된 관리자 쓰기는 일반 사용자 보호 경계 밖이므로 운영 작업에서도 RPC를 사용한다.

조회에는 접근 가능한 행사의 총 앱 신청 수와 **본인** 신청/출석 상태만 제공한다. 다른 회원의 개별 신청 행/이메일은 노출하지 않는다. 기존 작성자 명단 조회 권한은 유지하되 별도 명단 UI는 이번 범위 밖이다.

## 실시간 갱신

행사 본문/참여자 레코드를 직접 WebSocket으로 배포하지 않는다. 대신 RLS 적용된 `event_sync(user_id, epoch)`의 **본인 행** INSERT/UPDATE만 구독한다.

- 행사 생성·수정·삭제: 이전 또는 새 공개 범위에 해당하는 회원에게 변경 신호. 공개 대상에서 빠진 회원도 다시 조회해 이미 열린 화면에서 행사를 제거할 수 있다.
- 신청/취소/출석 변경: 그 행사를 조회할 수 있는 회원과 신청자에게 신호. 각자 총 신청 수와 자신의 상태만 다시 읽는다.
- 본인 프로필 변경: 자신의 공개 대상 조건을 다시 평가하도록 신호.
- 신호에는 행사 ID·제목·참가자 정보가 없다. 상세 내용은 매번 현재 RLS를 적용한 HTTP 조회로 가져온다. DELETE의 이전 행 데이터를 클라이언트에 전송하지 않는다.
- 알림 연속 발생 시 150ms 병합, 이전 요청 abort, 재연결 SUBSCRIBED/포커스/온라인 복귀 시 재조회, 30초 보완 조회. 로그아웃/unmount 시 구독·타이머 정리.
- WebSocket 장애 중 즉시 반영을 보장하지는 않으며, 복구/보완 조회로 동기화한다. 수정 후 공개 제한이 바뀌어도 이미 다운로드된 파일 바이트는 소급 회수할 수 없다.
- 이 방식은 변경마다 대상 프로필에 알림 행을 갱신하므로 대형 커뮤니티에서는 비용이 커진다. 소규모 데모용이며 대규모 운영에서는 별도 Broadcast/대상별 알림 설계를 검토한다.

## 이미지

비공개 `event-images`, JPEG/PNG/WebP, 최대 5 MiB. 신규 행사를 먼저 실제 사용자 UUID로 만든 뒤 그 행사 소유자 경로에 업로드한다. 기존 Storage RLS가 작성자만 업로드/교체/삭제하도록 검사하고, 조회에는 행사 audience 조건을 적용한다.

편집은 새 파일 업로드 → 버전 검사를 포함한 DB 경로 갱신 → 옛 파일 삭제 순서다. 변경에 실패한 확실한 DB 오류는 새 파일을 정리하며, 결과를 알 수 없는 네트워크 실패는 소급 삭제하지 않는다. 새 행사 생성 후 이미지 실패는 “행사는 생성됨, Edit에서 이미지 재시도”로 구분한다. 새 행사 재생성을 유도하지 않는다. 고아 파일의 주기적 정리는 별도 작업이다. 동일 세션에서 image_path가 그대로인 이미지는 메모리에서 재사용하며, 매 실시간 갱신마다 다시 다운로드하지 않는다. 서버가 반환한 접근 가능 행사에 대해서만 재사용하고 로그아웃 시 캐시를 폐기한다.

## 검증 상태와 실행 방법

- 실행 완료: Node 단위 테스트 **36개** 통과. 도메인/검색 기존 27개 + 외부 URL·이미지 형식/크기 9개.
- 실행 완료: 비-TSX TypeScript 구문 및 로컬 import 검사, 실제 seed 이미지 4개 존재·중복 source_key 없음 확인, 기존 CSS/이미지/001–005 migration 무변경 확인.
- 작성/미실행: `supabase/tests/events_live.sql` — 정원·멱등 신청·출석 분리·외부 전용 차단·정원 축소 거부·공개 범위 변경·비공개 통계·본인 변경 알림 RLS.
- 작성/미실행: `tests/liveEvents.test.tsx` — 본인 신호 후 재조회·구독 해제·실패 시 stale 결과 제거.
- 작성/미실행: `scripts/test-capacity-race.mjs` — 실제 서로 다른 두 사용자가 정원 1명 행사에 동시에 신청. 성공 1개/정원 오류 1개와 최종 count=1을 확인한 뒤 성공 신청을 취소한다. 비어 있고 조회 가능한 테스트 행사, VITE 설정, TEST_EVENT_ID, TEST_TOKEN_A/B가 필요하다. 폐기 가능한 staging에서만 실행한다.
- 전체 빌드·React 테스트·SQL 적용·실제 Realtime/Storage 테스트는 npm registry 접근 제한과 DB 미연결로 실행하지 못했다. 배포 전에 반드시 수행해야 한다.

수동 인수 테스트:

1. seed SQL과 이미지 업로더를 두 번 실행 → 행사 4개, source_key 중복 없음, 이미지 연결된 파일 재업로드 없음.
2. A가 행사 생성 → B의 해당 피드에 자동 반영. B가 조건에 맞지 않으면 보이지 않음. Organizer로 전환해도 동일.
3. A가 내용/시간/이미지를 수정 → B의 목록/열린 상세 갱신. 공개 대상에서 B를 제외하면 B의 상세는 unavailable.
4. B가 신청 → A와 다른 조회 가능 회원의 count 갱신, B의 다른 탭에 신청 상태 갱신. 타인의 개별 신청 정보는 반환하지 않음.
5. 외부 링크 클릭 → 앱 신청 count/본인 상태 불변. both에서도 앱 버튼을 누르기 전에는 신청 기록 없음.
6. 정원 1 행사에 두 계정 동시 신청 → 한 명만 성공. 취소 후 다른 회원이 신청 가능.
7. 동일 작성 폼에서 응답 실패 후 재시도 → 신규 행사 중복 생성 안 됨. 수정 충돌 시 최신 내용을 자동 덮어쓰지 않음.
8. 로그아웃/재접속/WebSocket 단절·복구/프로필 audience 값 변경을 확인.

리뷰·채팅·Organizer 요청의 실제 DB UI 연결은 별도 단계다. 실제 행사에 샘플 리뷰나 자동 응답을 합치지 않는다. 채널 선택은 저장하지만 실제 이메일/Slack/캘린더 전송을 실행하지 않는다.
