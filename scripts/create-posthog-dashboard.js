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
            // 성공 응답 로깅 (디버깅용)
            if (endpoint.includes("/insights/") && method === "POST") {
              console.log(
                `   📝 API 응답:`,
                JSON.stringify(parsed, null, 2).substring(0, 500)
              );
            }
            resolve(parsed);
          } else {
            console.error(
              `   ❌ API 오류 응답 (${res.statusCode}):`,
              JSON.stringify(parsed, null, 2)
            );
            reject(
              new Error(
                `API Error (${res.statusCode}): ${JSON.stringify(parsed)}`
              )
            );
          }
        } catch (e) {
          console.error(`   ❌ 응답 파싱 오류:`, body.substring(0, 500));
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
 * 인사이트를 대시보드에 추가 (개선된 버전)
 */
async function addInsightToDashboard(dashboardId, insightId) {
  try {
    // 대시보드 정보 가져오기
    const dashboard = await posthogRequest(
      "GET",
      `/projects/@current/dashboards/${dashboardId}/`
    );

    // 기존 타일 목록 가져오기
    const existingTiles = dashboard.tiles || [];

    // 인사이트가 이미 추가되어 있는지 확인
    const alreadyAdded = existingTiles.some((tile) => {
      const tileInsightId =
        typeof tile.insight === "object" ? tile.insight?.id : tile.insight;
      return tileInsightId === insightId || tileInsightId === String(insightId);
    });

    if (alreadyAdded) {
      console.log(
        `ℹ️  인사이트 ${insightId}는 이미 대시보드에 추가되어 있습니다.`
      );
      return true;
    }

    // 방법 1: POST 엔드포인트 시도
    try {
      await posthogRequest(
        "POST",
        `/projects/@current/dashboards/${dashboardId}/insights/`,
        { insight: insightId }
      );
      console.log(
        `✅ 인사이트 ${insightId}를 대시보드에 추가 완료 (POST 방법)`
      );
      return true;
    } catch (postError) {
      console.log(`⚠️  POST 방법 실패, PATCH 방법 시도: ${postError.message}`);
    }

    // 방법 2: PATCH로 타일 추가 (여러 형식 시도)
    const tileFormats = [
      { insight: insightId }, // 형식 1: 숫자 ID
      { insight: String(insightId) }, // 형식 2: 문자열 ID
      { insight: { id: insightId } }, // 형식 3: 객체 형식
    ];

    for (const newTile of tileFormats) {
      try {
        const updatedTiles = [...existingTiles, newTile];

        await posthogRequest(
          "PATCH",
          `/projects/@current/dashboards/${dashboardId}/`,
          { tiles: updatedTiles }
        );

        // 실제로 추가되었는지 확인
        const verifyDashboard = await posthogRequest(
          "GET",
          `/projects/@current/dashboards/${dashboardId}/`
        );
        const verifyTiles = verifyDashboard.tiles || [];
        const isActuallyAdded = verifyTiles.some((tile) => {
          const tileInsightId =
            typeof tile.insight === "object" ? tile.insight?.id : tile.insight;
          return (
            tileInsightId === insightId || tileInsightId === String(insightId)
          );
        });

        if (isActuallyAdded) {
          console.log(
            `✅ 인사이트 ${insightId}를 대시보드에 추가 완료 (PATCH 방법, 검증됨)`
          );
          return true;
        } else {
          console.warn(
            `⚠️  PATCH 요청은 성공했지만 실제로 대시보드에 추가되지 않았습니다.`
          );
          // 다음 형식 시도
          continue;
        }
      } catch (formatError) {
        // 다음 형식 시도
        continue;
      }
    }

    // 모든 방법 실패
    console.warn(
      `⚠️  인사이트 ${insightId}를 대시보드에 추가하는 모든 방법이 실패했습니다. 수동으로 추가해주세요.`
    );
    return false;
  } catch (error) {
    console.error(
      `❌ 인사이트 ${insightId}를 대시보드에 추가하는 중 오류:`,
      error.message
    );
    // 에러가 발생해도 계속 진행 (인사이트는 생성되었으므로)
    return false;
  }
}

/**
 * 기존 대시보드 찾기 또는 생성
 */
async function getOrCreateDashboard() {
  console.log("📊 대시보드 찾는 중...");

  try {
    // 기존 대시보드 목록 가져오기
    const dashboards = await posthogRequest(
      "GET",
      "/projects/@current/dashboards/"
    );

    // "UTM 파라미터별 퍼널 전환 분석" 대시보드 찾기
    const matchingDashboards =
      dashboards.results?.filter(
        (d) => d.name === "UTM 파라미터별 퍼널 전환 분석"
      ) || [];

    if (matchingDashboards.length > 0) {
      // 여러 개가 있으면 가장 최근 것 선택 (created_at 기준)
      const sortedDashboards = matchingDashboards.sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt || 0);
        const dateB = new Date(b.created_at || b.createdAt || 0);
        return dateB - dateA; // 최신 것이 먼저
      });

      const latestDashboard = sortedDashboards[0];

      if (matchingDashboards.length > 1) {
        console.log(
          `⚠️  같은 이름의 대시보드가 ${matchingDashboards.length}개 발견되었습니다.`
        );
        console.log(
          `✅ 가장 최근 대시보드 선택: ${latestDashboard.id} (생성일: ${
            latestDashboard.created_at || latestDashboard.createdAt
          })`
        );
        console.log(
          `💡 오래된 대시보드는 PostHog 웹사이트에서 수동으로 삭제하세요.`
        );
      } else {
        console.log("✅ 기존 대시보드 찾음:", latestDashboard.id);
      }

      return latestDashboard;
    }
  } catch (error) {
    console.warn(
      "⚠️  대시보드 목록 조회 실패, 새로 생성합니다:",
      error.message
    );
  }

  // 대시보드가 없으면 새로 생성
  return await createDashboard();
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
 * 인사이트가 실제로 생성되었는지 확인
 */
