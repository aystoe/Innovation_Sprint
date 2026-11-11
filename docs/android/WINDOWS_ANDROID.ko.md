# Windows에서 Common Ground Android 실행·서명·업데이트

## 이번 결과와 실행 상태

Capacitor 8.5의 Android 연동 설정, App/Browser/Keyboard/Network 플러그인 연결, 기존 화면용 네이티브 레이아웃, 프로젝트 생성/동기화 스크립트, 서명·아이콘·버전 템플릿을 추가했다. 웹 디자인·Supabase 스키마/RLS·Member/Organizer 전환은 유지한다.

**이 ZIP에는 빌드된 APK, 생성된 android/ 프로젝트, dist가 아직 없다.** 이 작업 환경의 npm 접근이 HTTP 403으로 막혀 Capacitor CLI/플러그인을 설치할 수 없었다. 아래 `android:init`이 Windows에서 공식 CLI로 android/와 Gradle wrapper를 생성한다. 검증하지 않은 wrapper 바이너리나 가짜 dist를 넣지 않았다.

로컬 Node 테스트는 **66개 통과**했다(기존 55 + Android 경로·설정·복귀 11). TypeScript 비-TSX/스크립트 구문 검사는 수행했다. 전체 타입 검사·Vite 빌드·Android Gradle 빌드·에뮬레이터·실기기 검증은 미실행이다. 이 문서는 성공한 APK 배포 보고서가 아니라 실행 가능한 프로젝트 구성과 PC 작업 절차다.

## Windows 준비

1. Node.js 22.18 이상 설치(프로젝트 요구사항). PowerShell에서 `node --version`, `npm --version` 확인.
2. Android Studio Otter 2025.2.1 이상 설치. Android SDK Platform 36, Build Tools, Platform Tools, Command-line Tools 설치. 에뮬레이터용 API 36 이미지도 설치하면 편하다.
3. Android Studio → Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK는 Android Studio 내장 JDK 21 계열을 사용한다. CLI JAVA_HOME도 같은 JDK로 맞춘다. 생성된 Capacitor Gradle wrapper가 지정한 버전을 사용하고 시스템 Gradle을 따로 혼용하지 않는다.
4. 프로젝트를 예를 들어 `C:\dev\common-ground`에 풀고 해당 폴더에서 작업한다.

```powershell
Set-Location C:\dev\common-ground
node --version
npm --version
npm install
Copy-Item .env.example .env.local
notepad .env.local
```

`.env.local`에 실제 프로젝트 URL과 publishable key, `VITE_DATA_MODE=production`을 입력한다. 앱 전용 비밀번호를 사용하는 기존 TUM 인증 방식을 그대로 쓴다. 서비스 키·DB 비밀번호는 VITE_ 환경변수에 넣지 않는다. Vite 값은 빌드 시 앱에 포함되므로 환경을 바꾸면 반드시 재빌드/동기화한다. 다른 Supabase 프로젝트로 전환하면 테스트 앱의 저장된 세션을 지우거나 로그아웃한다.

첫 설치가 성공하면 생성된 `package-lock.json`을 저장소에 커밋한다. 그 다음 PC/CI 설치는 `npm ci`를 사용한다. 현재 ZIP은 패키지를 설치하지 못해 새 의존성을 확정한 lockfile이 없다.

## 앱 ID와 이름 먼저 결정

현재 시작값:

| 항목 | 값 / 설정 파일 |
| --- | --- |
| applicationId | `org.commonground.community` |
| 표시 이름 | `Common Ground` |
| versionCode | `1` |
| versionName | `1.0.0` |
| 웹 산출물 | `dist` |

ID는 임시 시작값이며 도메인 소유권/스토어 등록 가능성을 확인한 값이 아니다. 최초 배포 전에 원하는 고유 ID를 `capacitor.config.json`과 `native/app.identity.json` 양쪽에 동일하게 입력한다. 앱 이름도 두 파일에 맞춘다. 버전은 `native/app.identity.json`을 기준으로 Gradle에 적용된다.

이미 android/를 생성한 후 ID를 바꾸려면 **출시 전** 별도 체크아웃에서 새 ID로 android:init을 실행해 새 Android 프로젝트를 만들고 기존 native 커스텀 변경을 비교한다. 생성된 폴더를 무작정 삭제하지 않는다. 출시 후 ID 변경은 기존 앱 업데이트가 아니라 다른 앱이 되므로 ID는 유지한다.

