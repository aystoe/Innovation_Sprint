> 인증 2단계 기록입니다. 이후 운영 모드·Members·프로필 상세 연결은 [SUPABASE_MEMBERS_SETUP.ko.md](SUPABASE_MEMBERS_SETUP.ko.md)를 참고하세요.

# Supabase 인증 연결 — 설정 및 인수 테스트

이 문서는 1단계 DB 문서에 이은 **2단계 현재 동작**을 설명한다. 실제 연결은 로그인/가입/세션, 본인 profiles 읽기·작성·수정, avatars 업로드·교체·삭제까지다. 화면 레이아웃과 Member/Organizer 전환 버튼은 유지한다. 두 모드는 같은 `session.user.id`를 사용한다.

## 직접 설정할 순서

1. **Supabase 프로젝트 → SQL Editor 또는 migration CLI**
   - 001, 002, 003이 아직 적용되지 않았다면 먼저 파일명 순으로 적용한다.
   - 다음으로 `supabase/migrations/202611100004_auth_domains.sql`을 적용한다.
   - 004는 이전에 만든 Auth 사용자의 현재/변경 예정 이메일이 허용 도메인이 아닌 경우 실패한다. Auth Users에서 해당 테스트 계정을 확인하고 승인된 주소로 정정하거나 불필요한 테스트 계정을 제거한 뒤 재실행한다. 스크립트가 계정을 임의로 삭제하거나 이메일을 바꾸지는 않는다.
   - `public.before_user_created_tum(jsonb)` 함수와 `auth.users`의 `common_ground_tum_email_guard` trigger가 생성된다. 앞 단계 정책을 완화하거나 `user_roles`를 만들 필요가 없다.
2. **Authentication → Sign In / Providers → Email** (대시보드 버전에 따라 Providers 아래에 표시)
   - Email provider **ON**.
   - 신규 가입 허용(Allow new users to sign up) **ON**.
   - **Confirm email OFF** 상태 유지. 가입 즉시 세션이 생겨야 한다.
   - Minimum password length **12**로 설정. 클라이언트도 가입 비밀번호 12자 이상 검사.
   - Email/password만 사용한다. Anonymous sign-ins, Phone, 외부 OAuth/SSO, Manual identity linking은 사용하지 않으므로 **OFF**로 유지한다.
   - **Secure email change는 ON 유지**해도 가입 이메일 인증 OFF와 별개다. 허용 도메인 간 이메일 변경 시 확인 메일이 생길 수 있지만, 이번 UI에는 이메일 변경 기능을 제공하지 않는다. 도메인 외 변경은 설정에 관계없이 DB trigger에서 차단된다.
3. **Authentication → Hooks → Before User Created**
   - PostgreSQL Function 유형을 선택한다.
   - schema `public`, function **`before_user_created_tum`**을 선택하고 활성화/저장한다.
   - URI가 필요한 환경은 `pg-functions://postgres/public/before_user_created_tum`.
   - 함수 생성만으로 Hook이 켜지는 것은 아니다. 반드시 여기서 활성화해야 한다.
   - Migration에서 `supabase_auth_admin`만 함수 실행 권한을 갖도록 설정했다. anon/authenticated에 EXECUTE를 추가하지 않는다.
4. **Authentication → URL Configuration**
   - 로컬 Site URL: `http://localhost:5173`.
   - 배포 후 실제 HTTPS 앱 URL로 변경한다. 필요한 실제 리다이렉트 URL만 허용한다.
   - 현재는 비밀번호 로그인 + 가입 인증 OFF이므로 이메일 callback/OTP 페이지를 사용하지 않는다. `detectSessionInUrl:false`다.
5. **Project Settings → API / API Keys 또는 Connect**
   - Project URL과 **Publishable key (`sb_publishable_…`)**를 복사한다.
   - secret/service_role 키를 프런트에 넣지 않는다. 이 키는 브라우저에서 보이는 공개 설정이며 데이터 보호는 RLS가 담당한다.
   - API 노출 스키마에 `private`를 추가하지 않는다. 기존 profiles/events 등 RLS를 유지한다.
