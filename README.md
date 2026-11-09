## Design and Frontend

| Location | Responsibility |
| --- | --- |
| `src/styles/app.css` | Theme, colors, fonts, spacing, and mobile layout |
| `src/components/` | Reusable UI components: cards, avatars, icons, navigation, and inputs |
| `src/pages/` | Page layouts and form state |
| `src/App.tsx` | Navigation between screens and the overall app layout |
| `src/data/config.ts` | Tab labels, event types, and onboarding notification topics |

### Shared Components

| Component | Responsibility |
| --- | --- |
| `EventCard.tsx` | Event cards displayed in the feed |
| `EventArtwork.tsx` | Artwork displayed at the top of an event in place of a photo |
| `Avatar.tsx` | Clickable profile image |
| `BottomNav.tsx` | Bottom navigation with three tabs |
| `AudiencePicker.tsx` | Event audience selection |
| `PhotoPicker.tsx` | Photo selection and previews for profiles and reviews |
| `Icon.tsx` | SVG icons implemented as React components |
| `ResetDialog.tsx` | Demo reset confirmation dialog |

Keep UI changes within these files where possible. Manage data types, validation, and visibility rules in the functionality layer below.

## Functionality and Data

| Location | Responsibility |
| --- | --- |
| `src/types/index.ts` | TypeScript types for profiles, events, reviews, and audience conditions |
| `src/context/CommunityProvider.tsx` | Shared application state and actions for registration, event creation, participation, and reviews |
| `src/context/CommunityContext.ts` | The `useCommunity()` interface used by pages |
| `src/services/localRepository.ts` | Browser storage, loading, resetting, and validation of saved data |
| `src/services/eventRules.ts` | Audience matching, event validation, and organizer restrictions |
| `src/services/photos.ts` | Image format and size validation, and compression |
| `src/data/events.ts` | Sample event generation |
| `src/data/profiles.ts` | Sample profiles and the empty profile template |

When adding a backend, replace the storage adapter and the Provider’s actions with asynchronous API calls. Pages do not access the storage implementation directly.

## Features

### Event Feeds and Creation

- Three feeds accessible through bottom navigation:
  - **Opportunities**
  - **Social Events**
  - **Announcements**
- Create events using the pencil button and select an event type.
- Newly created events appear at the top of the corresponding feed.
- Select an event’s audience based on interests, course history, profession, or major.
- Ended events are displayed in gray.

### Reviews

- Add reviews to ended events.
- Include text and up to four photos.
- Preview selected photos before posting.

### Registration and Profiles

- A name is required during registration.
- Optional fields include social links, profession, bio, major, interests, and course history.
- Upload a profile photo.
- View a profile by clicking an author’s photo.
- Add course history entries such as `Innovation Sprint 26w` and `Tech Challenge 25w`.
- View the number of events a person has joined.

### Participation

- Join upcoming events.
- Confirm participation in past events.
- Cancel participation.
- Update the profile’s event count when participation changes.

### Notification Preferences

- Select multiple notification topics during onboarding.
- Skip notification preferences if desired.
- Update preferences later.

### Demo Storage

- Save data locally in the browser.
- Use **Reset demo** to clear the app’s saved data and return to the initial state.
- Data is not shared between users or devices.
- Notification preferences are saved, but notifications are not sent.
- Registration and organizer roles are for demonstration purposes; real authentication is not implemented.

> **Photo uploads:** Event creation displays only an empty photo placeholder and explanatory text. Photo selection and previews are implemented for profiles and reviews.   

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