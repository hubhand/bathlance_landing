# PostHog MCP를 사용한 UTM 파라미터별 퍼널 전환 분석 대시보드 생성 가이드

이 가이드는 PostHog MCP 서버가 설정된 후, AI 어시스턴트를 통해 UTM 파라미터별 퍼널 전환 분석 대시보드를 생성하는 방법을 설명합니다.

## 전제 조건

1. PostHog MCP 서버가 설정되어 있어야 합니다. ([설정 가이드](./posthog-mcp-setup.md) 참조)
2. PostHog에 이벤트 데이터가 수집되고 있어야 합니다.
3. 다음 이벤트들이 캡처되고 있어야 합니다:
   - `utm_parameters_detected`
   - `section_viewed`
   - `scroll_depth`
   - `form_submission_started`
   - `form_submission_completed`
   - `form_submission_failed`

## 대시보드 생성 방법

### 방법 1: AI 어시스턴트에게 직접 요청

Cursor나 Claude Desktop에서 AI 어시스턴트에게 다음을 요청하세요:

```
PostHog MCP를 사용해서 "UTM 파라미터별 퍼널 전환 분석" 대시보드를 생성해줘.

대시보드에 다음 차트들을 포함해줘:
1. UTM Source별 전환 퍼널 차트
2. UTM Source별 요약 테이블
3. UTM Medium별 전환 퍼널 차트
4. UTM Campaign별 전환 퍼널 차트
5. 섹션별 조회수 차트
6. 스크롤 깊이별 도달률 차트
7. 시간대별 전환 추이 차트
8. UTM 파라미터 조합별 성과 차트 (HogQL 사용)
```

### 방법 2: 단계별 생성

각 차트를 하나씩 생성할 수도 있습니다:

```
1. UTM Source별 전환 퍼널 차트를 생성해줘
   - 퍼널 단계: utm_parameters_detected → section_viewed (section_id = "apply-form") → scroll_depth (depth = 100) → form_submission_started → form_submission_completed
   - utm_source별로 그룹화
```

## 대시보드 구성 요소 상세 설명

### 1. UTM Source별 전환 퍼널 차트

**설정:**

- 차트 타입: Funnel
- 이벤트 순서:
  1. `utm_parameters_detected` (방문자 수)
  2. `section_viewed` where `section_id = "apply-form"` (섹션 조회 수)
  3. `scroll_depth` where `depth = 100` (전체 스크롤 완료 수)
  4. `form_submission_started` (폼 제출 시작 수)
  5. `form_submission_completed` (폼 제출 완료 수)
- Breakdown: `utm_source` (이벤트 속성)
- 날짜 범위: 최근 30일 (기본값)

### 2. UTM Source별 요약 테이블

**설정:**

- 차트 타입: Table
- 데이터 소스: HogQL Query
- 쿼리:

```sql
SELECT
  properties.utm_source as utm_source,
  countIf(event = 'utm_parameters_detected') as visitors,
  countIf(event = 'section_viewed' AND properties.section_id = 'apply-form') as section_views,
  countIf(event = 'form_submission_started') as form_starts,
  countIf(event = 'form_submission_completed') as form_completions,
  round(countIf(event = 'form_submission_completed') / countIf(event = 'utm_parameters_detected') * 100, 2) as overall_conversion_rate,
  round(countIf(event = 'section_viewed' AND properties.section_id = 'apply-form') / countIf(event = 'utm_parameters_detected') * 100, 2) as section_view_rate,
  round(countIf(event = 'form_submission_completed') / countIf(event = 'form_submission_started') * 100, 2) as form_completion_rate
FROM events
WHERE timestamp >= now() - INTERVAL 30 DAY
  AND (event = 'utm_parameters_detected'
    OR (event = 'section_viewed' AND properties.section_id = 'apply-form')
    OR event = 'form_submission_started'
    OR event = 'form_submission_completed')
GROUP BY utm_source
ORDER BY overall_conversion_rate DESC
```

### 3. UTM Medium별 전환 퍼널 차트

**설정:**

- 차트 타입: Funnel
- 이벤트 순서: UTM Source별과 동일
- Breakdown: `utm_medium` (이벤트 속성)

### 4. UTM Campaign별 전환 퍼널 차트

**설정:**

- 차트 타입: Funnel
- 이벤트 순서: UTM Source별과 동일
- Breakdown: `utm_campaign` (이벤트 속성)

