> 이 문서는 DB 1단계 설계 기록입니다. 이후 인증·프로필 연결 변경 및 현재 저장 방식은 [SUPABASE_AUTH_SETUP.ko.md](SUPABASE_AUTH_SETUP.ko.md)를 참고하세요.

# Common Ground — Supabase DB 전환 1단계

이번 변경은 DB 설계·SQL migration·권한 테스트까지다. `src/`, 디자인, Member/Organizer 전환 버튼은 변경하지 않았다. 현재 앱은 여전히 localStorage 데모이며, SQL을 적용해도 자동으로 Supabase에 연결되지 않는다. 운영 프로젝트 연결이나 원격 migration 실행도 하지 않았다.

## 1. 프로젝트를 확인한 결과

| 기존 파일/기능 | 확인한 동작 | 이번 설계 |
| --- | --- | --- |
| `src/context/CommunityProvider.tsx` | `role`은 화면 상태, Organizer 작성자는 문자열 `organizer`, Member는 `me` | UI 상태는 유지. DB 작성자는 언제나 `auth.uid()` UUID. `created_mode`는 생성 당시 화면의 참고 정보뿐 |
| `src/services/eventRules.ts` | interests/courses/profession/major 중 하나가 일치하면 공개. 문자열 소문자·trim 비교, interests/courses는 쉼표/세미콜론/줄바꿈 분리 | 서버에서 동일한 OR 매칭. 작성자는 자신의 행사 조회 가능 |
| 같은 파일 `canReadEvent` | Organizer 모드와 announcement가 공개 조건을 우회 | 서버 우회 없음. announcement에도 공개 대상 적용. 다음 UI 연결 단계에서 두 early return 제거 |
| `toggleParticipation` | `attendedEventIds`를 참여 버튼으로 수정 | 신청과 출석 분리. 참여 버튼은 등록 RPC, 실제 출석은 작성자 RPC |
| `addReview`, `ReviewPage` | 종료된 접근 가능 행사에 글 또는 사진 최대 4장. 출석 증빙/별점 없음 | 동일한 리뷰 자격 유지. 작성자 UUID 추가, 본인 편집·삭제. 별점이나 출석 필수 조건을 임의로 추가하지 않음 |
| `src/services/chat.ts` | 보내면 상대방 자동 응답까지 저장 | 실제 메시지는 본인이 보낸 것만. 자동 응답 저장 금지 |
| `src/services/organizer.ts`, `OrganizerPage` | 한 번에 한 명에게 요청. gray 제외, `openTo` 일치. 샘플 응답을 발신자가 변경 가능 | 요청은 실제 발신자 UUID. 선호 조건을 DB 검사. 수신자만 응답 |
| `src/services/leaderboard.ts` | 신청 목록을 실제 출석처럼 집계 | 실제 출석/작성자 기준으로 재설계해야 하므로 실데이터 리더보드 집계는 보류 |

별도의 계정 종류, 관리자 권한, `user_roles` 테이블은 없다. 직업 문자열 `Organizer`도 일반 프로필 값이다. 누구나 로그인 후 전환 버튼으로 두 화면을 사용한다. DB는 화면 상태를 신뢰하지 않으므로 `created_mode='organizer'`, JWT의 사용자 수정 가능 metadata 등을 보내도 권한이 늘어나지 않는다. API는 두 모드에서 동일하다. 요청 생성 UI를 Organizer 화면에 두는 것은 사용자 흐름이며 보안 경계가 아니다.

## 2. 테이블과 기존 필드 매핑

| 테이블 | 키/관계 | 주요 내용 |
| --- | --- | --- |
| `profiles` | `id → auth.users.id` | name, occupation, bio, major, interests, courses, photo_path, social, social_other, topics, open_to, contact_preference |
| `events` | UUID PK, author_id → profiles | type, title, description, location, starts_at/ends_at, audience_mode/traits, topics, channel_* 의도, image_path, color/art, created_mode |
| `event_participants` | `(event_id,user_id)` 복합 PK | registration_status, registered_at/cancelled_at, attended, attendance_marked_at/by |
| `conversations` | UUID PK, 정렬된 `(user_low,user_high)` UNIQUE | 현재 UI의 1:1 대화만 지원. 두 UUID의 순서가 바뀌어도 같은 방 |
| `conversation_members` | `(conversation_id,user_id)` PK | 대화 생성 RPC가 두 행을 원자적으로 작성. 클라이언트 직접 변경 불가 |
| `messages` | UUID PK, `(conversation_id,sender_id)` FK | body, 서버 created_at. FK로도 발신자의 멤버십 보장 |
| `reviews` | UUID PK, event_id/author_id FK | body, photo_paths 최대 4개, created_at. 기존처럼 복수 리뷰 가능 |
| `organizer_requests` | UUID PK, sender_id/recipient_id FK | contribution_type, title/body, delivered/opened/yes/no, opened_at/responded_at |

