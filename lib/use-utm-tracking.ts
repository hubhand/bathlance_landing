"use client";

import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";

interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export function useUTMTracking() {
  const posthog = usePostHog();

  useEffect(() => {
    if (typeof window === "undefined" || !posthog) return;

    // URL에서 UTM 파라미터 추출
    const urlParams = new URLSearchParams(window.location.search);
    const utmParams: UTMParams = {
      utm_source: urlParams.get("utm_source") || undefined,
      utm_medium: urlParams.get("utm_medium") || undefined,
      utm_campaign: urlParams.get("utm_campaign") || undefined,
      utm_term: urlParams.get("utm_term") || undefined,
      utm_content: urlParams.get("utm_content") || undefined,
    };

    // UTM 파라미터가 있는지 확인
    const hasUTMParams = Object.values(utmParams).some(
      (value) => value !== undefined
    );

    if (hasUTMParams) {
      // sessionStorage에서 기존 UTM 파라미터 가져오기
      const storedUTM = sessionStorage.getItem("utm_params");
      let existingUTM: UTMParams = {};

      if (storedUTM) {
        try {
          existingUTM = JSON.parse(storedUTM);
        } catch (e) {
          console.error("Failed to parse stored UTM params", e);
        }
      }

      // 현재 UTM 파라미터를 sessionStorage에 저장
      const currentUTM = { ...existingUTM, ...utmParams };
      sessionStorage.setItem("utm_params", JSON.stringify(currentUTM));

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
        posthog.identify(undefined, personProperties);
      }

      // utm_parameters_detected 이벤트 캡처
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
    }
  }, [posthog]);
}

// UTM 파라미터를 가져오는 유틸리티 함수
export function getUTMParams(): UTMParams {
  if (typeof window === "undefined") return {};

  const storedUTM = sessionStorage.getItem("utm_params");
  if (storedUTM) {
    try {
      return JSON.parse(storedUTM);
    } catch (e) {
      console.error("Failed to parse stored UTM params", e);
      return {};
    }
  }
  return {};
}
