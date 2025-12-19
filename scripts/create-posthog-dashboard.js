/**
 * PostHog 대시보드 생성 스크립트
 * PostHog REST API를 사용하여 "UTM 파라미터별 퍼널 전환 분석" 대시보드를 생성합니다.
 *
 * 사용법:
 * 1. .env.local 파일에 POSTHOG_API_KEY와 POSTHOG_HOST 설정
 * 2. node scripts/create-posthog-dashboard.js 실행
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

// .env.local 파일 읽기
function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith("#")) {
        const [key, ...valueParts] = trimmedLine.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").replace(/^["']|["']$/g, "");
          process.env[key.trim()] = value.trim();
        }
      }
    });
  }
}

// .env.local 파일 로드
loadEnvFile();

// .cursor/mcp.json 파일에서 API 키 읽기
function loadMCPConfig() {
  const mcpPath = path.join(__dirname, "..", ".cursor", "mcp.json");
  if (fs.existsSync(mcpPath)) {
    try {
      let mcpContent = fs.readFileSync(mcpPath, "utf8");
      // BOM 제거
      if (mcpContent.charCodeAt(0) === 0xfeff) {
        mcpContent = mcpContent.slice(1);
      }
      const mcpConfig = JSON.parse(mcpContent);
      if (mcpConfig.mcpServers && mcpConfig.mcpServers.posthog) {
        const authHeader = mcpConfig.mcpServers.posthog.headers?.Authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          process.env.POSTHOG_API_KEY = authHeader.replace("Bearer ", "");
        }
        // MCP URL은 API 호스트가 아니므로, 기본값 사용
        // 실제 PostHog API 호스트는 .env.local에서 가져오거나 기본값 사용
      }
    } catch (e) {
      console.warn("⚠️  .cursor/mcp.json 파일을 읽는 중 오류 발생:", e.message);
    }
  }
}

// MCP 설정 로드
loadMCPConfig();

// 환경 변수에서 PostHog 설정 가져오기
const POSTHOG_API_KEY =
  process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.POSTHOG_HOST ||
  process.env.NEXT_PUBLIC_POSTHOG_HOST ||
  "https://us.i.posthog.com";

if (!POSTHOG_API_KEY) {
  console.error("❌ POSTHOG_API_KEY 환경 변수가 설정되지 않았습니다.");
  console.error(
    "   .env.local 파일에 POSTHOG_API_KEY를 추가하거나 환경 변수로 설정하세요."
  );
  process.exit(1);
}

const API_BASE = `${POSTHOG_HOST.replace(/\/$/, "")}/api`;

/**
 * PostHog API 호출 헬퍼 함수
 */
function posthogRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${endpoint}`);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        Authorization: `Bearer ${POSTHOG_API_KEY}`,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(
              new Error(
                `API Error (${res.statusCode}): ${JSON.stringify(parsed)}`
              )
            );
          }
        } catch (e) {
          reject(new Error(`Parse Error: ${body}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

/**
 * 인사이트를 대시보드에 추가
 */
async function addInsightToDashboard(dashboardId, insightId) {
  try {
    // 방법 1: 대시보드에 인사이트 추가
    await posthogRequest(
      "POST",
      `/projects/@current/dashboards/${dashboardId}/insights/`,
      { insight: insightId }
    );
    console.log(`✅ 인사이트 ${insightId}를 대시보드에 추가 완료`);
    return true;
  } catch (error) {
    // 방법 2: 대시보드 타일로 추가 (다른 API 형식)
    try {
      const dashboard = await posthogRequest(
        "GET",
        `/projects/@current/dashboards/${dashboardId}/`
      );

      const updatedTiles = [...(dashboard.tiles || []), { insight: insightId }];

      await posthogRequest(
        "PATCH",
        `/projects/@current/dashboards/${dashboardId}/`,
        { tiles: updatedTiles }
      );
      console.log(`✅ 인사이트 ${insightId}를 대시보드에 추가 완료 (방법 2)`);
      return true;
    } catch (e) {
      console.warn(
        `⚠️  인사이트 ${insightId}를 대시보드에 추가하는 중 오류:`,
        e.message
      );
      return false;
    }
  }
}

/**
 * 대시보드 생성
 */
async function createDashboard() {
  console.log("📊 대시보드 생성 중...");

  const dashboardData = {
    name: "UTM 파라미터별 퍼널 전환 분석",
    description:
      "UTM 파라미터별로 사용자가 랜딩 페이지에 들어와서 폼 제출까지 완료한 전환율을 퍼널로 분석하는 대시보드",
    pinned: true,
    tags: ["utm", "funnel", "conversion"],
  };

  try {
    const dashboard = await posthogRequest(
      "POST",
      "/projects/@current/dashboards/",
      dashboardData
    );
    console.log("✅ 대시보드 생성 완료:", dashboard.id);
    return dashboard;
  } catch (error) {
    console.error("❌ 대시보드 생성 실패:", error.message);
    throw error;
  }
}

/**
 * 인사이트 생성 (Funnel)
 */