6. **프로젝트 루트에서 환경변수 설정**
   - `.env.example`을 `.env.local`로 복사한다.
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`를 입력한다.
   - 개발 서버를 재시작한다. 배포 시에도 두 환경변수를 설정하고 다시 빌드한다. Vite 환경변수는 빌드 시 반영된다.
7. **설치·실행**
   ```bash
   npm install
   npm run test
   npm run lint
   npm run build
   npm run dev
   ```
   Node **22.18+ 또는 24 LTS**를 사용한다. 순수 TS 테스트는 Node type stripping을 사용한다. 이전 최소 버전 22.12 환경에서는 테스트를 위해 업그레이드한다.
   이번 작업 환경에서 npm registry가 403으로 차단되어 lockfile을 재생성하지 못했다. 변경 전 lockfile은 새 의존성과 불일치하므로 제거했다. 처음은 **npm install**로 lockfile을 생성하고 버전 관리에 포함한다. 이후부터 `npm ci`를 사용한다. Supabase SDK는 `2.110.0`으로 고정했다.
8. **아래 인수 테스트를 수행**한다. 정상 가입이 확인되기 전 기존 서비스에 공개 배포하지 않는다. 대시보드 변경과 원격 DB 적용은 이번 산출물에서 실행하지 않았다.

로컬 Supabase CLI를 쓸 경우 `supabase init`이 만든 config.toml에 다음 항목을 병합한다(전체 파일을 덮어쓰지 말 것):

```toml
[auth]
site_url = "http://localhost:5173"
enable_signup = true
minimum_password_length = 12

[auth.email]
enable_signup = true
enable_confirmations = false
double_confirm_changes = true