async function verifyInsightExists(insightId) {
  try {
    const insight = await posthogRequest(
      "GET",
      `/projects/@current/insights/${insightId}/`
    );
    console.log(
      `   ✅ 인사이트 검증 완료: ${insight.name} (ID: ${insight.id})`
    );
    return insight;
  } catch (error) {
    console.error(`   ❌ 인사이트 검증 실패:`, error.message);
    return null;
  }
}

/**
 * 인사이트 목록에서 특정 인사이트 찾기
 */
async function findInsightInList(insightName) {
  try {
    const insights = await posthogRequest(
      "GET",
      "/projects/@current/insights/?limit=100"
    );

    const found = insights.results?.find(
      (insight) => insight.name === insightName
    );

    if (found) {
      console.log(
        `   ✅ 인사이트 목록에서 찾음: ${insightName} (ID: ${found.id})`
      );
      return found;
    } else {
      console.log(`   ⚠️  인사이트 목록에서 찾지 못함: ${insightName}`);
      return null;
    }
  } catch (error) {
    console.error(`   ❌ 인사이트 목록 조회 실패:`, error.message);
    return null;
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
    // dashboard 필드 제거 - 인사이트 생성 후 별도로 추가
  };

  try {
    console.log(
      `   📤 요청 데이터:`,
      JSON.stringify(insightData, null, 2).substring(0, 300)
    );
    const insight = await posthogRequest(
      "POST",
      "/projects/@current/insights/",
      insightData
    );
    console.log(`✅ ${name} 인사이트 생성 완료:`, insight.id);
    console.log(
      `   📋 생성된 인사이트 정보:`,
      JSON.stringify(insight, null, 2).substring(0, 500)
    );

    // 인사이트가 실제로 생성되었는지 확인
    const verified = await verifyInsightExists(insight.id);
    if (!verified) {
      console.error(`   ❌ 인사이트 ${insight.id}가 실제로 존재하지 않습니다!`);
      return null;
    }

    // 인사이트 상세 정보 출력
    await printInsightDetails(insight.id, name);

    // 인사이트 목록에서도 확인
    const foundInList = await findInsightInList(name);
    if (!foundInList) {
      console.warn(
        `   ⚠️  인사이트 ${name}가 목록에 표시되지 않습니다. 잠시 후 다시 확인해주세요.`
      );
      console.log(
        `   💡 PostHog 웹사이트에서 직접 확인: ${POSTHOG_HOST}/insights/${insight.id}`
      );
    }

    // 대시보드에 추가
    const added = await addInsightToDashboard(dashboardId, insight.id);
    if (!added) {
      console.warn(
        `⚠️  ${name} 인사이트는 생성되었지만 대시보드에 추가되지 않았습니다.`
      );
      console.log(
        `   💡 PostHog 웹사이트에서 수동으로 추가: ${POSTHOG_HOST}/insights/${insight.id}`
      );
    }

    return insight;
  } catch (error) {
    console.error(`❌ ${name} 인사이트 생성 실패:`, error.message);
    console.error(`   📋 전체 오류 정보:`, error);
    // 오류가 발생해도 계속 진행
    return null;
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
    // dashboard 필드 제거 - 인사이트 생성 후 별도로 추가
  };

  try {
    console.log(
      `   📤 요청 데이터:`,
      JSON.stringify(insightData, null, 2).substring(0, 300)
    );
    const insight = await posthogRequest(
      "POST",
      "/projects/@current/insights/",
      insightData
    );
    console.log(`✅ ${name} 인사이트 생성 완료:`, insight.id);
    console.log(
      `   📋 생성된 인사이트 정보:`,
      JSON.stringify(insight, null, 2).substring(0, 500)
    );

    // 인사이트가 실제로 생성되었는지 확인
    const verified = await verifyInsightExists(insight.id);
    if (!verified) {
      console.error(`   ❌ 인사이트 ${insight.id}가 실제로 존재하지 않습니다!`);
      return null;
    }

    // 인사이트 상세 정보 출력
    await printInsightDetails(insight.id, name);

    // 인사이트 목록에서도 확인
    const foundInList = await findInsightInList(name);
    if (!foundInList) {
      console.warn(
        `   ⚠️  인사이트 ${name}가 목록에 표시되지 않습니다. 잠시 후 다시 확인해주세요.`
      );
      console.log(
        `   💡 PostHog 웹사이트에서 직접 확인: ${POSTHOG_HOST}/insights/${insight.id}`
      );
    }

    // 대시보드에 추가
    const added = await addInsightToDashboard(dashboardId, insight.id);
    if (!added) {
      console.warn(
        `⚠️  ${name} 인사이트는 생성되었지만 대시보드에 추가되지 않았습니다.`
      );
      console.log(
        `   💡 PostHog 웹사이트에서 수동으로 추가: ${POSTHOG_HOST}/insights/${insight.id}`
      );
    }

    return insight;
  } catch (error) {
    console.error(`❌ ${name} 인사이트 생성 실패:`, error.message);
    console.error(`   📋 전체 오류 정보:`, error);
    // 오류가 발생해도 계속 진행
    return null;
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
    // dashboard 필드 제거 - 인사이트 생성 후 별도로 추가
  };

  try {
    console.log(
      `   📤 요청 데이터:`,
      JSON.stringify(insightData, null, 2).substring(0, 300)
    );
    const insight = await posthogRequest(
      "POST",
      "/projects/@current/insights/",
      insightData
    );
    console.log(`✅ ${name} 인사이트 생성 완료:`, insight.id);
    console.log(
      `   📋 생성된 인사이트 정보:`,
      JSON.stringify(insight, null, 2).substring(0, 500)
    );

    // 인사이트가 실제로 생성되었는지 확인
    const verified = await verifyInsightExists(insight.id);
    if (!verified) {
      console.error(`   ❌ 인사이트 ${insight.id}가 실제로 존재하지 않습니다!`);
      return null;
    }

    // 인사이트 상세 정보 출력
    await printInsightDetails(insight.id, name);

    // 인사이트 목록에서도 확인
    const foundInList = await findInsightInList(name);
    if (!foundInList) {
      console.warn(
        `   ⚠️  인사이트 ${name}가 목록에 표시되지 않습니다. 잠시 후 다시 확인해주세요.`
      );
      console.log(
        `   💡 PostHog 웹사이트에서 직접 확인: ${POSTHOG_HOST}/insights/${insight.id}`
      );
    }

    // 대시보드에 추가
    const added = await addInsightToDashboard(dashboardId, insight.id);
    if (!added) {
      console.warn(
        `⚠️  ${name} 인사이트는 생성되었지만 대시보드에 추가되지 않았습니다.`
      );
      console.log(
        `   💡 PostHog 웹사이트에서 수동으로 추가: ${POSTHOG_HOST}/insights/${insight.id}`
      );
    }

    return insight;
  } catch (error) {
    console.error(`❌ ${name} 인사이트 생성 실패:`, error.message);
    console.error(`   📋 전체 오류 정보:`, error);
    // 오류가 발생해도 계속 진행
    return null;
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    console.log("🚀 PostHog 대시보드 생성 시작...\n");
    console.log(`📍 PostHog Host: ${POSTHOG_HOST}\n`);

    // 1. 기존 대시보드 찾기 또는 생성
    const dashboard = await getOrCreateDashboard();
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
