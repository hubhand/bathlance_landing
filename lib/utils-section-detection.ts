"use client";

/**
 * 섹션 정보 인터페이스
 */
export interface SectionInfo {
  id: string;
  name: string;
  element: HTMLElement;
}

/**
 * 문자열을 kebab-case로 변환
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

/**
 * 섹션 이름에서 ID 생성
 * 예: "Hero Section" → "hero-section"
 */
function generateIdFromName(sectionName: string): string {
  return toKebabCase(sectionName);
}

/**
 * DOM에서 모든 섹션을 자동 감지
 * - section 태그와 header 태그를 찾음
 * - data-section-name 속성 또는 id를 기반으로 섹션 정보 추출
 * - id가 없으면 data-section-name에서 자동 생성
 */
export function detectSections(): Map<string, SectionInfo> {
  const sectionMap = new Map<string, SectionInfo>();

  if (typeof window === "undefined") {
    return sectionMap;
  }

  // 모든 section과 header 요소 찾기
  const sections = document.querySelectorAll<HTMLElement>(
    "section[id], header[id], section[data-section-name], header[data-section-name]"
  );

  sections.forEach((element) => {
    let sectionId = element.id;
    let sectionName = element.getAttribute("data-section-name") || "";

    // id가 없으면 data-section-name에서 생성
    if (!sectionId && sectionName) {
      sectionId = generateIdFromName(sectionName);
      element.id = sectionId;
    }

    // data-section-name이 없으면 id에서 추론
    if (!sectionName && sectionId) {
      sectionName = sectionId
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }

    // 둘 다 없으면 스킵
    if (!sectionId) {
      return;
    }

    sectionMap.set(sectionId, {
      id: sectionId,
      name: sectionName || sectionId,
      element,
    });
  });

  return sectionMap;
}

/**
 * 섹션 ID로 섹션 정보 가져오기
 */
export function getSectionInfo(sectionId: string): SectionInfo | undefined {
  const sections = detectSections();
  return sections.get(sectionId);
}

