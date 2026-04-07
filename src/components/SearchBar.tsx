"use client";

import { useState } from "react";

interface SearchBarProps {
  onSearch: (ticker: string) => void;
  isLoading: boolean;
}

export default function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [ticker, setTicker] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = ticker.trim();
    if (trimmed.length === 0) return;
    onSearch(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="証券コードを入力（例: 7203, AAPL）"
            disabled={isLoading}
            className="w-full px-6 py-4 text-lg rounded-xl border-2 border-gray-200
              bg-white text-text placeholder-gray-400
              focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
              dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100
              dark:placeholder-gray-500 dark:focus:border-primary"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || ticker.trim().length === 0}
          className="px-8 py-4 text-lg font-semibold text-white rounded-xl
            bg-primary hover:bg-primary/90 active:bg-primary/80
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200 hover:shadow-lg hover:shadow-primary/25
            flex items-center justify-center gap-2 min-w-[140px]"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
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
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span>分析中...</span>
            </>
          ) : (
            "分析開始"
          )}
        </button>
      </div>
    </form>
  );
}
