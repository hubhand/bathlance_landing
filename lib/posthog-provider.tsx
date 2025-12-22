"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect, useState } from "react";
import { useUTMTracking } from "./use-utm-tracking";

/**
 * UTM 추적 컴포넌트
 * PostHog Provider 내부에서 UTM 추적을 활성화합니다.
 */
function UTMTracker() {
  useUTMTracking();
  return null;
}

/**
 * PostHog Provider 컴포넌트
 *
 * 환경 변수 설정:
 * - NEXT_PUBLIC_POSTHOG_KEY: PostHog 프로젝트 API 키 (필수)
 * - NEXT_PUBLIC_POSTHOG_HOST: PostHog API 호스트 (선택, 기본값: https://us.i.posthog.com)
 *
 * .env.local 파일에 다음을 추가하세요:
 * NEXT_PUBLIC_POSTHOG_KEY=your_posthog_project_api_key
 * NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
 */
export function PHProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const isDevelopment = process.env.NODE_ENV === "development";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

      // 개발 환경에서만 상세 로그 출력
      if (isDevelopment) {
        console.log("🔍 PostHog 설정 확인:");
        console.log(
          "  - Key:",
          posthogKey
            ? `설정됨 (${posthogKey.substring(0, 10)}...)`
            : "❌ 설정 안됨"
        );
        console.log(
          "  - Host:",
          posthogHost || "기본값 사용 (https://us.i.posthog.com)"
        );
        console.log("  - 환경:", isDevelopment ? "개발" : "프로덕션");
      }

      if (posthogKey) {
        try {
          // PostHog가 이미 초기화되었는지 확인
          if (posthog.__loaded) {
            if (isDevelopment) {
              console.log("✅ PostHog가 이미 초기화되어 있습니다.");
              // 기존 PostHog 객체를 전역으로 노출
              if (typeof window !== "undefined") {
                (window as any).posthog = posthog;
              }
              // Session Recording 상태 확인
              try {
                const sessionRecording = (posthog as any).sessionRecording;
                const isRecordingDisabled =
                  posthog.config?.disable_session_recording ?? true;
                console.log(
                  "  - Session Recording 비활성화 여부:",
                  isRecordingDisabled
                );
                console.log(
                  "  - Session Recording 활성화:",
                  !isRecordingDisabled
                );
                if (sessionRecording) {
                  console.log(
                    "  - Session Recording 객체 존재:",
                    !!sessionRecording
                  );
                } else {
                  console.warn("  ⚠️ Session Recording 객체가 없습니다!");
                }
              } catch (error) {
                console.warn("  - Session Recording 상태 확인 실패:", error);
              }
            }
            setIsInitialized(true);
            return;
          }

          posthog.init(posthogKey, {
            api_host: posthogHost || "https://us.i.posthog.com",
            person_profiles: "identified_only",
            capture_pageview: true,
            capture_pageleave: true,
            // Session Recording 설정 (disable_session_recording은 제거하고 session_recording만 사용)
            session_recording: {
              maskAllInputs: true,
              maskTextSelector: "*",
              recordCrossOriginIframes: false,
            },
            loaded: (posthog) => {
              setIsInitialized(true);

              // 전역 객체로 노출 (디버깅 및 콘솔 접근용)
              if (typeof window !== "undefined") {
                (window as any).posthog = posthog;
              }

              if (isDevelopment) {
                console.log("✅ PostHog 초기화 완료");
                console.log("  - API Host:", posthog.config?.api_host);
                console.log("  - PostHog 객체:", posthog);

                // Session Recording 상태 확인
                try {
                  const sessionRecording = (posthog as any).sessionRecording;
                  const isRecordingDisabled =
                    posthog.config?.disable_session_recording ?? false;

                  console.log("  - Session Recording 설정:");
                  console.log(
                    "    - disable_session_recording:",
                    isRecordingDisabled
                  );
                  console.log(
                    "    - session_recording 객체 존재:",
                    !!sessionRecording
                  );
                  console.log(
                    "    - config.session_recording:",
                    posthog.config?.session_recording
                  );

                  if (sessionRecording) {
                    // Session Recording이 활성화된 경우
                    console.log(
                      "  ✅ Session Recording이 활성화되어 있습니다!"
                    );
                    console.log(
                      "  ℹ️ 페이지에서 행동을 수행하면 녹화가 시작됩니다."
                    );
                    console.log(
                      "  ℹ️ 녹화된 세션은 PostHog 대시보드 > Session Replay에서 확인할 수 있습니다."
                    );
                  } else {
                    console.warn("  ⚠️ Session Recording 객체가 없습니다!");
                    console.warn(
                      "  ⚠️ PostHog 프로젝트 설정에서 Session Recording이 활성화되어 있는지 확인하세요."
                    );
                  }
                } catch (error) {
                  console.warn("  - Session Recording 상태 확인 실패:", error);
                }

                // 개발 환경에서만 디버그 모드 활성화
                posthog.debug();

                // 테스트 이벤트 전송
                try {
                  posthog.capture("posthog_initialized_test", {
                    timestamp: new Date().toISOString(),
                    page_url: window.location.href,
                  });
                  console.log(
                    "✅ 테스트 이벤트 전송 완료: posthog_initialized_test"
                  );
                } catch (error) {
                  console.error("❌ 테스트 이벤트 전송 실패:", error);
                }
              }
            },
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          console.error("❌ PostHog 초기화 실패:", errorMessage);
          if (isDevelopment) {
            console.error("  - 에러 상세:", error);
          }
        }
      } else {
        const errorMessage =
          "PostHog Key가 설정되지 않았습니다. .env.local 파일에 NEXT_PUBLIC_POSTHOG_KEY를 추가하세요.";
        console.error("❌", errorMessage);
        if (isDevelopment) {
          console.error(
            "  - Vercel 배포 시: 환경 변수 설정에서 NEXT_PUBLIC_POSTHOG_KEY를 확인하세요."
          );
        }
      }
    }
  }, []);

  // PostHog가 초기화되지 않았으면 로딩 표시 (선택사항)
  if (!isInitialized && typeof window !== "undefined") {
    // 초기화 중이어도 PostHogProvider는 렌더링 (posthog 객체는 초기화 중에도 사용 가능)
  }

  return (
    <PostHogProvider client={posthog}>
      <UTMTracker />
      {children}
    </PostHogProvider>
  );
}
