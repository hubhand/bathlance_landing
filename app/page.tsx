"use client";

import { useState } from "react";
import {
  Check,
  Leaf,
  AlertCircle,
  ShoppingBag,
  ArrowRight,
  Menu,
  X,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import { useScrollTracking } from "@/lib/use-scroll-tracking";
import { usePostHog } from "posthog-js/react";
import { getUTMParams } from "@/lib/use-utm-tracking";

// ▼▼▼ 아래 주소를 고객님의 구글 웹 앱 URL로 꼭 바꿔주세요! ▼▼▼
const WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbxjU4EJbwYzM8F28S8nqsOsktdKfs-eG6fOdugcCcF_-HAaXm7e75lFlLoXzh149BUW/exec";

export default function BathlanceLanding() {
  useScrollTracking();
  const posthog = usePostHog();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // UTM 파라미터 가져오기
    const utmParams = getUTMParams();

    // 폼 제출 시작 이벤트
    if (posthog) {
      posthog.capture("form_submission_started", {
        form_type: "application_form",
        form_location: "landing_page",
        form_id: "apply-form",
        form_name: "사전 알림 신청 폼",
        page_url: typeof window !== "undefined" ? window.location.href : "",
        page_path:
          typeof window !== "undefined" ? window.location.pathname : "",
        ...utmParams,
      });
    }

    try {
      // 구글 앱스 스크립트 전송 로직 (no-cors 모드 사용)
      await fetch(WEBAPP_URL, {
        method: "POST",
        mode: "no-cors", // CORS 오류 방지 핵심 코드
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      // no-cors 모드는 응답을 확인할 수 없으므로, 에러가 안 나면 성공으로 간주합니다.
      alert("신청이 완료되었습니다! 곧 연락드리겠습니다.");
      setFormData({ name: "", phone: "", email: "" }); // 폼 초기화

      // 폼 제출 완료 이벤트
      if (posthog) {
        posthog.capture("form_submission_completed", {
          form_type: "application_form",
          form_location: "landing_page",
          form_id: "apply-form",
          form_name: "사전 알림 신청 폼",
          has_name: !!formData.name,
          has_email: !!formData.email,
          has_phone: !!formData.phone,
          has_idea: false,
          idea_length: 0,
          page_url: typeof window !== "undefined" ? window.location.href : "",
          page_path:
            typeof window !== "undefined" ? window.location.pathname : "",
          utm_source: utmParams.utm_source,
          utm_medium: utmParams.utm_medium,
          utm_campaign: utmParams.utm_campaign,
          utm_term: utmParams.utm_term,
          utm_content: utmParams.utm_content,
        });
      }
    } catch (error) {
      console.error("Error:", error);
      alert("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");

      // 폼 제출 실패 이벤트
      if (posthog) {
        posthog.capture("form_submission_failed", {
          form_type: "application_form",
          form_location: "landing_page",
          form_id: "apply-form",
          form_name: "사전 알림 신청 폼",
          error: error instanceof Error ? error.message : "Unknown error",
          page_url: typeof window !== "undefined" ? window.location.href : "",
          page_path:
            typeof window !== "undefined" ? window.location.pathname : "",
          ...utmParams,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-100">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-[#e1621c]">BATHLANCE</div>
          <button className="bg-[#e1621c] text-white px-4 py-2 rounded-full hover:bg-[#c54e0b] transition-colors text-sm font-medium">
            사전 신청하기
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header
        id="hero-section"
        data-section-name="Hero Section"
        className="relative bg-[#f7e0a4] overflow-hidden"
      >
        <div className="container mx-auto px-4 py-16 md:py-24 flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 z-10 space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-slate-900">
              욕실 용품 교체부터
              <br />
              <span className="text-[#e1621c]">구매, 성분 분석까지</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-700 max-w-lg">
              사진 한 장으로 시작하는 욕실 관리. BATHLANCE로 트러블 유발 성분을
              찾고 위생적인 욕실 라이프를 시작하세요.
            </p>
            <div className="pt-4">
              <a
                href="#apply-form"
                className="inline-flex items-center bg-[#e1621c] text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-[#c54e0b] transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                지금 무료로 시작하기 <ArrowRight className="ml-2 w-5 h-5" />
              </a>
            </div>
          </div>
          <div className="md:w-1/2 mt-10 md:mt-0 relative">
            {/* 핸드폰 목업 느낌의 플레이스홀더 */}
            <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl">
              <div className="h-[32px] w-[3px] bg-gray-800 absolute -left-[17px] top-[72px] rounded-l-lg"></div>
              <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg"></div>
              <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[178px] rounded-l-lg"></div>
              <div className="h-[64px] w-[3px] bg-gray-800 absolute -right-[17px] top-[142px] rounded-r-lg"></div>
              <div className="rounded-[2rem] overflow-hidden w-[272px] h-[572px] bg-white dark:bg-gray-800 relative">
                {/* 앱 실행 화면 이미지 */}
                <img
                  src="/app-screenshot.png.jpg"
                  alt="앱 실행 화면 예시 (AI 스캔 중)"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // 이미지 로드 실패 시 플레이스홀더 표시
                    const img = e.target as HTMLImageElement;
                    img.style.display = "none";
                    const placeholder = img.nextElementSibling as HTMLElement;
                    if (placeholder) {
                      placeholder.style.display = "flex";
                    }
                  }}
                />
                {/* 이미지가 없을 경우 표시되는 플레이스홀더 */}
                <div className="absolute inset-0 w-full h-full bg-slate-100 flex items-center justify-center text-center p-4 hidden">
                  <span className="text-slate-400">
                    앱 실행 화면 예시
                    <br />
                    (AI 스캔 중)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Background Decorative Circles */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-[#e1621c] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
      </header>

      {/* Problem Section */}
      <section
        id="problem-section"
        data-section-name="Problem Section"
        className="py-20 bg-white"
      >
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <div className="inline-block bg-orange-100 text-[#e1621c] px-4 py-1 rounded-full text-sm font-bold mb-6">
            WHY BATHLANCE?
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-8">
            피부가 좋아지지 않는 이유,
            <br />
            <span className="underline decoration-[#e1621c] decoration-4 underline-offset-4">
              매일 쓰는 용품
            </span>{" "}
            때문일 수 있습니다.
          </h2>
          <p className="text-slate-600 text-lg leading-relaxed mb-12">
            칫솔, 샤워볼, 수건... 언제 교체하셨나요? <br />
            오염된 욕실 용품은 피부 트러블의 주범입니다. <br />
            교체 시기를 놓치면 위생 문제뿐만 아니라 비효율적인 소비로
            이어집니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {[
              {
                title: "보이지 않는 세균",
                desc: "오래된 샤워볼에는 변기보다 많은 세균이 번식합니다.",
              },
              {
                title: "피부 트러블 유발",
                desc: "오염된 용품 사용은 등드름, 좁쌀 여드름의 원인입니다.",
              },
              {
                title: "낭비되는 비용",
                desc: "재고 파악이 안 되어 중복 구매하거나 급하게 비싸게 삽니다.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-6 bg-slate-50 rounded-2xl border border-slate-100"
              >
                <AlertCircle className="w-10 h-10 text-[#e1621c] mb-4" />
                <h3 className="font-bold text-xl mb-2">{item.title}</h3>
                <p className="text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Features */}
      <section
        id="solution-section"
        data-section-name="Solution Section"
        className="py-20 bg-slate-50"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              BATHLANCE만의 솔루션
            </h2>
            <p className="text-slate-600">
              사진만 찍으세요. 나머지는 AI가 알아서 관리해 드립니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Smartphone,
                title: "사진 촬영으로 끝",
                desc: "귀찮은 날짜 입력 NO! 라벨을 인식해 교체 주기를 자동 설정합니다.",
              },
              {
                icon: ShieldCheck,
                title: "성분 안전 등급 분석",
                desc: "EWG 기반 데이터로 내 피부에 안전한지 즉시 알려드립니다.",
              },
              {
                icon: AlertCircle,
                title: "트러블 성분 필터링",
                desc: "나에게 맞지 않는 알레르기 유발 성분을 경고해줍니다.",
              },
              {
                icon: ShoppingBag,
                title: "재고 관리 & 자동 구매",
                desc: "떨어질 때쯤 알려주고 최저가로 바로 연결해드립니다.",
              },
              {
                icon: Leaf,
                title: "욕실 웰니스 루틴",
                desc: "단순 관리를 넘어 명상과 힐링이 있는 욕실 문화를 만듭니다.",
              },
              {
                icon: Check,
                title: "맞춤형 알림",
                desc: "사용자 라이프스타일에 딱 맞춘 스마트한 교체 알림.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
              >
                <feature.icon className="w-12 h-12 text-[#e1621c] mb-6" />
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="faq-section"
        data-section-name="FAQ Section"
        className="py-20 bg-white"
      >
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            자주 묻는 질문
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "서비스 이용료는 얼마인가요?",
                a: "현재 베타 서비스 기간으로 모든 기능을 무료로 이용하실 수 있습니다.",
              },
              {
                q: "사진만 찍으면 정말 다 되나요?",
                a: "네, AI가 제품을 인식하여 카테고리를 분류하고 평균 사용 주기를 제안합니다.",
              },
              {
                q: "아이폰, 안드로이드 모두 되나요?",
                a: "네, 모바일 웹 환경과 추후 출시될 앱 모두 지원할 예정입니다.",
              },
              {
                q: "개인정보는 안전한가요?",
                a: "모든 데이터는 암호화되어 안전하게 관리되며 마케팅 용도로 남용되지 않습니다.",
              },
            ].map((faq, idx) => (
              <details key={idx} className="group bg-slate-50 rounded-xl">
                <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-6">
                  <span>{faq.q}</span>
                  <span className="transition group-open:rotate-180">
                    <ArrowRight className="w-5 h-5 rotate-90" />
                  </span>
                </summary>
                <div className="text-slate-600 px-6 pb-6">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / Application Form */}
      <section
        id="apply-form"
        data-section-name="Application Form"
        className="py-24 bg-[#f7e0a4]"
      >
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8 md:p-12">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">사전 알림 신청하기</h2>
                <p className="text-slate-600">
                  가장 먼저 BATHLANCE를 경험해보세요.
                  <br />
                  런칭 시 특별한 혜택을 드립니다.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    이름
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-[#e1621c] focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                    placeholder="홍길동"
                  />
                </div>
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    연락처
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-[#e1621c] focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                    placeholder="010-0000-0000"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    이메일
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-[#e1621c] focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                    placeholder="example@email.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#e1621c] text-white font-bold py-4 rounded-lg hover:bg-[#c54e0b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      신청 처리중...
                    </>
                  ) : (
                    "무료 사전 신청하기"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" data-section-name="Footer" className="bg-slate-900 text-slate-400 py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="text-2xl font-bold text-white mb-6">BATHLANCE</div>
          <p className="mb-8">욕실에서 시작되는 건강한 라이프스타일</p>
          <div className="text-sm">
            &copy; 2025 BATHLANCE. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
