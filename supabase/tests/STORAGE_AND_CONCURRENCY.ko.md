# Storage API / 동시성 인수 테스트

폐기 가능한 별도 Supabase 프로젝트에서 실제 Auth 사용자 A(작성자), B(조건 일치), C(조건 불일치)를 만든다. 각 사용자 이메일은 서로 다르게 설정한다. A는 interests=Art, B는 interests=Robotics, C는 interests=Art. 모두 profiles를 만든다. 별도의 로그인 세션/클라이언트를 사용하고 service-role key로 테스트하지 않는다.

기본 SQL 테스트는 `permissions.sql`. 해당 테스트는 transaction 안에서 Auth UUID/JWT claim을 모사하고 `SET LOCAL ROLE authenticated/anon`으로 실제 RLS를 검사한다. UI/API 인증 구현 자체와 Storage 바이트 처리 검증은 아래 절차로 보완한다. SQL에서 Storage metadata를 조작하는 것은 테스트 전용이며 운영 파일 관리는 Storage API만 사용한다.

## 이미지 테스트 행렬

A가 interests=Robotics 대상 행사 E를 만들고, 이후 종료된 행사 R도 만든다. UUID를 각 세션에서 공유하여 경로를 추측한 공격도 검증한다. 서버가 불허하는 쓰기는 400/401/403 등 비-2xx여야 하며, 필터된 조회/목록은 0행일 수도 있다. HTTP 코드 하나만 고정해 성공 여부를 판단하지 않는다.

| 실행자/동작 | 예상 결과 |
| --- | --- |
| A가 event-images의 `A/E/<uuid>.png` 업로드 → events.image_path 연결 | 성공, owner_id=A |
| B가 동일 경로 download/createSignedUrl | 성공 |
| C가 동일 경로 download/createSignedUrl | 거부 |
| C가 Organizer UI로 전환 후 동일 요청 | 여전히 거부 |
| 미로그인 클라이언트가 public URL 또는 authenticated download | 거부. 버킷은 public=false |
| B가 A 경로에 upload/upsert/remove/move/copy로 기존 파일 덮어쓰기 시도 | 거부, 기존 파일 hash 동일 |
| B가 `B/E/...`에 행사 이미지 업로드 | 거부: E의 작성자가 아님 |
| A가 새 `A/E/...` 경로 업로드 → DB image_path 교체 → 이전 파일 remove | 성공. 이전 경로는 다른 회원이 접근 못 함 |
| A가 자기 경로를 B prefix로 move | 거부 |
| A/B가 타인의 UUID를 owner_id로 지정하는 SQL 우회 시도 | RLS 거부; 일반 SDK에 owner_id 입력 기능을 만들지 않음 |
| B가 avatars `B/<uuid>.png` 업로드 → profiles.photo_path 연결 | 성공. A/C 조회 가능, 타인 교체/삭제 거부 |
| B가 종료된 공개 행사 R의 review-images `B/R/<uuid>.png` 업로드 → 리뷰 연결 | 성공 |
| B가 진행 중 행사 E의 리뷰 이미지 업로드 | 거부 |
| A가 R을 targeted Robotics로 변경 | C의 리뷰와 이미지 접근 거부. B는 유지 |
| A가 B의 리뷰 이미지 삭제/교체 | 거부: 행사 작성자도 리뷰 이미지 소유자가 아님 |
| B가 자신의 리뷰 이미지 삭제 | 성공 |
| 이미지 5/10 MiB 초과 파일 업로드 | 버킷 제한으로 거부 |
| image/svg+xml, text/html 파일 업로드 | MIME 제한으로 거부 |
| 연결하지 않은 파일 업로드 후 다른 사용자 조회 | 거부; 소유자만 읽고 정리 가능 |

파일 바이트를 다운로드해 교체 전후 SHA-256을 비교한다. DB metadata를 바꾸는 SQL 테스트만으로 파일 교체가 검증되지는 않는다. upsert에는 SELECT/INSERT/UPDATE가 모두 필요한 점도 확인한다.

signed URL은 bearer token이다. B에게 60초 URL을 발급한 후 공개 범위를 바꾸었을 때 신규 발급은 거부되어야 하지만 이미 발급된 URL은 만료 전 사용될 수 있다. 이를 RLS 우회 버그와 혼동하지 않는다. 인증 download 경로에서는 새 요청부터 변경된 조건을 적용해야 한다.

Supabase 버전에 따라 storage.objects SQL 직접 DELETE를 막는 시스템 trigger가 있을 수 있다. 이 경우 SQL suite의 metadata 삭제 테스트가 실패할 수 있으므로 trigger를 끄지 말고, 소유자/비소유자의 `.remove()` HTTP 검증으로 그 항목을 대체하여 결과를 남긴다. Supabase 관리 스키마를 수정하지 않는다.

## 동시성 테스트

서로 다른 두 인증된 클라이언트 `a`, `b`로 동시에 호출한다. fresh 사용자 pair를 쓰면 생성 경합까지 확인할 수 있다.

```ts
const [x, y] = await Promise.all([
  a.rpc('get_or_create_direct_conversation', { p_other_user_id: bId }),
  b.rpc('get_or_create_direct_conversation', { p_other_user_id: aId }),
])
if (x.error || y.error || !x.data || x.data !== y.data) throw new Error('pair race failed')
// A가 조회한 해당 방의 conversation_members는 정확히 A/B 2행이어야 한다.

const registrations = await Promise.all(Array.from({ length: 10 }, () =>
  b.rpc('set_event_registration', { p_event_id: eventId, p_registered: true })
))
if (registrations.some(r => r.error)) throw new Error('registration race failed')
// B의 event_participants에서 (eventId,bId)는 정확히 1행, attended=false.
```

추가 경합: 이미 시작된 행사에서 B의 취소와 A의 출석 true를 동시에 호출한다. 행사 행 잠금으로 둘 중 하나만 먼저 반영된다. 취소가 먼저면 출석 처리는 active registration required 오류, 출석이 먼저면 취소는 recorded attendance 오류. 결과가 `cancelled + attended=true`가 되어서는 안 된다.

요청 yes 응답과 opened를 동시에 보내면 최종 상태는 yes여야 한다. 대화 생성 요청을 A→B, B→A로 각각 반복해도 방은 1개여야 한다.

## UI 연결 뒤 확인

- 로그인 A로 Member/Organizer 버튼을 여러 번 눌러도 session.user.id와 서버에서 보이는 행사 집합은 동일하다.
- 화면 전환 후 게시한 모든 행사 author_id가 A이며 created_mode만 달라진다.
- B/C가 직접 REST로 author_id/sender_id를 A로 위조하면 거부된다.
- 회원 검색의 REST 응답에 auth email, access token, 내부 Auth metadata가 없다.
- 자동 응답/Simulate sample response는 실제 서버 데이터에 작동하지 않는다.
- 신청 취소 버튼이 다른 사람의 UUID를 전송하지 않는다. RPC에는 등록 대상 UUID 입력 자체가 없다.
- 프로필 조건이 바뀌면 열린 행사 상세, 사진 캐시, 피드도 재조회한다. 이전에 다운로드한 이미지를 DB가 소급 삭제할 수는 없다.
