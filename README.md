# Common Ground — React 협업용 프로젝트

`Prototype_1109.html`을 **React + TypeScript + Vite**로 전환한 프론트엔드 프로젝트입니다.
iframe, `innerHTML`, HTML 파일 임베드 방식이 아니라 실제 JSX 컴포넌트와 React 상태로 작동합니다.
화면의 모든 문구는 영어이며, 실행·협업 안내는 한국어로 제공합니다.

## 1. 처음 실행하기 (Windows / PowerShell)

1. ZIP을 압축 해제합니다.
2. VS Code의 **File → Open Folder**로 `common-ground-react` 폴더를 엽니다.
3. **Terminal → New Terminal**을 엽니다. `package.json`이 보이는 폴더에서 아래 명령을 실행합니다.

```powershell
npm install
npm run dev
```

터미널에 표시된 `http://localhost:5173/` 등의 주소를 엽니다.
Node.js **22.12 이상**의 지원되는 LTS 버전을 권장합니다.
PowerShell이 `npm.ps1` 실행을 차단하면 `npm.cmd install`, `npm.cmd run dev`를 사용합니다.

첫 실행은 **미등록 + Member + Social Events**입니다. 기존 HTML의 저장 정보는 가져오지 않습니다.
등록 후에는 같은 브라우저와 같은 접속 주소에서 상태가 유지됩니다.
처음 상태로 돌아가려면 상단의 **Reset demo → Reset demo data**를 누르세요.

## 2. 이미 만든 Vite 프로젝트에 넣기

가장 간단한 방법은 이 폴더 자체를 새 프로젝트로 실행하는 것입니다.
기존 공동 Git 저장소를 사용하려면:

1. 기존 프로젝트 변경 사항을 먼저 커밋하거나 백업합니다.
2. `git switch -c feat/react-migration`으로 작업 브랜치를 만듭니다.
3. 이 프로젝트의 `src` 폴더와 `index.html`, `package.json`, 설정 파일들, `tests`, 문서를 기존 프로젝트 루트에 복사합니다. 기존 템플릿용 `src`는 이 버전으로 교체합니다.
4. 기존 `.git` 폴더는 유지하고, 다른 프로젝트의 `node_modules`나 `dist`는 복사하지 않습니다.
5. `npm install`을 실행해 의존성과 `package-lock.json`을 갱신합니다.
6. `npm run build`, `npm test`로 확인한 뒤 변경 파일을 커밋합니다.

이 제공본에는 잠금 파일이 없습니다. 첫 `npm install` 후 생성되는 `package-lock.json`을 Git에 함께 올리세요.
그다음부터 동료는 저장소를 내려받아 `npm ci`로 같은 버전을 설치할 수 있습니다.

## 3. 디자이너/프론트 담당자가 수정할 곳

| 위치 | 책임 |
| --- | --- |
| `src/styles/app.css` | 기존 테마, 색상, 글꼴, 간격, 휴대폰 레이아웃 |
| `src/components/` | 카드·아바타·아이콘·내비게이션·입력 부품 |
| `src/pages/` | 화면별 JSX와 폼 상태 |
| `src/App.tsx` | 화면 전환과 전체 프레임 |
| `src/data/config.ts` | 탭·이벤트 유형·온보딩 관심 분야 이름 |

### 공통 부품

- `EventCard.tsx`: 피드의 카드 모양
- `EventArtwork.tsx`: 이벤트 상단의 이미지 대신 쓰는 아트 영역
- `Avatar.tsx`: 클릭 가능한 프로필 이미지
- `BottomNav.tsx`: 하단 3개 탭
- `AudiencePicker.tsx`: 공개 대상 조건 선택
- `PhotoPicker.tsx`: 프로필·후기 사진 선택/미리보기
- `Icon.tsx`: 기존 SVG를 React SVG로 옮긴 아이콘
- `ResetDialog.tsx`: 데모 초기화 확인 창

UI를 바꿀 때는 가능한 한 이 파일들만 수정하고, 데이터 형식과 공개 조건은 아래 계층에서 관리하세요.

## 4. 기능/데이터 담당자가 수정할 곳

| 위치 | 책임 |
| --- | --- |
| `src/types/index.ts` | 프로필·이벤트·후기·공개 조건의 TypeScript 형식 |
| `src/context/CommunityProvider.tsx` | 앱 공통 데이터와 등록·작성·참여·후기 작업 |
| `src/context/CommunityContext.ts` | 페이지에서 사용하는 `useCommunity()` 계약 |
| `src/services/localRepository.ts` | 브라우저 저장/조회/초기화·저장 데이터 검증 |
| `src/services/eventRules.ts` | 공개 대상 매칭, 작성 검증, 주최자 제한 |
| `src/services/photos.ts` | 이미지 형식·크기 검사와 압축 |
| `src/data/events.ts` | 예시 이벤트 생성 |
| `src/data/profiles.ts` | 예시 프로필과 빈 프로필 |

나중에 서버를 붙일 때는 저장소 어댑터와 Provider의 작업을 비동기 API로 교체하세요.
현재 화면은 저장소 세부 구현을 직접 호출하지 않습니다.

## 5. 유지된 기능