### 5. 섹션별 조회수 차트

**설정:**

- 차트 타입: Bar Chart
- 이벤트: `section_viewed`
- Breakdown: `section_name` (이벤트 속성)
- 정렬: 상위 10개
- 날짜 범위: 최근 30일

### 6. 스크롤 깊이별 도달률 차트

**설정:**

- 차트 타입: Bar Chart
- 이벤트: `scroll_depth`
- Breakdown: `depth` (이벤트 속성)
- 값: 고유 사용자 수
- 날짜 범위: 최근 30일

### 7. 시간대별 전환 추이 차트

**설정:**

- 차트 타입: Line Chart
- 이벤트: `form_submission_completed`
- 집계: 일별 (또는 주별, 월별)
- 날짜 범위: 최근 30일

### 8. UTM 파라미터 조합별 성과 차트

**중요**: 이 차트는 반드시 HogQL 쿼리를 사용해야 합니다. breakdownFilter에 배열을 전달하면 서버 에러가 발생합니다.

**설정:**

- 차트 타입: Table
- 데이터 소스: HogQL Query
- 쿼리:

```sql
SELECT
  concat(
    COALESCE(properties.utm_source, ''),
    ' | ',
    COALESCE(properties.utm_medium, ''),
    ' | ',
    COALESCE(properties.utm_campaign, '')
  ) as utm_combination,
  count() as submission_count
FROM events
WHERE event = 'form_submission_completed'
  AND timestamp >= now() - INTERVAL 30 DAY
GROUP BY utm_combination
ORDER BY submission_count DESC
LIMIT 20
```

## 필터 설정

대시보드에 다음 필터를 추가하세요:

1. **날짜 범위 필터**

   - 기본값: 최근 30일
   - 타입: Date Range

2. **UTM Source 필터**

   - 타입: Event Property
   - 속성: `utm_source`
   - 다중 선택 가능

3. **UTM Medium 필터**

   - 타입: Event Property
   - 속성: `utm_medium`
   - 다중 선택 가능

4. **UTM Campaign 필터**

   - 타입: Event Property
   - 속성: `utm_campaign`
   - 다중 선택 가능

5. **UTM Term 필터**

   - 타입: Event Property
   - 속성: `utm_term`
   - 다중 선택 가능

6. **UTM Content 필터**
   - 타입: Event Property
   - 속성: `utm_content`
   - 다중 선택 가능

## Person Properties 활용

대시보드에서 다음 Person Properties를 활용할 수 있습니다:

- `first_utm_source`, `first_utm_medium`, `first_utm_campaign` (첫 방문 UTM) - 코호트 분석용
- `last_utm_source`, `last_utm_medium`, `last_utm_campaign` (최신 UTM) - 최신 채널 분석용

## 추가 기능

### 실시간 업데이트

각 차트의 설정에서 "Real-time updates" 옵션을 활성화하세요.

### CSV 내보내기

각 차트의 메뉴에서 "Export as CSV" 옵션을 사용할 수 있습니다.

### 공유 링크

대시보드 설정에서 "Share dashboard" 옵션을 사용하여 공유 가능한 링크를 생성할 수 있습니다.

## 문제 해결

### 이벤트가 표시되지 않는 경우

1. **이벤트 이름 확인**: PostHog에서 실제 이벤트 이름이 정확한지 확인하세요.
2. **속성 이름 확인**: 이벤트 속성 이름이 정확한지 확인하세요.
3. **날짜 범위 확인**: 데이터가 있는 날짜 범위를 선택했는지 확인하세요.
4. **필터 확인**: 필터가 너무 제한적인지 확인하세요.

### HogQL 쿼리 오류

1. **문법 확인**: SQL 문법이 올바른지 확인하세요.
2. **속성 접근**: `properties.속성명` 형식을 사용하세요.
3. **NULL 처리**: `COALESCE`를 사용하여 NULL 값을 처리하세요.

## 다음 단계

대시보드가 생성된 후:

1. 데이터가 제대로 수집되고 있는지 확인하세요.
2. 전환율이 낮은 단계를 분석하세요.
3. 성과가 좋은 UTM 파라미터를 찾아 마케팅에 활용하세요.
4. 정기적으로 대시보드를 확인하여 트렌드를 파악하세요.
