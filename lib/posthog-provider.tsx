"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";
import { useUTMTracking } from "./use-utm-tracking";

function UTMTracker() {
  useUTMTracking();
  return null;
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

      // 디버깅: 환경 변수 확인
      console.log('🔍 PostHog 설정 확인:');
      console.log('  - Key:', posthogKey ? `설정됨 (${posthogKey.substring(0, 10)}...)` : '❌ 설정 안됨');
      console.log('  - Host:', posthogHost || '기본값 사용 (https://us.i.posthog.com)');

      if (posthogKey) {
        try {
          posthog.init(posthogKey, {
            api_host: posthogHost || "https://us.i.posthog.com",
            person_profiles: "identified_only",
            capture_pageview: true,
            capture_pageleave: true,
            session_recording: {
              maskAllInputs: true,
              maskTextSelector: "*",
            },
            loaded: (posthog) => {
              console.log('✅ PostHog 초기화 완료');
              console.log('  - API Host:', posthog.config?.api_host);
              // 프로덕션에서도 디버깅 활성화 (임시)
              posthog.debug();
            },
          });
        } catch (error) {
          console.error('❌ PostHog 초기화 실패:', error);
        }
      } else {
        console.error('❌ PostHog Key가 설정되지 않았습니다.');
        console.error('   Vercel 환경 변수에 NEXT_PUBLIC_POSTHOG_KEY를 확인하세요.');
      }
    }
  }, []);

  return (
    <PostHogProvider client={posthog}>
      <UTMTracker />
      {children}
    </PostHogProvider>
  );
}