## 최초 Android 프로젝트 생성과 실행

```powershell
npm run test:unit
npm run typecheck
npm test
npm run android:init
npm run android:open
```

`android:init` 순서: Vite production build → 공식 `cap add android` → MainActivity/manifest/아이콘/버전/서명 템플릿 적용 → `cap sync android` → dist 파일과 내장 assets의 바이트 비교. 오류가 나면 이후 단계는 중단한다. typecheck 실패도 건너뛰지 않는다.

Android Studio가 열리면 Gradle Sync 완료 → Device Manager에서 에뮬레이터 시작 또는 USB 기기 선택 → app 구성의 Run을 누른다. 생성된 android/ 소스·Gradle wrapper는 커밋한다. 빌드 캐시, local.properties, 내장 생성 웹 assets, keystore는 커밋하지 않는다.

개발 서버는 실행하지 않아도 된다. `npm run dev`, `adb reverse`, PC의 5173 포트 연결은 이 실행 경로에서 필요 없다.

**localhost의 의미:** Capacitor가 WebView에 제공하는 내부 origin은 기본적으로 `https://localhost`로 보일 수 있다. 이것은 APK에 들어 있는 assets를 읽는 내부 주소이며 PC에서 띄운 Vite localhost 서버에 접속하는 것이 아니다. `server.url`은 설정하지 않았고, 패키징 검증도 이를 거부한다. 앱 UI는 내장하지만 Supabase 데이터·인증·이미지·실시간 기능에는 인터넷이 필요하다.

## 변경 반영

```powershell
npm run android:sync
npm run android:verify
npm run android:open
```

sync는 매번 build부터 실행하므로 오래된 dist를 실수로 복사하는 것을 줄인다. React 변경만 하고 Android Studio Run만 누르면 이전 assets가 설치될 수 있다. `android:verify`는 현재 dist와 Android assets의 일치 및 개발 서버 설정 부재를 확인한다. Gradle이나 실기기 테스트를 대신하지 않는다.

네이티브 기본 설정의 원본은 `native/android/`다. MainActivity, 해당 manifest 속성, cg_ 리소스는 sync 시 다시 적용된다. 수정은 원본 템플릿에 반영한다. 다른 Android 파일의 커스텀 변경은 덮어쓰지 않는다. 기본 Gradle/SDK 버전은 설치한 공식 Capacitor CLI 템플릿을 따른다.

## 실기기 USB 테스트

