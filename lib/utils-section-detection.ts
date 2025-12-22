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
 * 예: "Hero Section" → "hero-section"
 * 예: "ProblemSection" → "problem-section"
 */
function toKebabCase(str: string): string {
  return str
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

/**
 * 섹션 이름에서 ID 생성
 * 예: "Hero Section" → "hero-section"
 * 예: "Application Form" → "application-form"
 */
function generateIdFromName(sectionName: string): string {
  if (!sectionName || typeof sectionName !== "string") {
    return "";
  }
  return toKebabCase(sectionName);
}

/**
 * ID에서 섹션 이름 추론
 * 예: "hero-section" → "Hero Section"
 * 예: "application-form" → "Application Form"
 */
function generateNameFromId(sectionId: string): string {
  if (!sectionId || typeof sectionId !== "string") {
    return "";
  }
  return sectionId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * DOM에서 모든 섹션을 자동 감지
 *
 * 감지 규칙:
 * 1. section 태그와 header 태그, footer 태그를 찾음
 * 2. id 속성이 있으면 우선 사용
 * 3. id가 없으면 data-section-name 속성에서 자동 생성
 * 4. data-section-name이 없으면 id에서 이름 추론
 *
 * @returns 섹션 ID를 키로 하는 SectionInfo 맵
 */
export function detectSections(): Map<string, SectionInfo> {
  const sectionMap = new Map<string, SectionInfo>();

  if (typeof window === "undefined") {
    return sectionMap;
  }

  try {
    // 모든 section, header, footer 요소 찾기
    const sections = document.querySelectorAll<HTMLElement>(
      "section[id], header[id], footer[id], section[data-section-name], header[data-section-name], footer[data-section-name]"
    );

    sections.forEach((element) => {
      let sectionId = element.id?.trim() || "";
      let sectionName = element.getAttribute("data-section-name")?.trim() || "";

      // id가 없으면 data-section-name에서 생성
      if (!sectionId && sectionName) {
        sectionId = generateIdFromName(sectionName);
        if (sectionId) {
          element.id = sectionId;
        }
      }

      // data-section-name이 없으면 id에서 추론
      if (!sectionName && sectionId) {
        sectionName = generateNameFromId(sectionId);
      }

      // 둘 다 없으면 스킵
      if (!sectionId) {
        return;
      }

      // 중복 ID 검사
      if (sectionMap.has(sectionId)) {
        console.warn(
          `⚠️ 중복된 섹션 ID 발견: "${sectionId}". 첫 번째 섹션만 사용됩니다.`
        );
        return;
      }

      sectionMap.set(sectionId, {
        id: sectionId,
        name: sectionName || sectionId,
        element,
      });
    });
  } catch (error) {
    console.error("❌ 섹션 감지 중 오류 발생:", error);
  }

  return sectionMap;
}

/**
 * 섹션 ID로 섹션 정보 가져오기
 *
 * @param sectionId - 찾을 섹션의 ID
 * @returns 섹션 정보 또는 undefined
 */
export function getSectionInfo(sectionId: string): SectionInfo | undefined {
  if (!sectionId || typeof sectionId !== "string") {
    return undefined;
  }
  const sections = detectSections();
  return sections.get(sectionId);
}

/**
 * 모든 섹션 ID 목록 가져오기
 *
 * @returns 섹션 ID 배열
 */
export function getAllSectionIds(): string[] {
  const sections = detectSections();
  return Array.from(sections.keys());
}