- `Profile.id='me'` → `session.user.id`. `Event.authorId` → `events.author_id`. 이름은 프로필 join으로 표시한다. `Carl Meyer · Programme team`을 실제 작성자로 저장하지 않는다.
- `photo`, `image`, `Review.photos`의 base64/외부 URL 대신 비공개 Storage object 경로만 저장한다. 실제 URL은 조회 시 생성한다.
- `socialOther` → `social_other`, `openTo` → `open_to`, `contactPreference` → `contact_preference`.
- `interests`, `courses`는 기존 입력 문자열을 유지한다. `topics`는 필터/알림 관심사다. 현재 코드처럼 audience의 `interests` 판정에 `topics`를 합치지 않는다.
- `start/end` → `starts_at/ends_at` (`timestamptz`). 브라우저에서 입력 시간대와 UTC를 명시해 변환한다. 학기 집계가 필요하면 Europe/Berlin 기준을 별도 적용한다.
- `attendedEventIds`를 프로필의 쓰기 가능 배열로 만들지 않는다. 신청 화면은 `registration_status='registered'`, 출석 이력은 `attended=true`로 각각 읽는다.
- 로그인 이메일은 `auth.users`에만 있으며 회원 검색 대상 테이블/뷰/RPC에 복사하지 않는다. 사용자가 직접 공개하는 social/social_other 문자열은 별개다.
- 가입 후 명시적으로 본인의 profile을 INSERT한다. 이름 없는 빈 프로필이나 이메일 기반 이름을 자동 생성하는 Auth trigger는 두지 않았다.
- 알림 채널 선택은 `channel_digest/slack/calendar`에 보관하지만 발송 완료나 발송 권한을 뜻하지 않는다.
- 현재 요청 UI는 1명 단위이므로 요청마다 recipient 1명. 향후 다중 선택도 각각 별도 행으로 보내면 다른 수신자의 정보가 노출되지 않는다. 캠페인 단위 일괄 처리/중복 전송 방지는 후속 범위다.

## 3. RLS와 쓰기 권한

| 리소스 | 조회 | 생성 | 수정·삭제 |
| --- | --- | --- | --- |
| 프로필 | 로그인 회원 | 본인 UUID | 본인 공개 필드 수정, 직접 삭제 없음 |
| 행사 | Everyone 또는 프로필 조건 일치 또는 작성자 | 모든 로그인 회원, author_id=본인 | 작성자만. author_id/id/created_mode/created_at 변경 금지 |
| 신청/출석 | 신청자 본인 또는 행사 작성자 | 본인의 신청 RPC | 본인의 취소 RPC / 작성자의 출석 RPC, 직접 테이블 쓰기 없음 |
| 대화방/멤버 | 해당 방 참여자 | 1:1 방 생성 RPC | 직접 변경 없음 |
| 메시지 | 해당 방 참여자 | 해당 방 참여자이면서 sender_id=본인 | 편집·삭제는 이번 단계 미지원 |
| 리뷰 | 행사 조회 가능자 | 종료된 조회 가능 행사에 본인 작성 | 본인만. 행사/작성자/생성시각 변경 금지 |
| Organizer 요청 | 발신자와 해당 수신자 | 모든 로그인 회원이 본인 명의로, 수신 선호 조건 충족 | 수신자 응답 RPC만. 발신자의 본문 수정·삭제 미지원 |

RLS와 column-level GRANT를 같이 사용한다. UPDATE 정책만으로는 수정 가능한 컬럼을 제한할 수 없으므로 참가자의 직접 쓰기는 모두 차단하고, 안전한 RPC만 노출한다. `SECURITY DEFINER` 함수는 `search_path=''`, 스키마 명시, `auth.uid()` 검사, PUBLIC/anon EXECUTE 회수를 적용했다. private helper는 재귀 RLS 없이 본인의 권한을 판정하며 `private`는 Data API 노출 스키마에 추가하지 않는다. 작성 RPC는 입력으로 actor UUID를 받지 않는다. 출석 RPC의 `p_user_id`는 검사 대상 참가자이며 실행자는 항상 JWT 주체다.