1. 휴대폰 개발자 옵션 → USB 디버깅 활성화. Windows에 필요한 제조사 USB 드라이버 설치.
2. USB 연결 후 휴대폰 RSA 허용 창 승인.
3. Android Studio에서 기기를 선택하고 Run. 휴대폰 Android System WebView/Chrome도 업데이트한다.
4. CLI가 필요하면:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:Path = "$env:JAVA_HOME\bin;$env:LOCALAPPDATA\Android\Sdk\platform-tools;$env:Path"
adb devices
Set-Location android
.\gradlew.bat assembleDebug
adb install -r .\app\build\outputs\apk\debug\app-debug.apk
Set-Location ..
```

경로가 다른 PC는 실제 설치 경로로 바꾼다. 모든 Vite 서버를 끈 상태·USB를 뽑은 상태에서 앱을 재실행해 UI가 뜨는지 확인한다. 인터넷 연결은 Supabase용으로 유지한다. 비행기 모드에서는 UI/네트워크 오류 안내가 표시될 수 있지만 데이터를 새로 불러올 수는 없다.

## 네이티브 동작

- **뒤로가기:** 키보드 → 열린 필터 → Reset dialog → 현재 화면의 상위 경로 순으로 처리한다. 프로필은 원래 화면, 채팅은 Chatting, 편집/리뷰는 행사 상세로 돌아간다. 작성 폼을 떠날 때 미저장 변경 확인을 표시한다. 최상위에서는 앱을 최소화하며 웹의 URL history에 의존하지 않는다.
- **안전 영역:** `viewport-fit=cover`, Capacitor SystemBars의 native inset 처리, CSS env safe-area를 함께 사용한다. WebView가 오래된 기기에서 native inset이 이미 적용되면 env는 0이므로 중복 여백을 피한다. 기존 웹용 휴대폰 프레임만 네이티브에서 제거한다.
- **키보드:** manifest adjustResize + Keyboard resizeOnFullScreen + visualViewport 높이를 반영한다. 키보드가 열리면 상단 장식/전환 영역과 하단 탭을 잠시 숨기고 메시지·입력창 공간을 확보한다. 키보드 높이를 별도 padding으로 또 더하지 않는다.
- **사진:** 기존 file input을 통해 Android 시스템 파일/이미지 선택 UI를 사용한다. JPEG/PNG/WebP, 원본 5 MiB 제한과 압축 후 Storage 업로드를 유지한다. 광범위한 저장소 접근 권한이나 카메라 권한을 추가하지 않았다. HEIC 등 미지원 형식은 오류 안내한다. 선택 취소 시 기존 사진은 유지한다. 직접 카메라 촬영용 Camera 플러그인은 추가하지 않았다.
- **외부 신청:** HTTPS 링크를 Browser Custom Tab으로 연다. 링크만 눌러도 내부 신청 상태를 바꾸는 코드는 없다. HTTP/file/javascript/intent URL은 열지 않는다. 외부 폼 완료 여부를 추정하지 않는다.
- **복귀:** 백그라운드에서 Auth 자동 갱신/Realtime 연결을 중지하고, foreground/네트워크 복구/브라우저 닫기 후 기존 Auth 검증 → 토큰 설정 → 연결 → 행사/채팅 재조회 순서로 처리한다. 저장된 순번 이후 메시지를 다시 조회한다. 로그아웃/만료 세션은 연결하지 않는다.

앱이 백그라운드에서 계속 메시지를 수신하거나 푸시를 보내는 기능은 없다. OS가 프로세스를 종료하면 저장된 서버 데이터는 재조회하지만 아직 저장하지 않은 폼/초안/이미지 선택은 복원하지 않는다. 기존 Auth 저장소를 유지하고 Android 백업·기기 이전에서 앱 데이터를 제외하도록 설정했다. 별도의 Keystore 암호화 저장소를 구현한 것은 아니다.

## 필수 기기 체크리스트

| 테스트 | 기대 결과 |
| --- | --- |
| Android 14/15/16, 노치·제스처/3버튼 내비게이션 | 헤더·탭·버튼이 시스템 바에 가리지 않음 |
| 채팅 입력·긴 메시지·가로 회전 | 입력창이 키보드 위, 목록 스크롤, 중복 발송 없음 |
| 뒤로가기 및 제스처 | 첫 동작은 키보드 닫기, 다음은 상위 화면, 루트는 최소화 |
| 갤러리/파일 선택·취소·5 MiB 초과·HEIC | 취소는 유지, 제한은 오류, 정상 업로드는 다른 계정에도 표시 |
| 외부 신청 링크·복귀 | Custom Tab, 내부 참여 count 불변, 복귀 후 데이터 갱신 |
| A/B 휴대폰 채팅, B 5분 백그라운드 | B 복귀 시 누락 조회, 중복 없음 |
| Wi-Fi→모바일, 비행기 모드→복귀 | 세션 확인/재연결, 토큰 만료면 로그인 안내 |
| 로그아웃→C 로그인 | A의 채팅 초안·메시지·구독이 남지 않음 |
| USB/PC 서버 종료 후 콜드 스타트 | 내장 UI 실행, 인터넷을 통해 Supabase 연결 |
| release APK 설치 | 개발자 디버깅 비활성, 정상 로그인·사진·신청·채팅 |
| 같은 서명으로 다음 버전 덮어쓰기 | 설치 데이터·로그인 유지, 새 UI/버전 표시 |

## 서명된 release APK — Android Studio

먼저 최신 `npm run android:sync`와 검증을 마친다. Android Studio에서:

1. Build → Generate Signed App Bundle or APK → **APK** 선택.
2. app 모듈 선택. 첫 배포라면 Create new로 프로젝트 폴더 밖에 `.jks`를 만든다. 키 alias와 비밀번호를 안전하게 보관한다.
3. release variant를 선택하고 생성한다. Studio 안내에 표시된 출력 위치의 APK를 사용한다. 보통 `android/app/release/` 또는 `android/app/build/outputs/apk/release/`다.
4. 같은 APK를 실제 기기에 설치해 위 체크리스트를 다시 수행한다.

스크립트는 서명 정보 없는 CLI release 패키징을 거부한다. Studio signing wizard가 주입하는 서명 정보는 허용한다. 배포용 키/비밀번호를 Git·ZIP·VITE_ 변수에 넣지 않는다. 키를 잃으면 기존 APK와 동일한 서명으로 업데이트할 수 없으므로 안전한 별도 백업을 유지한다.

## CLI release APK

`android/keystore.properties`를 **로컬에만** 작성한다:

```properties
storeFile=C:/private-keys/common-ground-release.jks
storePassword=YOUR_PRIVATE_STORE_PASSWORD
keyAlias=common-ground
keyPassword=YOUR_PRIVATE_KEY_PASSWORD
```

Windows properties 경로에는 `/`를 사용한다. 이 파일 대신 비밀 관리 환경에서 `CG_STORE_FILE`, `CG_STORE_PASSWORD`, `CG_KEY_ALIAS`, `CG_KEY_PASSWORD`를 주입해도 된다.

```powershell
npm run android:sync
Set-Location android
.\gradlew.bat assembleRelease
# APK: app\build\outputs\apk\release\app-release.apk
adb install -r .\app\build\outputs\apk\release\app-release.apk
Set-Location ..
```

디버그 APK와 release APK의 서명은 다르다. 같은 appId의 debug 앱이 이미 있다면 release 덮어쓰기가 거부될 수 있다. 테스트 기기에서 debug 앱 제거는 로컬 데이터도 지우므로 먼저 필요한 데이터를 확인한다. release 간 업데이트에는 기존과 동일한 서명을 사용한다. Google Play 제출이 필요할 때는 Signed App Bundle/AAB와 Play App Signing 절차를 별도로 따른다.

## 아이콘·다음 버전

아이콘은 `native/android/res/`의 시작용 파란 바탕/흰색 기하학 마크다. 앱 화면 디자인과는 별개다. `cg_launcher_foreground.xml`, `cg_colors.xml`, mipmap-anydpi(기본)/mipmap-anydpi-v26(adaptive·round) 파일을 수정한다. Android Studio Image Asset 도구를 쓰면 생성된 리소스를 이 원본 디렉터리로 옮기고 기본/adaptive 참조를 모두 맞춘다. 특히 기본 anydpi 벡터를 남겨 새 PNG를 가리지 않게 한다. 동기화 후 홈 화면·원형 마스크·테마 아이콘으로 확인한다.

업데이트 순서:

1. applicationId와 서명키는 유지. `native/app.identity.json`의 versionCode를 반드시 증가(예: 1→2), versionName 변경(예: 1.0.0→1.0.1). package.json 버전도 맞춰 기록하면 좋다.
2. 웹/네이티브 수정 및 필요한 Supabase migration을 이전 앱과 호환되도록 적용한다. 앱 업데이트와 DB 변경은 자동으로 묶이지 않는다.
3. `npm ci` → `npm run typecheck` → `npm test` → `npm run android:sync`.
4. Android Studio/CLI로 **같은 키**를 사용해 release APK 생성.
5. 기존 release 위에 `adb install -r`로 설치해 세션 유지·복귀·채팅 누락 복구 테스트. 새 버전 코드/이름은 Android 설정의 앱 정보로 확인.
6. APK와 버전·테스트 결과를 함께 보관하고 배포한다. 웹만 수정했어도 새 dist를 포함한 APK 재배포가 필요하다. 원격 live-update 서비스는 추가하지 않았다.

## 공식 참고

- 환경/버전: https://capacitorjs.com/docs/getting-started/environment-setup
- Android/SDK: https://capacitorjs.com/docs/updating/8-0
- 빌드→sync 작업 흐름: https://capacitorjs.com/docs/basics/workflow
- App 뒤로가기/상태: https://capacitorjs.com/docs/apis/app
- 안전 영역: https://capacitorjs.com/docs/apis/system-bars
- 키보드: https://capacitorjs.com/docs/apis/keyboard
- Android 서명: https://developer.android.com/studio/publish/app-signing