- 하단 3개 피드: Opportunities / Social Events / Announcements
- 연필 → 유형 선택 → 이벤트 작성 → 해당 피드 최상단 표시
- 종료된 이벤트 회색 표시 / Add a review / 사진 최대 4장 후기
- 회원 이름 필수, 소셜 링크·직업·소개·전공·관심 분야·수강 이력 선택 입력
- 프로필 사진 등록, 작성자 사진을 눌러 프로필 조회
- 수강 이력 예: Innovation Sprint 26w, Tech Challenge 25w
- 프로필에 참여 수 표시 / Join event 및 종료 후 참여 확인 / 참여 취소
- 알림 분야 중복 선택, 건너뛰기, 나중에 재설정
- 관심 분야·수강 이력·직업·전공으로 이벤트 공개 대상 선택
- 브라우저 저장 및 Reset demo

이벤트 생성 시의 사진은 요청대로 **빈 사진 안내만 표시**합니다.
프로필 사진과 후기 사진의 실제 업로드/미리보기는 구현되어 있습니다.

### 공개 조건과 참여 수의 정확한 의미

- 공개 조건은 **선택한 조건 중 하나라도 일치하면 표시(OR)**합니다.
- 자신의 글은 본인에게 표시됩니다. 다만 주최자 공지의 역할 제한은 계속 적용됩니다.
- 공개 대상과 알림 설정은 별개입니다. `Interests`는 프로필 특성이고, 온보딩의 선택은 알림 선호입니다.
- `Events joined`는 직접 참가 신청하거나 과거 참여를 확인한 고유 이벤트의 수입니다. 실제 출석을 검증한 숫자는 아닙니다.
- 예시 프로필의 참여 내역은 시연용 데이터입니다.

## 6. 현재는 백엔드 없는 체험용 앱

- 실제 계정 인증은 없습니다. Register는 로컬 프로필 등록입니다.
- `Demo role` 전환과 공개 조건은 프론트 체험용입니다. 실제 서비스에서는 서버/DB에서도 검증해야 합니다.
- 사용자끼리 데이터가 공유되지 않습니다. 각 브라우저에 별도로 저장됩니다.
- 알림 선호는 저장하지만 푸시/이메일 알림을 발송하지 않습니다.
- 저장 키는 `common-ground-react-demo-v1`입니다. 기존 HTML과 다른 키를 사용합니다.
- 사진이 많아 브라우저 저장 한도를 넘으면 현재 세션에서만 변경을 유지하고 안내를 표시합니다.
- 프론트에는 비밀번호나 서버 비밀 키를 넣지 마세요.

## 7. 개발 명령

```powershell
npm run dev
npm run build
npm run preview
npm test
npm run lint
```

| 명령 | 용도 |
| --- | --- |
| `dev` | 수정하며 개발하는 서버 |
| `build` | TypeScript 검사 후 `dist` 생성 |
| `preview` | 생성된 `dist` 로컬 확인 |
| `test` | 규칙·저장·등록·참여·후기 등 자동 테스트 |
| `lint` | ESLint 검사 |

검증 수행 범위와 환경 제한은 `VALIDATION.md`를 확인하세요.

## 8. 링크로 배포하기

`localhost`는 외부 공유 주소가 아닙니다. Git 저장소를 프론트 호스팅에 연결해서 배포하세요.
Vite를 지원하는 호스팅에서 기본 설정은:

- Install command: `npm install` (잠금 파일을 커밋한 뒤에는 `npm ci` 사용 가능)
- Build command: `npm run build`
- Output directory: `dist`

이 앱은 화면 상태로 이동하므로 `/profile` 등의 별도 서버 경로 설정은 필요 없습니다.
화면 이동은 주소를 바꾸지 않으며, 새로고침하면 기본 피드로 돌아갑니다. 저장 데이터는 유지됩니다.
하위 경로에 배포한다면 `vite.config.ts`의 `base`를 배포 경로에 맞게 설정하세요.

## 9. Git 협업

권장 분담:

- 기능 담당: `types`, `services`, `context`, 데이터 테스트
- 디자인 담당: `styles`, `components`, `pages`의 JSX

같은 화면에서 폼 로직과 레이아웃을 동시에 바꾸면 충돌할 수 있으므로 작업 파일을 먼저 나누세요.
`main`에 직접 같이 쓰기보다 각자 브랜치에서 작업하고 PR로 합치는 방식이 좋습니다.
`node_modules`, `dist`는 커밋하지 않고, `package-lock.json`은 커밋합니다.

## 10. 기능 확인 순서

1. Register → 이름/수강 이력/관심 분야 입력 → Continue
2. Workshop, Robotics, Party 등 여러 항목 선택 → Finish registration
3. 본인 아바타 → 프로필 내용과 수강 이력 확인
4. Coffee 이벤트 → Join event → 프로필의 Events joined 증가 확인
5. 연필 → 이벤트 작성 → 공개 대상 조건 선택 → 해당 피드 최상단 확인
6. 회색 Alumni Autumn Social → Add a review → 글/사진 등록
7. Announcements → Member 잠금 확인 → Demo role을 Organizer로 전환
8. Reset demo → 미등록 상태로 복원