[auth.hook.before_user_created]
enabled = true
uri = "pg-functions://postgres/public/before_user_created_tum"
```

## 구현된 인증 동작

- 비로그인 상태에서는 로그인/가입 화면을 보여주며 앱 내부 페이지를 마운트하지 않는다. 설정 누락 시 설정 안내를 보여주고 가짜 세션이나 localStorage 데모 로그인으로 우회하지 않는다.
- 앞뒤 공백 제거·소문자 변환 후 정확히 `tum.de` / `mytum.de`만 허용한다. 하위 도메인, 유사 suffix, 복수 @ 등은 거부한다. 프런트 검사는 사용성용, Hook과 trigger는 직접 API 요청까지 방어한다.
- **앱 전용 비밀번호**를 사용한다. TUM SSO나 학교 비밀번호 인증이 아니다. 비밀번호는 Supabase Auth에만 전송하고 프로필, localStorage 데모, 로그에는 저장하지 않는다.
- 가입 성공 시 바로 인증된 세션 → profiles 조회 → 없으면 기존 2단계 프로필 작성. 프로필을 중간에 작성하다 새로고침하면 미저장 상태에서 다시 시작한다. 이미 저장한 프로필은 다시 불러온다.
- 프로필 조회 장애를 “프로필 없음”으로 간주하지 않는다. 오류/재시도 화면으로 구분해 잘못된 덮어쓰기를 방지한다. 비동기 프로필 저장 성공 전 완료 화면으로 이동하지 않는다.
- SDK `persistSession:true`, `autoRefreshToken:true`. 새로고침 시 저장된 세션을 복원한 뒤 `getUser()`로 확인한다. 로그인 토큰 저장은 Supabase SDK가 관리한다.
- `onAuthStateChange`를 구독하고 unmount에서 해제한다. callback 내부에서 다른 Auth 요청을 기다리지 않는다.
- 토큰 만료 시점 timer, 포커스/온라인 복귀, 30초 확인으로 만료된 상태에서 앱을 계속 사용하지 못하게 한다. 유효한 refresh token이면 갱신하고, 폐기/만료된 인증이면 로그인으로 복귀한다. 네트워크 장애는 토큰을 지우지 않고 앱을 잠시 가리고 재시도한다.
- 로그아웃은 현재 브라우저 세션(`scope:'local'`)을 종료한다. 다른 기기를 모두 로그아웃시키지는 않는다. 같은 브라우저의 다른 탭은 SDK 이벤트로 로그아웃 상태를 반영한다. 요청 실패 시 성공했다고 표시하지 않는다.
- 로그인 계정 UUID를 key로 커뮤니티 상태를 마운트한다. 로그아웃/계정 변경 시 프로필·사진·채팅 초안·화면 상태를 폐기하고 늦게 도착한 이전 사용자 요청을 반영하지 않는다.
- Member/Organizer 버튼은 로컬 `role` 화면 상태만 변경한다. Auth 토큰/로그인 계정/서버 권한은 변경하지 않는다. 기존 계정 ID `'me'` 비교는 UUID로 변경했다. 채팅 말풍선의 `'me'/'them'`은 방향 표시용 값이며 계정 ID가 아니다.
- 사용자 이메일은 자기 로그인 폼/세션에만 존재하고 `public.profiles`에 저장하지 않는다. 회원 검색 결과에는 포함하지 않는다.

**이메일 인증 OFF의 의미:** 이 구현은 입력한 이메일의 도메인을 제한하지만, 그 메일함 소유권이나 실제 TUM 소속을 인증하지 않는다. 사용자가 요청한 데모 설정대로 확인 메일을 보내지 않는다.

## 이메일 변경 우회 차단

Before User Created Hook은 가입 때만 동작한다. `auth.updateUser({email: ...})`에는 실행되지 않으므로 별도 DB trigger가 다음을 검사한다.

- `auth.users.email` INSERT/UPDATE: 현재 이메일 도메인.
- `auth.users.email_change` INSERT/UPDATE: 대기 중인 변경 이메일 도메인. 빈 문자열/null로 대기를 해제하는 것은 허용.
- 외부 도메인으로 즉시 변경하거나, 확인 대기 상태에 넣는 것 모두 실패한다. Hook을 우회한 직접 가입도 INSERT trigger에서 거부한다.
- UI에서 이메일 변경을 숨긴 것에 의존하지 않는다. 브라우저 콘솔에서 직접 호출해도 DB에서 거부한다.
- 기존 불허 도메인 사용자가 있으면 migration을 중단하여 처리할 대상을 먼저 드러낸다.

Auth 관리 스키마에 trigger를 추가하므로 Supabase 업그레이드 후 아래 가입/변경 테스트를 다시 실행한다. soft-delete 등 이메일을 익명 값으로 바꾸는 관리자 작업도 제한에 걸릴 수 있다. 회원 탈퇴/익명화 기능은 앞 단계와 마찬가지로 별도 보존 정책을 정한 뒤 구현한다. 일반 앱 역할이 trigger를 비활성화할 수는 없다.

## 프로필 사진

기존 PhotoPicker의 JPEG/PNG/WebP 압축 결과를 avatars의 `<본인 UUID>/<새 UUID>.<ext>`에 업로드한다. DB에는 `photo_path`만 저장한다. 읽기는 인증된 Storage download로 처리하고 표시용 데이터는 메모리에 둔다. 갱신된 경로 저장 후 이전 사진을 삭제하며, DB 저장 실패 시 새 업로드를 정리한다. 이전 파일 삭제 실패는 프로필 저장 성공과 분리해 경고한다. cleanup 재시도 작업은 후속 서버 기능이다.

프로필 업데이트는 명시적 UPDATE이며 id/created_at을 재작성하는 upsert를 쓰지 않는다. 앞 단계 컬럼 권한과 맞춘다. 신청/출석 배열은 profiles에 전송하지 않는다.

## 실제 데이터와 남아 있는 데모

| 항목 | 현재 저장 위치 |
| --- | --- |
| 가입·비밀번호·이메일·로그인 세션 | Supabase Auth |
| 본인 프로필·연락 선호·관심사 | Supabase public.profiles |
| 본인 프로필 사진 | Supabase private avatars |
| 행사·참여·리뷰·채팅·Organizer 요청 | 이번 로그인 세션 메모리의 명시적 데모 데이터 |
| 자동 응답·샘플 통계·타인 응답 시뮬레이터 | 위 데모 데이터에만 적용; 서버 요청 없음 |

상단에 실제/데모 구분을 표시한다. 데모 데이터는 새로고침·로그아웃 시 초기화하며 이전 공용 localStorage snapshot을 읽거나 실데이터로 자동 이관하지 않는다. Reset demo는 계정/실제 프로필을 지우지 않는다. 로그인 사용자 작성 데모 행사 authorId와 신규 요청 senderId에도 실제 UUID를 사용한다. 화면의 Carl 인사/작성 서명은 본인 프로필 이름으로 바꿨다. 샘플 수신 요청의 Carl은 샘플 발신자이다.

행사·채팅·요청의 실제 DB adapter 연결은 다음 단계이며, 이번 인증 변경이 그 데이터들을 서버로 저장한다고 표시하지 않는다. 현재 Member/Organizer 화면은 유지하고, 기존의 Organizer/공지 audience 우회 분기는 프런트에서도 제거했다.

## 테스트

실행 완료: `npm run test:unit`에 해당하는 Node 테스트 **22개 통과**(허용/불허 도메인 20개, 세션 오류 분류 2개).

작성했으나 현재 환경에서 미실행:

- `tests/auth.test.tsx`: 저장 세션 검증, 계정 전환 중 응답 경합, 다른 탭 로그아웃, 네트워크 오류 후 재시도, 불허 도메인 세션, 폐기된 refresh token.
- `supabase/tests/auth_domains.sql`: Hook 실행 권한, 정확한 도메인, 직접 INSERT와 현재/대기 이메일 변경 차단, 허용 도메인 간 변경. 트랜잭션 후 rollback.
- 이전 `permissions.sql`: fixture 이메일을 `@tum.de`로 맞췄다. 004 이후에도 실행하도록 변경.
- 전체 `npm run build` / `npm run lint` / React 테스트 / 실제 Auth 및 Storage 통합 검증: 설치 가능한 npm 의존성과 Supabase 프로젝트가 필요하다. 현재 환경에서는 registry 403 및 DB 미연결로 실행하지 못했다.

수동 인수 테스트 순서:

1. `a@tum.de`, `b@mytum.de`로 각기 다른 앱 비밀번호로 가입 → 확인 이메일 없이 세션 생성 → 프로필 작성 화면.
2. 프로필 저장 → 새로고침 → 같은 UUID/프로필 복원. 두 모드 전환 중 `session.user.id` 불변.
3. 프로필 사진 업로드/교체/삭제 → 새로고침 후 반영. 다른 사용자 경로 업로드/삭제는 실패.
4. 로그아웃 → 로그인 폼. 다른 계정 로그인 시 앞 사용자 프로필/초안이 잠깐이라도 표시되지 않음.
5. 다른 탭에서 로그아웃 → 현재 탭도 로그인 화면으로 복귀.
6. 잘못된 비밀번호/이미 존재하는 이메일/네트워크 단절/프로필 DB 장애 시 오류 표시. 프로필 조회 실패로 새 프로필 작성 화면에 잘못 진입하지 않음.
7. 테스트 환경에서 JWT 만료를 짧게 설정하고 자동 갱신 확인. refresh token 폐기 시 로그인 복귀. 단순 오프라인은 토큰을 삭제하지 않고 재시도.
8. 프런트 우회: 별도 테스트 클라이언트로 `signUp({email:'a@gmail.com',password:...})` 및 `a@tum.de.evil.com` → 실패. Auth Users에 생성되지 않아야 함.
9. 정상 로그인 후 `auth.updateUser({email:'a@gmail.com'})` → 실패. SQL Editor에서 해당 UUID의 email 및 email_change가 외부 도메인으로 바뀌지 않았는지 확인.
10. Hook OFF 상태의 격리 테스트에서도 불허 가입은 DB trigger로 차단되어야 함. 확인 후 Hook을 다시 ON으로 복구.
11. Confirm email을 실수로 ON으로 바꾸면 세션 없음 안내가 나오며 앱 내부로 들어가지 못해야 함. OFF로 복구. 기존 미인증 테스트 계정은 Auth Users에서 별도 처리.

참고 공식 문서: [Before User Created](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook), [Hook 권한](https://supabase.com/docs/guides/auth/auth-hooks), [비밀번호 인증](https://supabase.com/docs/guides/auth/passwords), [로그아웃 범위](https://supabase.com/docs/guides/auth/signout), [Auth 관리 스키마](https://supabase.com/docs/guides/auth/managing-user-data).
