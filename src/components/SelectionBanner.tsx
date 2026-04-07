"use client";

import type { CompanyData } from "@/lib/types";

interface SelectionBannerProps {
  company: CompanyData | null;
}

export default function SelectionBanner({ company }: SelectionBannerProps) {
  if (!company) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50
        bg-primary text-white py-3 px-6
        shadow-lg shadow-primary/30 animate-slide-up"
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-white/80"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm sm:text-base font-medium">
            現在の購入検討候補:{" "}
            <span className="font-bold">{company.name}</span>
            {" - "}
            スコア
            <span className="font-bold"> {company.score}点</span>
          </span>
        </div>
        <span
          className={`
            inline-flex items-center justify-center w-8 h-8 rounded-full
            bg-white/20 text-white font-bold text-sm
          `}
        >
          {company.rank}
        </span>
      </div>
    </div>
  );
}
