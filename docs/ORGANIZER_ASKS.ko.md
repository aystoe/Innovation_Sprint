# Organizer Ask / Find people 적용

첨부 common-ground(1).zip을 기준으로 작성했습니다. 디자인 클래스와 Member/Organizer 전환은 유지합니다.

## 적용 순서
1. 기존 프로젝트를 백업합니다. 아래 변경 파일을 같은 경로에 복사합니다. 최신 로컬 OrganizerPage에 별도 수정(통계/Slack 등)이 있다면 해당 변경을 병합하세요.
2. Supabase SQL Editor → New query에서 `supabase/migrations/202611120001_organizer_requests_live.sql` 전체를 실행합니다. 기존 migration 001~008을 다시 실행하지 않습니다. 기존 organizer_requests와 respond_to_organizer_request 함수가 있어야 합니다.
3. 프로젝트 폴더에서 `npm ci`, `npm run typecheck`, `npm run test:unit`, `npm run build`를 실행합니다.
4. Git에 변경 파일을 push하면 Vercel에서 재배포합니다. Android도 적용하려면 `npm run android:sync` 후 다시 빌드/설치합니다.
5. `.env.local`은 기존 파일을 유지합니다. 새 환경변수나 비밀 키는 필요 없습니다.

## 변경 파일
- src/pages/OrganizerPage.tsx
- src/components/MemberRequests.tsx
- src/components/LiveRequests.tsx (신규)
- src/services/organizerLive.ts (신규)
- src/services/organizerValidation.ts (신규)
- supabase/migrations/202611120001_organizer_requests_live.sql (신규)
- supabase/diagnostics/test_organizer_requests.sql (신규, 테스트 전용)
- tests/organizerValidation.node.test.mjs, tests/organizerLive.node.test.mjs (신규)

## 동작
- Find people: 실제 profiles 중 green/yellow 전부를 20명씩 표시합니다. 회색은 서버 조회에서 제외합니다. Anything + 빈 이름 + founder 필터 해제로 전체 대상을 볼 수 있습니다. 이름 검색은 300ms 지연 후 실행하며 Results는 다시 조회합니다.
- Open to는 해당 활동을 선택한 회원만 표시합니다. Founder는 현재 별도 founder 필드가 없으므로 occupation에 founder가 포함된 회원을 찾습니다.
- 본인 또는 Open to 미선택 회원은 목록에 표시하지만 Ask는 비활성입니다. 문의 종류 수신 동의를 임의로 확대하지 않습니다.
- Ask → 제목/내용 입력 → Send request: 실제 사용자 UUID로 DB에 저장합니다. 계정의 프로필 등록이 먼저 완료돼야 합니다.
- 수신자: Member → Chatting → Received requests에서 Yes/Not this time으로 답변합니다. Organizer → Asks에서도 받은 문의를 볼 수 있습니다.
- 발신자: Organizer → Asks → Sent requests에서 상태 확인. 샘플 응답 조작 UI는 제거했습니다.
- 문의는 앱 내부 전달이며 이메일/Slack/푸시 알림은 발송하지 않습니다.
- 문의함은 화면을 보는 동안 15초마다, 창 포커스/앱 복귀 시 갱신합니다. Supabase Realtime publication 설정은 추가로 필요 없습니다.
- 전송 중 중복 클릭 차단, 실패 시 내용 보존/재시도. 한 작성 창의 요청 ID는 재사용하고 DB의 (sender_id, client_request_id) unique index로 중복 저장을 막습니다. 재시도 시 같은 내용을 유지하며 새 내용을 쓰려면 창을 닫고 다시 엽니다.
- 로그아웃/화면 이탈 시 조회를 중단하고 타이머와 이벤트 리스너를 제거합니다. 세션별 요청 목록은 localStorage에 저장하지 않습니다.
- 접근 통제는 기존 발신자/수신자 RLS 및 수신자 전용 응답 RPC를 사용합니다. Organizer 화면 전환은 권한을 부여하지 않습니다. 새 정책은 self-request도 차단합니다.

## 확인 방법
1. A와 B 계정을 각각 다른 브라우저/시크릿 창에서 로그인합니다. B 프로필의 contact를 green/yellow, Open to를 Mentor로 저장합니다.
2. A → Organizer → Find people → B 이름 검색 → Ask → Mentor 문의 전송.
3. A Asks에 저장됐는지, 새로고침 후에도 남아 있는지 확인합니다.
4. B → Member → Chatting → Received requests에서 문의 확인 → Yes. A에서 15초 이내 또는 창을 다시 포커스했을 때 Yes 확인.
5. B를 gray로 바꾸고 Results 클릭: B가 목록에서 제외되는지 확인합니다. 이미 받은 문의는 여전히 수신함에서 확인할 수 있습니다.
6. 21명 이상 등록된 테스트 프로젝트에서 Next/Previous로 전체 대상이 조회되는지 확인합니다.
7. 네트워크를 끈 뒤 전송 시 오류와 내용 보존, 재연결 후 재시도 시 문의가 1개만 저장되는지 확인합니다.
8. 로그아웃 후 C 계정으로 로그인: A/B의 문의가 표시되지 않아야 합니다.
9. 별도 테스트 프로젝트에서 `supabase/diagnostics/test_organizer_requests.sql`의 A/B/C UUID를 실제 프로필 UUID 3개로 바꾸고 실행합니다. 권한 위조·제3자 조회/응답·중복·회색·활동 미동의 차단을 검사하고 rollback합니다. 오류 발생 시 `rollback;`을 실행하세요. UUID/동의값을 운영 데이터에서 임의로 변경하지 마세요.

## 검증 결과
- 실제 실행: Node 테스트 83개 통과(기존 75 + 입력 검증 3 + 서비스 mock 테스트 5). 서비스 테스트는 검색/페이지 범위, 수신함 대상, 중복 전송 재시도, 오류 전파를 검사합니다. 실제 DB 통합 테스트는 아닙니다.
- 미실행: 실제 Supabase SQL 적용, 3계정 RLS 테스트, 브라우저 UI/네트워크 실패 재시도, Android.
- 타입 검사: tsc 미설치로 실행 불가. npm ci는 패키지 다운로드 HTTP 403으로 실패했습니다. 전체 빌드 성공은 확인하지 못했습니다.
- DB 권한 테스트 SQL은 작성했으나 실행하지 않았습니다.