출석/신청 RPC는 행사 행을 먼저 잠가 동시 신청·취소·출석 갱신을 직렬화한다. 반복 신청은 한 행으로 수렴한다. 재신청은 취소 상태를 되돌리며, 출석 기록을 직접 지우지 않는다. 출석 true 상태의 취소는 거부하고, 작성자가 오류를 false로 정정한 뒤 취소할 수 있다. 실제 출석은 행사 시작 후, 유효한 신청자에 대해서만 처리한다. 출석 시각과 처리자에는 가장 최근 정정 이력이 남는다. 변경 전체 감사 로그는 후속 기능이다.

행사 공개 범위가 바뀌어도 본인은 자신의 신청 레코드를 보고 취소할 수 있지만, 비공개가 된 행사 본문/사진을 읽지는 못한다. 작성자는 신청 명단을 볼 수 있다. 다른 회원에게 참가자 전체 명단을 공개하지 않는다.

요청의 delivered는 DB inbox 저장 완료이며 이메일 배달 확인이 아니다. opened는 수신자가 열었다고 표시한 시각이다. yes/no 이후 opened 호출은 기존 답을 보존하며, 수신자의 yes↔no 변경은 허용한다. 자기 자신에게 보내는 요청은 기존 화면과 동일하게 허용하며 본인이 발신자이자 수신자다.

**공개 대상의 의미:** 관심사/직업/전공/수강 내역은 본인이 수정하는 프로필이다. 따라서 이 조건은 커뮤니티 대상 선정이며, 검증된 재학/소속에 따른 비밀 접근 통제가 아니다. 실제 소속 검증이 필요해지면 검증된 별도 속성과 검증 절차를 추가해야 한다. UI 모드 변경 자체는 어떤 조건도 바꾸지 않는다.

## 4. Storage

| 버킷 | 공개 여부 / 크기 | 경로 | 업로드 자격 |
| --- | --- | --- | --- |
| `avatars` | private / 5 MiB | `<user UUID>/<random UUID>.webp` | 본인 prefix와 owner_id |
| `event-images` | private / 10 MiB | `<author UUID>/<event UUID>/<random UUID>.webp` | 행사 작성자 |
| `review-images` | private / 10 MiB | `<reviewer UUID>/<event UUID>/<random UUID>.webp` | 종료된 조회 가능 행사에 리뷰 작성 가능한 본인 |

JPEG/PNG/WebP만 허용한다. SVG와 원격 URL/data URL 저장은 업로드 경로로 사용하지 않는다. 파일 확장자는 권한 증명이 아니며 실제 이미지 처리/재인코딩은 프런트 연결 단계에서 구현한다.

- 업로드/교체는 JWT의 UUID와 `storage.objects.owner_id`, 경로 prefix, 행사 관계를 검사한다. 다른 소유자의 이미지가 조회 가능해도 수정·삭제할 수 없다.
- 파일 주인은 아직 연결되지 않은 업로드도 조회/삭제할 수 있다. 그 외 사용자는 profiles/events/reviews에 **실제로 연결된 경로만** 읽을 수 있다. 행사·리뷰 사진은 서버의 공개 대상 판정을 다시 거친다.
- 먼저 행사 생성 → 본인 폴더로 이미지 업로드 → 행사 `image_path` 갱신. 프로필 사진/리뷰도 업로드 후 metadata 연결한다.
- 교체는 새 UUID 경로 업로드 → metadata 성공 시 옛 경로를 Storage API로 삭제한다. metadata 갱신 실패 시 새 파일을 제거한다. 원자적 DB/Storage transaction은 없으므로 실패 재시도와 고아 파일 정리를 후속으로 구현한다.
- 동일 경로 upsert도 소유자만 가능하지만 캐시 문제 때문에 새 경로 교체를 권장한다. 다른 행에서도 참조한 파일은 참조 확인 후 삭제한다.
- 삭제는 Storage API `.remove()`로 실행한다. `storage.objects` SQL DELETE는 실제 파일 바이트 삭제 방법이 아니다. 행사/리뷰 cascade는 Storage 바이트를 자동 삭제하지 않는다. 행사 삭제 전 관련 본인 사진 정리, 다른 리뷰 작성자 사진은 소유자의 후속 정리 또는 신뢰된 서버 cleanup job을 사용한다.
- 짧은 signed URL(예: 60초) 또는 인증된 download를 사용한다. signed URL은 발급 뒤 만료 전까지 전달 가능한 bearer URL이며, 프로필/공개 범위 변경이 이미 발급된 URL과 다운로드된 파일을 소급 회수하지 않는다. 즉시 권한 재평가가 중요하면 인증 download를 사용한다.
- service-role 업로드는 owner_id가 비어 있을 수 있으므로 브라우저 업로드는 사용자 JWT로 수행한다. service-role key는 클라이언트에 절대 넣지 않는다.

