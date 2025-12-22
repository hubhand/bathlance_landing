# PostHog 설정 가이드

이 문서는 Next.js 프로젝트에 PostHog 분석 도구를 설정하는 방법을 설명합니다.

## 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 환경 변수를 추가하세요:

```env
# PostHog 프로젝트 API 키 (필수)
# PostHog 대시보드 > Project Settings > Project API Key에서 확인 가능
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_project_api_key

# PostHog API 호스트 (선택)
# 기본값: https://us.i.posthog.com
# EU 리전 사용 시: https://eu.i.posthog.com
# 자체 호스팅 시: https://your-posthog-instance.com
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

## PostHog API 키 확인 방법

1. [PostHog 대시보드](https://app.posthog.com)에 로그인
2. 좌측 메뉴에서 **Project Settings** 클릭
3. **Project API Key** 섹션에서 API 키 복사
4. `.env.local` 파일의 `NEXT_PUBLIC_POSTHOG_KEY`에 붙여넣기

## Vercel 배포 시 환경 변수 설정

1. Vercel 대시보드에서 프로젝트 선택
2. **Settings** > **Environment Variables** 이동
3. 다음 변수 추가:
   - `NEXT_PUBLIC_POSTHOG_KEY`: PostHog API 키
   - `NEXT_PUBLIC_POSTHOG_HOST`: PostHog 호스트 (선택)

## 기능 확인

환경 변수를 설정한 후 개발 서버를 재시작하세요:

```bash
pnpm run dev
```

브라우저 콘솔에서 다음 메시지를 확인할 수 있습니다:

- 개발 환경: `✅ PostHog 초기화 완료`
- 프로덕션 환경: 로그 없음 (정상 동작)

## 추적되는 이벤트

### 자동 추적 이벤트

- **pageview**: 페이지 조회
- **pageleave**: 페이지 이탈

### 커스텀 이벤트

- **utm_parameters_detected**: UTM 파라미터 감지
- **section_viewed**: 섹션 조회 (화면 중앙 60% 영역 진입)
- **scroll_depth**: 스크롤 깊이 (25%, 50%, 75%, 100%)
- **form_submission_started**: 폼 제출 시작
- **form_submission_completed**: 폼 제출 완료
- **form_submission_failed**: 폼 제출 실패

## 문제 해결

### PostHog가 초기화되지 않는 경우

1. 환경 변수가 올바르게 설정되었는지 확인
2. `.env.local` 파일이 프로젝트 루트에 있는지 확인
3. 개발 서버를 재시작했는지 확인
4. 브라우저 콘솔에서 에러 메시지 확인

### 이벤트가 캡처되지 않는 경우

1. PostHog 대시보드에서 이벤트가 도착하는지 확인
2. 네트워크 탭에서 PostHog API 호출 확인
3. 브라우저 콘솔에서 에러 메시지 확인

## 추가 리소스

- [PostHog 공식 문서](https://posthog.com/docs)
- [posthog-js 라이브러리 문서](https://posthog.com/docs/integrate/client/js)
