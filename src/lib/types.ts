export interface CompanyData {
  ticker: string;
  name: string;
  description: string;
  per: number | null;
  pbr: number | null;
  roe: number | null;
  equityRatio: number | null;
  businessSummary: string;
  businessKeywords: string[];
  score: number;
  scoreBreakdown: {
    cheapness: number;
    perScore: number;
    pbrScore: number;
    soundness: number;
    profitability: number;
  };
  rank: 'S' | 'A' | 'B' | 'C';
}

export interface AnalysisResponse {
  success: boolean;
  data?: {
    target: CompanyData;
    competitors: CompanyData[];
  };
  error?: string;
}
