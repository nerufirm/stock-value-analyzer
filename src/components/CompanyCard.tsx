"use client";

import { useState } from "react";
import type { CompanyData } from "@/lib/types";
import RadarChart from "./RadarChart";

interface CompanyCardProps {
  company: CompanyData;
  isSelected: boolean;
  onSelect: () => void;
  allCompanies: CompanyData[];
  isTarget?: boolean;
}

function getRankColor(rank: CompanyData["rank"]): string {
  const colors: Record<CompanyData["rank"], string> = {
    S: "bg-rank-s",
    A: "bg-rank-a",
    B: "bg-rank-b",
    C: "bg-rank-c",
  };
  return colors[rank];
}

function getRankTextColor(rank: CompanyData["rank"]): string {
  const colors: Record<CompanyData["rank"], string> = {
    S: "text-rank-s",
    A: "text-rank-a",
    B: "text-rank-b",
    C: "text-rank-c",
  };
  return colors[rank];
}

function isBestValue(
  company: CompanyData,
  allCompanies: CompanyData[],
  field: keyof Pick<CompanyData, "per" | "pbr" | "roe" | "equityRatio">
): boolean {
  const value = company[field];
  if (value === null) return false;

  const validCompanies = allCompanies.filter((c) => c[field] !== null);
  if (validCompanies.length <= 1) return false;

  if (field === "per" || field === "pbr") {
    const positiveValues = validCompanies
      .map((c) => c[field] as number)
      .filter((v) => v > 0);
    if (positiveValues.length === 0) return false;
    return value === Math.min(...positiveValues) && value > 0;
  }
  if (field === "roe" || field === "equityRatio") {
    const max = Math.max(...validCompanies.map((c) => c[field] as number));
    return value === max;
  }
  return false;
}

function formatValue(value: number | null, suffix: string = ""): string {
  if (value === null) return "- -";
  return `${value.toFixed(2)}${suffix}`;
}

function getScoreJudgment(
  field: string,
  value: number | null,
): { label: string; color: string } {
  if (value === null) return { label: "データなし", color: "text-gray-400" };

  if (field === "per") {
    if (value <= 15) return { label: "割安", color: "text-rank-s" };
    if (value <= 20) return { label: "やや割安", color: "text-rank-b" };
    return { label: "割高", color: "text-rank-c" };
  }
  if (field === "pbr") {
    if (value <= 1) return { label: "割安", color: "text-rank-s" };
    if (value <= 1.5) return { label: "やや割安", color: "text-rank-b" };
    return { label: "割高", color: "text-rank-c" };
  }
  if (field === "roe") {
    if (value >= 8) return { label: "高収益", color: "text-rank-s" };
    if (value >= 5) return { label: "普通", color: "text-rank-b" };
    return { label: "低収益", color: "text-rank-c" };
  }
  if (field === "equityRatio") {
    if (value >= 50) return { label: "堅実", color: "text-rank-s" };
    if (value >= 30) return { label: "普通", color: "text-rank-b" };
    return { label: "要注意", color: "text-rank-c" };
  }
  return { label: "", color: "" };
}

function getScoreReasonText(company: CompanyData): string {
  const reasons: string[] = [];
  const bd = company.scoreBreakdown;

  // PER
  if (company.per === null) {
    reasons.push("PER: データなし (0点)");
  } else if (bd.perScore === 25) {
    reasons.push(`PER ${company.per.toFixed(1)}倍 → 15倍以下で割安 (+25点)`);
  } else if (bd.perScore === 10) {
    reasons.push(`PER ${company.per.toFixed(1)}倍 → 15〜20倍でやや割安 (+10点)`);
  } else {
    reasons.push(`PER ${company.per.toFixed(1)}倍 → 20倍超で割高 (+0点)`);
  }

  // PBR
  if (company.pbr === null) {
    reasons.push("PBR: データなし (0点)");
  } else if (bd.pbrScore === 25) {
    reasons.push(`PBR ${company.pbr.toFixed(2)}倍 → 1倍以下で割安 (+25点)`);
  } else if (bd.pbrScore === 10) {
    reasons.push(`PBR ${company.pbr.toFixed(2)}倍 → 1〜1.5倍でやや割安 (+10点)`);
  } else {
    reasons.push(`PBR ${company.pbr.toFixed(2)}倍 → 1.5倍超で割高 (+0点)`);
  }

  // Equity
  if (company.equityRatio === null) {
    reasons.push("自己資本比率: データなし (0点)");
  } else if (bd.soundness === 25) {
    reasons.push(`自己資本比率 ${company.equityRatio.toFixed(1)}% → 50%以上で堅実 (+25点)`);
  } else if (bd.soundness === 10) {
    reasons.push(`自己資本比率 ${company.equityRatio.toFixed(1)}% → 30〜50%で普通 (+10点)`);
  } else {
    reasons.push(`自己資本比率 ${company.equityRatio.toFixed(1)}% → 30%未満で要注意 (+0点)`);
  }

  // ROE
  if (company.roe === null) {
    reasons.push("ROE: データなし (0点)");
  } else if (bd.profitability === 25) {
    reasons.push(`ROE ${company.roe.toFixed(1)}% → 8%以上で高収益 (+25点)`);
  } else if (bd.profitability === 10) {
    reasons.push(`ROE ${company.roe.toFixed(1)}% → 5〜8%で普通 (+10点)`);
  } else {
    reasons.push(`ROE ${company.roe.toFixed(1)}% → 5%未満で低収益 (+0点)`);
  }

  return reasons.join("\n");
}

