> 아래는 DB 1단계의 검증 기록입니다. 인증 2단계 변경과 테스트 상태는 `docs/SUPABASE_AUTH_SETUP.ko.md`를 참고하세요.

# 검증 기록

작성일: 2026-11-10

- 완료: 첨부 ZIP의 types, provider, audience 판정, 프로필 등록, 리뷰, 채팅, Organizer 요청, localRepository, 리더보드 코드 확인.
- 완료: SQL 테이블/제약, 전 테이블 RLS, 컬럼 권한, RPC actor 검사, private 함수의 search_path/EXECUTE, Storage owner_id/경로/공개 조건의 정적 검토.
- 완료: ZIP 원본 대비 기존 파일 내용 무변경 검사. 새 파일은 supabase/ 및 docs/ 아래에만 추가.
- 제공: `permissions.sql`의 실행 가능한 권한 assertion과 rollback fixture. 신청/출석 구분, 작성자 위조, audience OR, 공지/Organizer 우회 금지, 채팅 참여자/발신자, 중복 방지, 요청 응답, Storage metadata 권한, 익명 접근을 포함한다.
- 제공: Storage HTTP 및 동시 호출 검증 절차.
- **미실행:** PostgreSQL/Supabase migration 실제 적용 및 SQL assertion 실행. 현재 실행 환경에 PostgreSQL, psql, Docker, Supabase CLI가 없고 테스트 DB 연결도 제공되지 않았다. 패키지 설치 경로도 사용할 수 없었다. 문법/런타임/권한 테스트 통과를 주장하지 않는다.
- **미실행:** 실제 Storage 업로드, 교체, 삭제, signed URL, 병렬 트랜잭션 테스트. 위 절차를 로컬 또는 격리된 Supabase에서 실행해야 한다.
- 기존 프런트 소스/의존성을 변경하지 않아 프런트 빌드/디자인 테스트는 이번 변경 검증 대상으로 실행하지 않았다.

실행 결과 기록란:

| 검증 | 결과 | 실행 환경/일자 |
| --- | --- | --- |
| 001 → 002 → 003 migration | 미실행 | |
| permissions.sql | 미실행 | |
| 실제 JWT로 REST 접근 | 미실행 | |
| Storage API 행렬 | 미실행 | |
| 두 사용자 동시 대화 생성 | 미실행 | |
| 동시 신청/출석/취소 | 미실행 | |
