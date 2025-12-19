"use client";

import { useEffect, useRef } from "react";
import { usePostHog } from "posthog-js/react";
import { detectSections } from "./utils-section-detection";

export function useScrollTracking() {
  const posthog = usePostHog();
  const viewedSections = useRef<Set<string>>(new Set());
  const scrollDepths = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined" || !posthog) return;

    // 섹션 자동 감지
    const sectionsMap = detectSections();
    const sectionNamesMap = new Map<string, string>();
    sectionsMap.forEach((info) => {
      sectionNamesMap.set(info.id, info.name);
    });

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

              posthog.capture("section_viewed", {
                section_id: sectionId,
                section_name: sectionName,
                scroll_percentage: scrollPercentage,
                timestamp: new Date().toISOString(),
                page_url: window.location.href,
                page_path: window.location.pathname,
              });
            }
          }
        });
      },
      {
        threshold: 0.6, // 섹션의 60%가 보일 때 트리거 (화면 중앙 60% 영역)
        rootMargin: "-20% 0px -20% 0px", // 상하 20% 여백으로 중앙 60% 영역만 감지
      }
    );

    // 감지된 모든 섹션 요소 관찰
    sectionsMap.forEach((info) => {
      sectionObserver.observe(info.element);
    });

    // 스크롤 깊이 추적
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      // 스크롤 깊이 계산 (0-100%)
      const scrollDepth = Math.round(
        ((scrollTop + windowHeight) / documentHeight) * 100
      );

      // 25%, 50%, 75%, 100% 도달 시 이벤트 캡처
      const milestones = [25, 50, 75, 100];
      milestones.forEach((milestone) => {
        if (scrollDepth >= milestone && !scrollDepths.current.has(milestone)) {
          scrollDepths.current.add(milestone);

              posthog.capture("scroll_depth", {
                depth: milestone,
                scroll_percentage: scrollDepth,
                timestamp: new Date().toISOString(),
                page_url: window.location.href,
                page_path: window.location.pathname,
              });
        }
      });
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

    window.addEventListener("scroll", throttledHandleScroll, { passive: true });

    // 초기 스크롤 깊이 확인
    handleScroll();

    // Cleanup
    return () => {
      sectionObserver.disconnect();
      window.removeEventListener("scroll", throttledHandleScroll);
    };
  }, [posthog]);
}
