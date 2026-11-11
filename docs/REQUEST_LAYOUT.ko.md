# 보낸 문의 표시 수정

첨부 common-ground (2).zip 기준으로 변경했습니다.

기존 프로젝트에 아래 파일을 같은 경로로 덮어쓰세요.
- src/components/LiveRequests.tsx
- src/services/organizerLive.ts
- src/styles/v3.css
- tests/organizerLive.node.test.mjs (테스트)

날짜는 카드 안쪽 좌우 12px, 아래 12px 여백으로 표시됩니다.
Delivered는 연한 파란 배경(#dbeafe)에 진한 남색 글자(#1e3a8a)로 표시됩니다. 다른 상태도 헤더 색상 규칙의 영향을 받지 않도록 수정했습니다.
Sent requests는 서버에서 최신순으로 2개씩 조회하며 ← Previous / Next → 버튼으로 이동합니다. 3건이면 1페이지에 2건, 2페이지에 1건입니다. 한 페이지뿐이면 양쪽 버튼이 비활성화됩니다. 받은 문의는 기존 20건씩 표시됩니다.

SQL이나 환경변수 추가 설정은 없습니다. 기존 .env.local은 그대로 유지하세요.
복사 후 npm run build를 실행하고 Git에 push하면 Vercel 재배포에 반영됩니다. Android는 npm run android:sync 후 재빌드하세요.

검증: Node 테스트 84개 통과. 보낸 문의의 페이지별 조회 범위(0–1, 2–3, 4–5)를 mock 테스트로 확인했습니다. 실제 Supabase/브라우저 화면은 실행하지 않았습니다. 빌드는 tsc 미설치로 실행하지 못했습니다.
