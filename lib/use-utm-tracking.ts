"use client";

import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";

/**
 * UTM 파라미터 인터페이스
 */
export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

/**
 * UTM 추적 Hook
 *
 * 기능:
 * 1. URL에서 UTM 파라미터 추출
 * 2. sessionStorage에 저장 (페이지 이동 시에도 유지)
 * 3. PostHog person properties에 저장:
 *    - first_utm_*: 첫 방문 시 UTM 파라미터
 *    - last_utm_*: 최신 UTM 파라미터
 * 4. utm_parameters_detected 이벤트 캡처
 */
export function useUTMTracking() {
  const posthog = usePostHog();

  useEffect(() => {
    if (typeof window === "undefined" || !posthog) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "⚠️ useUTMTracking: PostHog가 아직 초기화되지 않았습니다."
        );
      }
      return;
    }

    if (process.env.NODE_ENV === "development") {
      console.log("✅ useUTMTracking: PostHog 객체 확인됨", posthog);
    }

    try {
      // URL에서 UTM 파라미터 추출
      const urlParams = new URLSearchParams(window.location.search);
      const utmParams: UTMParams = {
        utm_source: urlParams.get("utm_source")?.trim() || undefined,
        utm_medium: urlParams.get("utm_medium")?.trim() || undefined,
        utm_campaign: urlParams.get("utm_campaign")?.trim() || undefined,
        utm_term: urlParams.get("utm_term")?.trim() || undefined,
        utm_content: urlParams.get("utm_content")?.trim() || undefined,
      };

      // 빈 문자열 제거
      Object.keys(utmParams).forEach((key) => {
        const typedKey = key as keyof UTMParams;
        if (utmParams[typedKey] === "") {
          utmParams[typedKey] = undefined;
        }
      });

      // UTM 파라미터가 있는지 확인
      const hasUTMParams = Object.values(utmParams).some(
        (value) => value !== undefined && value !== ""
      );

      if (hasUTMParams) {
        // sessionStorage에서 기존 UTM 파라미터 가져오기
        let existingUTM: UTMParams = {};
        try {
          const storedUTM = sessionStorage.getItem("utm_params");
          if (storedUTM) {
            existingUTM = JSON.parse(storedUTM);
            // 타입 검증
            if (typeof existingUTM !== "object" || existingUTM === null) {
              existingUTM = {};
            }
          }
        } catch (e) {
          console.error("❌ 저장된 UTM 파라미터 파싱 실패:", e);
          // 손상된 데이터 정리
          try {
            sessionStorage.removeItem("utm_params");
          } catch (storageError) {
            console.error("❌ sessionStorage 정리 실패:", storageError);
          }
        }

        // 현재 UTM 파라미터를 sessionStorage에 저장
        const currentUTM = { ...existingUTM, ...utmParams };
        try {
          sessionStorage.setItem("utm_params", JSON.stringify(currentUTM));
        } catch (storageError) {
          console.error("❌ UTM 파라미터 저장 실패:", storageError);
        }

        // PostHog person properties에 저장
        const personProperties: Record<string, string> = {};

        // first_utm_* (첫 방문 UTM) - 기존에 없었던 경우에만 설정
        if (!existingUTM.utm_source && utmParams.utm_source) {
          personProperties.first_utm_source = utmParams.utm_source;
        }
        if (!existingUTM.utm_medium && utmParams.utm_medium) {
          personProperties.first_utm_medium = utmParams.utm_medium;
        }
        if (!existingUTM.utm_campaign && utmParams.utm_campaign) {
          personProperties.first_utm_campaign = utmParams.utm_campaign;
        }
        if (!existingUTM.utm_term && utmParams.utm_term) {
          personProperties.first_utm_term = utmParams.utm_term;
        }
        if (!existingUTM.utm_content && utmParams.utm_content) {
          personProperties.first_utm_content = utmParams.utm_content;
        }

        // last_utm_* (최신 UTM) - 항상 업데이트
        if (utmParams.utm_source) {
          personProperties.last_utm_source = utmParams.utm_source;
        }
        if (utmParams.utm_medium) {
          personProperties.last_utm_medium = utmParams.utm_medium;
        }
        if (utmParams.utm_campaign) {
          personProperties.last_utm_campaign = utmParams.utm_campaign;
        }
        if (utmParams.utm_term) {
          personProperties.last_utm_term = utmParams.utm_term;
        }
        if (utmParams.utm_content) {
          personProperties.last_utm_content = utmParams.utm_content;
        }

        // Person properties 설정
        if (Object.keys(personProperties).length > 0) {
          try {
            posthog.identify(undefined, personProperties);
          } catch (error) {
            console.error("❌ PostHog identify 실패:", error);
          }
        }

        // utm_parameters_detected 이벤트 캡처
        try {
          posthog.capture("utm_parameters_detected", {
            utm_source: utmParams.utm_source,
            utm_medium: utmParams.utm_medium,
            utm_campaign: utmParams.utm_campaign,
            utm_term: utmParams.utm_term,
            utm_content: utmParams.utm_content,
            page_url: window.location.href,
            page_path: window.location.pathname,
            referrer: document.referrer || undefined,
            landing_page: window.location.pathname + window.location.search,
          });
          if (process.env.NODE_ENV === "development") {
            console.log("✅ UTM 파라미터 이벤트 캡처:", utmParams);
          }
        } catch (error) {
          console.error("❌ UTM 파라미터 이벤트 캡처 실패:", error);
        }
      }
    } catch (error) {
      console.error("❌ UTM 추적 초기화 실패:", error);
    }
  }, [posthog]);
}

/**
 * UTM 파라미터를 가져오는 유틸리티 함수
 *
 * @returns 저장된 UTM 파라미터 객체
 */
export function getUTMParams(): UTMParams {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const storedUTM = sessionStorage.getItem("utm_params");
    if (storedUTM) {
      const parsed = JSON.parse(storedUTM);
      // 타입 검증
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as UTMParams;
      }
    }
  } catch (e) {
    console.error("❌ 저장된 UTM 파라미터 파싱 실패:", e);
    // 손상된 데이터 정리
    try {
      sessionStorage.removeItem("utm_params");
    } catch (storageError) {
      console.error("❌ sessionStorage 정리 실패:", storageError);
    }
  }

  return {};
}
