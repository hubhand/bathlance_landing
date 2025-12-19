# PostHog 대시보드 생성 스크립트 사용 가이드

PostHog MCP 도구가 사용 가능하지 않은 경우, 제공된 스크립트를 사용하여 대시보드를 생성할 수 있습니다.

## 전제 조건

1. Node.js가 설치되어 있어야 합니다.
2. PostHog Personal API Key가 필요합니다.
3. `.env.local` 파일에 PostHog 설정이 있어야 합니다.

## 설정 방법

### 1. PostHog Personal API Key 발급

1. [PostHog 웹사이트](https://app.posthog.com)에 로그인합니다.
2. 우측 상단의 프로필 아이콘을 클릭합니다.
3. "Personal API Keys" 메뉴를 선택합니다.
4. "Create Personal API Key" 버튼을 클릭합니다.
5. 키 이름을 입력하고 (예: "Dashboard Creation Key") 생성합니다.
6. **생성된 API Key를 복사해두세요.**

### 2. 환경 변수 설정

`.env.local` 파일에 다음 변수를 추가하세요:

```bash
POSTHOG_API_KEY=phx_your_api_key_here
POSTHOG_HOST=https://us.i.posthog.com
```

또는 환경 변수로 직접 설정할 수 있습니다:

**Windows (PowerShell):**
```powershell
$env:POSTHOG_API_KEY = "phx_your_api_key_here"
$env:POSTHOG_HOST = "https://us.i.posthog.com"
```

**macOS/Linux:**
```bash
export POSTHOG_API_KEY="phx_your_api_key_here"
export POSTHOG_HOST="https://us.i.posthog.com"
```

## 스크립트 실행

터미널에서 다음 명령어를 실행하세요:

```bash
node scripts/create-posthog-dashboard.js
```

## 생성되는 대시보드 구성

스크립트는 다음 8개의 인사이트를 포함하는 대시보드를 생성합니다:

1. **UTM Source별 전환 퍼널** - utm_source별 퍼널 분석
2. **UTM Source별 요약 테이블** - utm_source별 전환율 요약 (HogQL)
3. **UTM Medium별 전환 퍼널** - utm_medium별 퍼널 분석
4. **UTM Campaign별 전환 퍼널** - utm_campaign별 퍼널 분석
5. **섹션별 조회수** - section_viewed 이벤트 분석
6. **스크롤 깊이별 도달률** - scroll_depth 이벤트 분석
7. **시간대별 전환 추이** - form_submission_completed 이벤트 시간별 추이
8. **UTM 파라미터 조합별 성과** - utm_source + utm_medium + utm_campaign 조합 분석 (HogQL)

## 대시보드 확인

스크립트 실행 후 터미널에 출력되는 대시보드 URL로 접속하여 생성된 대시보드를 확인할 수 있습니다.

또는 PostHog 웹사이트에서 "Dashboards" 메뉴로 이동하여 "UTM 파라미터별 퍼널 전환 분석" 대시보드를 찾을 수 있습니다.

## 문제 해결

### API Key 오류

```
❌ POSTHOG_API_KEY 환경 변수가 설정되지 않았습니다.
```

**해결 방법:**
- `.env.local` 파일에 `POSTHOG_API_KEY`를 추가했는지 확인하세요.
- 또는 환경 변수로 직접 설정하세요.

### API 호출 오류

```
❌ API Error (401): Unauthorized
```

**해결 방법:**
- API Key가 올바른지 확인하세요.
- API Key에 필요한 권한이 있는지 확인하세요 (대시보드 생성, 인사이트 생성 권한 필요).

### 이벤트가 표시되지 않는 경우

대시보드가 생성되었지만 데이터가 표시되지 않는 경우:

1. **이벤트 수집 확인**: PostHog에서 실제로 이벤트가 수집되고 있는지 확인하세요.
2. **날짜 범위 확인**: 스크립트는 기본적으로 최근 30일 데이터를 조회합니다. 데이터가 있는 날짜 범위를 확인하세요.
3. **이벤트 이름 확인**: 이벤트 이름이 정확한지 확인하세요:
   - `utm_parameters_detected`
   - `section_viewed`
   - `scroll_depth`
   - `form_submission_started`
   - `form_submission_completed`

## 추가 설정

대시보드 생성 후, PostHog 웹 UI에서 다음을 설정할 수 있습니다:

1. **필터 추가**: 날짜 범위, UTM 파라미터 필터 등
2. **차트 레이아웃 조정**: 드래그 앤 드롭으로 차트 위치 변경
3. **공유 설정**: 대시보드를 팀원과 공유
4. **알림 설정**: 전환율이 특정 임계값을 넘을 때 알림 받기

## 다음 단계

대시보드가 생성된 후:

1. 데이터가 제대로 수집되고 있는지 확인하세요.
2. 전환율이 낮은 단계를 분석하세요.
3. 성과가 좋은 UTM 파라미터를 찾아 마케팅에 활용하세요.
4. 정기적으로 대시보드를 확인하여 트렌드를 파악하세요.