async function createFunnelInsight(dashboardId, name, breakdown) {
  console.log(`📈 ${name} 퍼널 인사이트 생성 중...`);

  const query = {
    kind: "FunnelsQuery",
    series: [
      {
        kind: "EventsNode",
        event: "utm_parameters_detected",
        name: "UTM 파라미터 감지",
      },
      {
        kind: "EventsNode",
        event: "section_viewed",
        name: "폼 섹션 조회",
        properties: [
          {
            key: "section_id",
            value: "apply-form",
            operator: "exact",
            type: "event",
          },
        ],
      },
      {
        kind: "EventsNode",
        event: "scroll_depth",
        name: "전체 스크롤 완료",
        properties: [
          { key: "depth", value: 100, operator: "exact", type: "event" },
        ],
      },
      {
        kind: "EventsNode",
        event: "form_submission_started",
        name: "폼 제출 시작",
      },
      {
        kind: "EventsNode",
        event: "form_submission_completed",
        name: "폼 제출 완료",
      },
    ],
    dateRange: {
      date_from: "-30d",
    },
  };

  // breakdown이 있으면 추가
  if (breakdown) {
    query.breakdownFilter = {
      breakdown_type: "event",
      breakdown: breakdown,
    };
  }

  const insightData = {
    name: name,
    description: breakdown ? `${breakdown}별 전환 퍼널 분석` : "전환 퍼널 분석",
    query: query,
    dashboard: dashboardId,
  };

  try {
    const insight = await posthogRequest(
      "POST",
      "/projects/@current/insights/",
      insightData
    );
    console.log(`✅ ${name} 인사이트 생성 완료:`, insight.id);

    // 대시보드에 추가
    await addInsightToDashboard(dashboardId, insight.id);

    return insight;
  } catch (error) {
    console.error(`❌ ${name} 인사이트 생성 실패:`, error.message);
    throw error;
  }
}

/**
 * 인사이트 생성 (HogQL Query)
 */
async function createHogQLInsight(dashboardId, name, query) {
  console.log(`📊 ${name} HogQL 인사이트 생성 중...`);

  const insightData = {
    name: name,
    description: `${name} - HogQL 쿼리 결과`,
    query: {
      kind: "HogQLQuery",
      query: query,
    },
    dashboard: dashboardId,
  };

  try {
    const insight = await posthogRequest(
      "POST",
      "/projects/@current/insights/",
      insightData
    );
    console.log(`✅ ${name} 인사이트 생성 완료:`, insight.id);

    // 대시보드에 추가
    await addInsightToDashboard(dashboardId, insight.id);

    return insight;
  } catch (error) {
    console.error(`❌ ${name} 인사이트 생성 실패:`, error.message);
    throw error;
  }
}

/**
 * 인사이트 생성 (Trends)
 */
async function createTrendsInsight(
  dashboardId,
  name,
  event,
  breakdown,
  chartType = "bar"
) {
  console.log(`📈 ${name} 트렌드 인사이트 생성 중...`);

  const query = {
    kind: "TrendsQuery",
    series: [{ kind: "EventsNode", event: event, name: event }],
    dateRange: {
      date_from: "-30d",
    },
  };

  // breakdown이 있으면 추가
  if (breakdown) {
    query.breakdownFilter = {
      breakdown_type: "event",
      breakdown: breakdown,
    };
  }

  const insightData = {
    name: name,
    description: `${name} - ${event} 이벤트 분석`,
    query: query,
    dashboard: dashboardId,
  };

  try {
    const insight = await posthogRequest(
      "POST",
      "/projects/@current/insights/",
      insightData
    );
    console.log(`✅ ${name} 인사이트 생성 완료:`, insight.id);

    // 대시보드에 추가
    await addInsightToDashboard(dashboardId, insight.id);

    return insight;
  } catch (error) {
    console.error(`❌ ${name} 인사이트 생성 실패:`, error.message);
    throw error;
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    console.log("🚀 PostHog 대시보드 생성 시작...\n");
    console.log(`📍 PostHog Host: ${POSTHOG_HOST}\n`);

    // 1. 대시보드 생성
    const dashboard = await createDashboard();
    const dashboardId = dashboard.id;
    console.log("");

    // 2. UTM Source별 전환 퍼널 차트
    await createFunnelInsight(
      dashboardId,
      "UTM Source별 전환 퍼널",
      "utm_source"
    );
    console.log("");

    // 3. UTM Source별 요약 테이블 (HogQL)
    const utmSourceTableQuery = `
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
    `.trim();

    await createHogQLInsight(
      dashboardId,
      "UTM Source별 요약 테이블",
      utmSourceTableQuery
    );
    console.log("");

    // 4. UTM Medium별 전환 퍼널 차트
    await createFunnelInsight(
      dashboardId,
      "UTM Medium별 전환 퍼널",
      "utm_medium"
    );
    console.log("");

    // 5. UTM Campaign별 전환 퍼널 차트
    await createFunnelInsight(
      dashboardId,
      "UTM Campaign별 전환 퍼널",
      "utm_campaign"
    );
    console.log("");

    // 6. 섹션별 조회수 차트
    await createTrendsInsight(
      dashboardId,
      "섹션별 조회수",
      "section_viewed",
      "section_name",
      "bar"
    );
    console.log("");

    // 7. 스크롤 깊이별 도달률 차트
    await createTrendsInsight(
      dashboardId,
      "스크롤 깊이별 도달률",
      "scroll_depth",
      "depth",
      "bar"
    );
    console.log("");

    // 8. 시간대별 전환 추이 차트
    await createTrendsInsight(
      dashboardId,
      "시간대별 전환 추이",
      "form_submission_completed",
      null,
      "line"
    );
    console.log("");

    // 9. UTM 파라미터 조합별 성과 차트 (HogQL)
    const utmCombinationQuery = `
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
    `.trim();

    await createHogQLInsight(
      dashboardId,
      "UTM 파라미터 조합별 성과",
      utmCombinationQuery
    );
    console.log("");

    console.log("✅ 모든 인사이트 생성 완료!");
    console.log(
      `\n📊 대시보드 URL: ${POSTHOG_HOST}/project/${dashboardId}/dashboard`
    );
    console.log("\n✨ 대시보드가 성공적으로 생성되었습니다!");
  } catch (error) {
    console.error("\n❌ 오류 발생:", error.message);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

module.exports = {
  createDashboard,
  createFunnelInsight,
  createHogQLInsight,
  createTrendsInsight,
};
