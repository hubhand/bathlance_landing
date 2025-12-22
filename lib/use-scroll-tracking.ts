"use client";

import { useEffect, useRef } from "react";
import { usePostHog } from "posthog-js/react";
import { detectSections } from "./utils-section-detection";

/**
 * 스크롤 추적 Hook
 *
 * 기능:
 * 1. 섹션 뷰 추적: 각 섹션이 화면 중앙 60% 영역에 진입하면 이벤트 캡처
 * 2. 스크롤 깊이 추적: 25%, 50%, 75%, 100% 도달 시 이벤트 캡처
 *
 * 이벤트:
 * - section_viewed: 섹션이 화면에 보일 때
 * - scroll_depth: 특정 스크롤 깊이에 도달했을 때
 */
export function useScrollTracking() {
  const posthog = usePostHog();
  const viewedSections = useRef<Set<string>>(new Set());
  const scrollDepths = useRef<Set<number>>(new Set());
  const sectionObserverRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !posthog) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "⚠️ useScrollTracking: PostHog가 아직 초기화되지 않았습니다."
        );
      }
      return;
    }

    if (process.env.NODE_ENV === "development") {
      console.log("✅ useScrollTracking: PostHog 객체 확인됨", posthog);
    }

    try {
      // 섹션 자동 감지
      const sectionsMap = detectSections();
      const sectionNamesMap = new Map<string, string>();
      sectionsMap.forEach((info) => {
        sectionNamesMap.set(info.id, info.name);
      });

      if (sectionsMap.size === 0) {
        console.warn("⚠️ 추적할 섹션을 찾을 수 없습니다.");
        return;
      }

      // 섹션 조회 추적 (Intersection Observer 사용)
      const sectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const sectionId = entry.target.id;
              if (sectionId && !viewedSections.current.has(sectionId)) {
                viewedSections.current.add(sectionId);
                const sectionName = sectionNamesMap.get(sectionId) || sectionId;
                const scrollPercentage = Math.round(
                  ((window.scrollY + window.innerHeight) /
                    document.documentElement.scrollHeight) *
                    100
                );

                try {
                  posthog.capture("section_viewed", {
                    section_id: sectionId,
                    section_name: sectionName,
                    scroll_percentage: Math.min(
                      100,
                      Math.max(0, scrollPercentage)
                    ),
                    timestamp: new Date().toISOString(),
                    page_url: window.location.href,
                    page_path: window.location.pathname,
                  });
                  if (process.env.NODE_ENV === "development") {
                    console.log(
                      `✅ 섹션 뷰 이벤트 캡처: ${sectionName} (${sectionId})`
                    );
                  }
                } catch (error) {
                  console.error(
                    `❌ 섹션 뷰 이벤트 캡처 실패 (${sectionId}):`,
                    error
                  );
                }
              }
            }
          });
        },
        {
          threshold: 0.6, // 섹션의 60%가 보일 때 트리거 (화면 중앙 60% 영역)
          rootMargin: "-20% 0px -20% 0px", // 상하 20% 여백으로 중앙 60% 영역만 감지
        }
      );

      sectionObserverRef.current = sectionObserver;

      // 감지된 모든 섹션 요소 관찰
      sectionsMap.forEach((info) => {
        try {
          sectionObserver.observe(info.element);
        } catch (error) {
          console.error(`❌ 섹션 관찰 실패 (${info.id}):`, error);
        }
      });

      // 스크롤 깊이 추적
      const handleScroll = () => {
        try {
          const windowHeight = window.innerHeight;
          const documentHeight = document.documentElement.scrollHeight;
          const scrollTop =
            window.scrollY || document.documentElement.scrollTop;

          // 스크롤 깊이 계산 (0-100%)
          const scrollDepth = Math.round(
            ((scrollTop + windowHeight) / documentHeight) * 100
          );

          // 25%, 50%, 75%, 100% 도달 시 이벤트 캡처
          const milestones = [25, 50, 75, 100];
          milestones.forEach((milestone) => {
            if (
              scrollDepth >= milestone &&
              !scrollDepths.current.has(milestone)
            ) {
              scrollDepths.current.add(milestone);

              try {
                posthog.capture("scroll_depth", {
                  depth: milestone,
                  scroll_percentage: Math.min(100, Math.max(0, scrollDepth)),
                  timestamp: new Date().toISOString(),
                  page_url: window.location.href,
                  page_path: window.location.pathname,
                });
                if (process.env.NODE_ENV === "development") {
                  console.log(`✅ 스크롤 깊이 이벤트 캡처: ${milestone}%`);
                }
              } catch (error) {
                console.error(
                  `❌ 스크롤 깊이 이벤트 캡처 실패 (${milestone}%):`,
                  error
                );
              }
            }
          });
        } catch (error) {
          console.error("❌ 스크롤 처리 중 오류:", error);
        }
      };

      // 스크롤 이벤트 리스너 추가 (throttle 적용)
      let ticking = false;
      const throttledHandleScroll = () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            handleScroll();
            ticking = false;
          });
          ticking = true;
        }
      };

      window.addEventListener("scroll", throttledHandleScroll, {
        passive: true,
      });

      // 초기 스크롤 깊이 확인 (DOM이 완전히 로드된 후)
      const checkInitialScroll = () => {
        if (document.readyState === "complete") {
          handleScroll();
        } else {
          window.addEventListener("load", handleScroll, { once: true });
        }
      };

      // 약간의 지연 후 초기 스크롤 확인 (레이아웃 안정화 대기)
      setTimeout(checkInitialScroll, 100);

      // Cleanup
      return () => {
        if (sectionObserverRef.current) {
          sectionObserverRef.current.disconnect();
        }
        window.removeEventListener("scroll", throttledHandleScroll);
        window.removeEventListener("load", handleScroll);
      };
    } catch (error) {
      console.error("❌ 스크롤 추적 초기화 실패:", error);
    }
  }, [posthog]);
}