export default function CompanyCard({
  company,
  isSelected,
  onSelect,
  allCompanies,
  isTarget = false,
}: CompanyCardProps) {
  const [descExpanded, setDescExpanded] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);

  const radarData = {
    per: company.scoreBreakdown.perScore,
    pbr: company.scoreBreakdown.pbrScore,
    soundness: company.scoreBreakdown.soundness,
    profitability: company.scoreBreakdown.profitability,
  };

  const metrics: {
    label: string;
    hint: string;
    field: keyof Pick<CompanyData, "per" | "pbr" | "roe" | "equityRatio">;
    suffix: string;
  }[] = [
    { label: "PER", hint: "株価÷利益。低いほど割安", field: "per", suffix: "倍" },
    { label: "PBR", hint: "株価÷純資産。1倍以下は割安", field: "pbr", suffix: "倍" },
    { label: "ROE", hint: "自己資本でどれだけ稼ぐか", field: "roe", suffix: "%" },
    { label: "自己資本比率", hint: "返済不要な資本の割合。高いほど安全", field: "equityRatio", suffix: "%" },
  ];

  return (
    <div
      className={`
        relative rounded-2xl border-2 p-5 transition-all duration-300
        hover:shadow-xl hover:-translate-y-1 animate-fade-in
        ${
          isSelected
            ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 dark:bg-primary/10"
            : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
        }
      `}
    >
      {isTarget && (
        <span
          className="absolute -top-3 left-4 px-3 py-0.5 text-xs font-bold
            bg-accent text-white rounded-full shadow-sm"
        >
          本命
        </span>
      )}

      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-text dark:text-gray-100 break-words">
            {company.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {company.ticker}
          </p>
        </div>
        <div className="flex flex-col items-center ml-3 shrink-0">
          <span
            className={`
              inline-flex items-center justify-center w-10 h-10 rounded-full
              text-white font-bold text-lg ${getRankColor(company.rank)}
            `}
          >
            {company.rank}
          </span>
          <span
            className={`text-2xl font-bold mt-1 ${getRankTextColor(company.rank)}`}
          >
            {company.score}
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              点
            </span>
          </span>
        </div>
      </div>

      {/* Score reason toggle */}
      <button
        type="button"
        onClick={() => setReasonOpen((prev) => !prev)}
        className="mb-3 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400
          hover:text-primary dark:hover:text-blue-300 transition-colors cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-3.5 w-3.5 transition-transform ${reasonOpen ? "rotate-90" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
        {company.rank}ランク・{company.score}点の評価理由
      </button>
      {reasonOpen && (
        <div className="mb-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 text-xs leading-relaxed animate-fade-in">
          <div className="space-y-1.5">
            <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <span className={`inline-block w-6 h-6 rounded-full text-white text-center leading-6 text-[10px] font-bold ${getRankColor(company.rank)}`}>
                {company.rank}
              </span>
              割安性 {company.scoreBreakdown.cheapness}/50点 ・ 健全性 {company.scoreBreakdown.soundness}/25点 ・ 収益性 {company.scoreBreakdown.profitability}/25点
            </div>
            {getScoreReasonText(company).split("\n").map((line) => (
              <p key={line} className="text-gray-600 dark:text-gray-400 pl-1">
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      {company.businessKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {company.businessKeywords.map((keyword) => (
            <span
              key={keyword}
              className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full
                bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300"
            >
              #{keyword}
            </span>
          ))}
        </div>
      )}

      {/* Description with expand/collapse */}
      {company.description.length > 0 && (
        <div className="mb-4">
          <p
            className={`text-xs text-gray-600 dark:text-gray-400 leading-relaxed
              ${descExpanded ? "" : "line-clamp-3"}`}
          >
            {company.description}
          </p>
          {company.description.length > 80 && (
            <button
              type="button"
              onClick={() => setDescExpanded((prev) => !prev)}
              className="mt-1 text-xs text-primary hover:text-primary/80
                dark:text-blue-300 dark:hover:text-blue-200 cursor-pointer transition-colors"
            >
              {descExpanded ? "閉じる" : "...全文を読む"}
            </button>
          )}
        </div>
      )}

      <div className="flex justify-center mb-4">
        <RadarChart data={radarData} />
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
        <table className="w-full text-sm">
          <tbody>
            {metrics.map((metric) => {
              const value = company[metric.field];
              const isNull = value === null;
              const best = isBestValue(company, allCompanies, metric.field);
              const judgment = getScoreJudgment(metric.field, value);
              return (
                <tr
                  key={metric.field}
                  className="border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <td className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 w-[45%]">
                    <div className="flex items-center gap-1">
                      <span>{metric.label}</span>
                      <span className={`text-[10px] font-normal ${judgment.color}`}>
                        {judgment.label}
                      </span>
                    </div>
                    <div className="text-[10px] font-normal text-gray-400 dark:text-gray-500">
                      {metric.hint}
                    </div>
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-semibold
                      ${
                        isNull
                          ? "text-gray-300 dark:text-gray-600"
                          : best
                            ? "text-primary bg-primary/5 dark:bg-primary/10"
                            : "text-text dark:text-gray-200"
                      }
                    `}
                  >
                    {formatValue(value, metric.suffix)}
                    {best && (
                      <span className="ml-1.5 text-xs text-primary font-bold">
                        BEST
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={onSelect}
        className={`
          w-full py-2.5 px-4 rounded-xl text-sm font-semibold
          transition-all duration-200 cursor-pointer
          ${
            isSelected
              ? "bg-primary text-white shadow-md shadow-primary/25"
              : "bg-gray-100 text-gray-700 hover:bg-primary/10 hover:text-primary dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-primary/20 dark:hover:text-blue-300"
          }
        `}
      >
        {isSelected ? "候補に選択中" : "この銘柄を候補に選ぶ"}
      </button>
    </div>
  );
}