## 5. 인덱스

프로필 이름 소문자 prefix 검색, contact_preference, open_to GIN, 행사 author/created_at·type/starts_at·ends_at, 신청 user/status/event, 대화 user_high 및 멤버 user/conversation, 메시지 conversation/created_at/id, 리뷰 event/created_at·author, 요청 sender/date·recipient/status/date, 이미지 참조 경로 인덱스를 추가했다. 기본 PK/UNIQUE 인덱스도 중복 방지와 FK 조회에 사용한다.

현재 이름 부분 문자열 검색(`ILIKE '%...%'`)은 기능상 가능하지만 prefix btree 인덱스를 효율적으로 사용하지 못한다. 데모 규모에서는 유지하고, 데이터 증가 시 pg_trgm 인덱스와 페이지네이션을 추가한다. audience JSON의 GIN 인덱스를 무작정 추가하지 않았다. 판정은 event PK로 찾은 1행과 내 profile 1행의 조건을 비교한다. 대규모 피드에서는 EXPLAIN 후 조건 정규화/검색 함수를 검토한다.

## 6. 적용 순서

전제: 신규 Supabase 프로젝트/PostgreSQL, Supabase Auth/Storage 기본 스키마와 authenticated/anon 역할. 기존 운영 스키마 위에 무조건 덮어쓰는 스크립트가 아니다. 같은 이름의 테이블/버킷이 있으면 먼저 충돌을 점검한다. 기존의 넓은 permissive RLS 정책은 OR로 결합되므로 반드시 점검·제거해야 한다.

1. Supabase 프로젝트를 만들고 로그인 방식을 설정한다. 이메일을 회원 검색에 제공하는 별도 View/Endpoint는 만들지 않는다. Data API 노출 스키마는 public 등 필요한 것만 사용하며 private를 추가하지 않는다.
2. Supabase CLI/Docker가 있는 로컬 환경에서 프로젝트 루트에 `supabase init`을 실행해 환경별 `config.toml`을 생성한다. 이 파일은 환경에 맞추도록 이번 전달물에는 넣지 않았다.
3. `supabase start` 후 신규 로컬 DB에 `supabase migration up --local`을 실행한다. 순서는 아래 파일명 순이다.
   - `202611100001_core.sql`: 테이블, 제약, RLS, 컬럼 권한, 기본 인덱스
   - `202611100002_commands.sql`: 신청/출석/대화 생성/요청 응답 RPC
   - `202611100003_storage.sql`: 비공개 버킷과 이미지 정책
4. `psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/permissions.sql`을 **폐기 가능한 로컬 DB**에서 실행한다. 성공은 마지막 All permission assertions passed 메시지로 확인한다. 실패하면 rollback된 연결을 종료하고 수정 후 재실행한다.
5. `supabase/tests/STORAGE_AND_CONCURRENCY.ko.md`의 HTTP/동시성 검증을 수행한다. SQL metadata 테스트는 업로드 바이트, MIME/크기, signed URL 동작을 검증하지 않는다.
6. 검증 후에만 대상 프로젝트를 `supabase link --project-ref <ref>`로 연결하고 `supabase db push --dry-run`, 검토 후 `supabase db push`를 실행한다. 이번 작업에서는 원격 연결이나 push를 하지 않았다.
7. 다음 단계에서 supabase-js 및 Auth 화면/세션 처리, repository adapter를 연결한다. UI 디자인과 전환 버튼은 그대로 두고 데이터 경로를 변경한다.

각 migration은 transaction으로 감쌌다. 중간 실패는 해당 파일을 rollback한다. 적용 완료된 DB의 복구는 백업/추가 forward migration으로 처리한다. 운영 데이터가 있는 상태에서 전체 DROP rollback은 제공하지 않는다. 로컬 데모 초기화 시에만 `supabase db reset`을 사용한다.

## 7. 후속 프런트 연결 계약

