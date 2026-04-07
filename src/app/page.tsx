"use client";

import { useState } from "react";
import type { CompanyData, AnalysisResponse } from "@/lib/types";
import SearchBar from "@/components/SearchBar";
import CompanyCard from "@/components/CompanyCard";
import SelectionBanner from "@/components/SelectionBanner";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<CompanyData | null>(null);
  const [competitors, setCompetitors] = useState<CompanyData[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const allCompanies: CompanyData[] = target
    ? [target, ...competitors]
    : competitors;

  const selectedCompany =
    allCompanies.find((c) => c.ticker === selectedTicker) ?? null;

  const handleSearch = async (ticker: string) => {
    setIsLoading(true);
    setError(null);
    setTarget(null);
    setCompetitors([]);
    setSelectedTicker(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      const result: AnalysisResponse = await response.json();

      if (!result.success || !result.data) {
        setError(result.error ?? "分析に失敗しました。もう一度お試しください。");
        return;
      }

      setTarget(result.data.target);
      setCompetitors(result.data.competitors);
    } catch {
      setError("サーバーとの通信に失敗しました。ネットワーク接続を確認してください。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (ticker: string) => {
    setSelectedTicker((prev) => (prev === ticker ? null : ticker));
  };

  const hasResults = target !== null;

  return (
    <div className="flex flex-col flex-1 bg-light-bg dark:bg-dark-bg">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-white"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-text dark:text-gray-100">
            株式バリュー投資分析ツール
          </h1>
        </div>
      </header>

      <main className="flex-1">
        {!hasResults && !isLoading && (
          <section className="flex flex-col items-center justify-center min-h-[70vh] px-4">
            <div className="text-center mb-10 animate-fade-in">
              <h2 className="text-4xl sm:text-5xl font-bold text-text dark:text-gray-100 mb-4">
                株式バリュー投資
                <span className="text-primary">分析ツール</span>
              </h2>
              <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                バリュー投資家の視点で、最適な投資先を見つけましょう
              </p>
            </div>
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
            <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm text-gray-400 dark:text-gray-500">
              <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
                PER / PBR 分析
              </span>
              <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
                財務健全性チェック
              </span>
              <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
                同業他社比較
              </span>
              <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
                AI スコアリング
              </span>
            </div>
          </section>
        )}

        {(hasResults || isLoading) && (
          <section className="max-w-6xl mx-auto px-4 py-6">
            <div className="mb-6">
              <SearchBar onSearch={handleSearch} isLoading={isLoading} />
            </div>

            {isLoading && (
              <div className="flex flex-col items-center justify-center py-20">
                <svg
                  className="animate-spin h-12 w-12 text-primary mb-4"
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
                <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
                  企業データを分析中...
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  財務データの取得と同業他社の比較を行っています
                </p>
              </div>
            )}

            {error && (
              <div
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                  rounded-xl p-4 mb-6 animate-fade-in"
              >
                <div className="flex items-center gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-red-500 shrink-0"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {hasResults && !isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-20">
                {allCompanies.map((company, index) => (
                  <div
                    key={company.ticker}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CompanyCard
                      company={company}
                      isSelected={selectedTicker === company.ticker}
                      onSelect={() => handleSelect(company.ticker)}
                      allCompanies={allCompanies}
                      isTarget={company.ticker === target?.ticker}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <SelectionBanner company={selectedCompany} />
    </div>
  );
}
