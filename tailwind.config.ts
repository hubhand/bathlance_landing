import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ▼▼▼ 폰트 설정이 여기에 들어있습니다 ▼▼▼
      fontFamily: {
        // 'MyCustomFont' 부분을 아까 globals.css에 적은 이름과 똑같이 맞춰주세요!
        sans: ['NanumL.otf', 'sans-serif'],
      },
      // ▲▲▲ 여기까지 ▲▲▲
    },
  },
  plugins: [],
};
export default config;