```ts
// 동일한 로그인 사용자로 두 화면을 전환한다. role은 인증 토큰/권한이 아니다.
setRole('organizer')

// profiles를 먼저 본인 UUID로 생성해야 한다.
await supabase.from('events').insert({
  ...eventColumns, author_id: session.user.id, created_mode: role,
})
await supabase.rpc('set_event_registration', { p_event_id: eventId, p_registered: true })
await supabase.rpc('set_event_attendance', {
  p_event_id: eventId, p_user_id: participantId, p_attended: true,
})
const { data: conversationId } = await supabase.rpc('get_or_create_direct_conversation', {
  p_other_user_id: personId,
})
await supabase.from('messages').insert({ conversation_id: conversationId, body: text })
await supabase.from('organizer_requests').insert({
  recipient_id: personId, contribution_type: 'Mentor', title, body,
})
await supabase.rpc('respond_to_organizer_request', { p_request_id: requestId, p_status: 'yes' })
```

실제 adapter에서는 매 호출의 `error`를 처리하고 성공 뒤 서버 값을 반영한다. 조회는 페이지네이션하고, UPDATE/DELETE가 RLS로 0행을 반환하는 경우를 성공한 변경으로 표시하지 않는다. `canReadEvent`는 표시 편의를 위한 보조일 뿐이며 서버 응답이 기준이다. 메뉴의 announcement 표시 위치는 유지 가능하지만 “Organizers only” 문구는 계정 권한을 암시하므로 후속 연결 때 “Organizer workspace” 등으로 설명을 맞춘다. 누구나 화면을 전환할 수 있기 때문이다.

## 8. 실제 데이터와 데모의 경계 / 미구현 기능

| 기능 | 이번 단계 처리 |
| --- | --- |
| 샘플 프로필/행사/리뷰/샘플 요청 | production seed 없음. src/data와 localStorage의 데모에만 유지. 실제 서버 결과와 배열 합치기 금지 |
| `'me'`, `'organizer'`, `'maya'`, `'member-03'` 등 | 실제 Auth UUID로 임의 치환 금지. 실사용자 소유권 확인 없는 자동 import 없음 |
| 기존 `attendedEventIds` | 신청인지 실제 출석인지 신뢰할 수 없음. 출석으로 자동 이관하지 않음. 검토 후 신청 후보로만 수동 이관 |
| 자동 채팅 응답/타인 요청 응답 시뮬레이터 | 실데이터 모드에서 비활성화. demo 전용 로컬 adapter에서만 유지. DB에 automated 메시지나 위조 응답 쓰기 API 없음 |
| Organizer KPI 4,812 / 71% / 312 / 38%, digest 3,417 | sample 표시 유지. 실제 통계로 저장·집계하지 않음 |
| cohort handover / QR / example URL / handovers count | 로컬 데모 전용. 실제 초대/이메일/Slack 전송 미구현 |
| digest/Slack/calendar 채널 | 설정 의도만 저장. 발송 worker, 동의 관리, 재시도/발송 이력 별도 필요 |
| 리더보드/참가자 공개 통계 | 보류. 내 출석과 작성 행사만 안전하게 집계 가능. 전체 순위를 위해 RLS를 우회하는 공개 집계 RPC를 만들지 않음 |
| Realtime/읽음 표시/푸시 | 미구현. Realtime publication 및 채널 권한은 후속 검증 후 설정 |
| 채팅 편집·삭제/그룹 대화/차단 | 미구현, DB 기본 거부 |
| 프로필 삭제/회원 탈퇴 | 클라이언트 삭제 권한 없음. 행사/메시지 보존·익명화 정책을 정한 후 신뢰된 서버에서 처리. FK가 무심코 연쇄 삭제되지 않게 제한 |
| Storage 고아 정리/전체 변경 감사 로그/요청 rate limit | 후속 서버 기능. 기본 권한과 최종 변경자만 이번 단계에 구현 |

## 9. 검증 상태와 근거

검증 결과는 `supabase/tests/VALIDATION.ko.md`에 기록했다. 실제 Supabase에 적용되었다고 간주하지 말고, 명시한 SQL 및 HTTP 테스트를 실행한 뒤 UI를 연결한다.

정책 설계 참고: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage 접근 제어](https://supabase.com/docs/guides/storage/security/access-control), [Storage owner_id](https://supabase.com/docs/guides/storage/security/ownership). RLS 적용과 별도로 테이블/함수 GRANT가 필요하며, Storage의 소유자 필드만으로 자동 권한 제한이 생기지 않아 명시적 정책을 작성했다.
