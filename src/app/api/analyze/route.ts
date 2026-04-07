import YahooFinance from 'yahoo-finance2';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateScore } from '@/lib/scoring';
import type { CompanyData, AnalysisResponse } from '@/lib/types';

const yahooFinance = new YahooFinance();

function normalizeTicker(ticker: string): string {
  const trimmed = ticker.trim().toUpperCase();
  if (/^\d+$/.test(trimmed)) {
    return `${trimmed}.T`;
  }
  return trimmed;
}

interface FinancialData {
  ticker: string;
  name: string;
  per: number | null;
  pbr: number | null;
  roe: number | null;
  equityRatio: number | null;
  businessSummary: string;
}

interface QuoteSummaryData {
  [key: string]: unknown;
  summaryDetail?: {
    trailingPE?: number;
    forwardPE?: number;
    priceToBook?: number;
  };
  defaultKeyStatistics?: {
    forwardPE?: number;
    priceToBook?: number;
  };
  financialData?: {
    returnOnEquity?: number;
    debtToEquity?: number;
  };
  assetProfile?: {
    name?: string;
    longBusinessSummary?: string;
    industryKey?: string;
  };
  price?: {
    shortName?: string | null;
    longName?: string | null;
  };
  balanceSheetHistory?: {
    balanceSheetStatements?: Array<{
      totalStockholderEquity?: { raw?: number };
      totalAssets?: { raw?: number };
    }>;
  };
}

function extractFinancials(
  ticker: string,
  result: QuoteSummaryData,
): FinancialData {
  const summaryDetail = result.summaryDetail;
  const keyStats = result.defaultKeyStatistics;
  const financialData = result.financialData;
  const assetProfile = result.assetProfile;
  const price = result.price;

  const per =
    summaryDetail?.trailingPE ??
    summaryDetail?.forwardPE ??
    keyStats?.forwardPE ??
    null;

  const pbr =
    summaryDetail?.priceToBook ??
    keyStats?.priceToBook ??
    null;

  const roeRaw = financialData?.returnOnEquity ?? null;
  const roe = roeRaw !== null ? roeRaw * 100 : null;

  let equityRatio: number | null = null;
  const balanceSheet = result.balanceSheetHistory?.balanceSheetStatements;
  if (balanceSheet && balanceSheet.length > 0) {
    const latest = balanceSheet[0];
    const equity = latest.totalStockholderEquity?.raw;
    const assets = latest.totalAssets?.raw;
    if (equity && assets && assets > 0) {
      equityRatio = (equity / assets) * 100;
    }
  }
  if (equityRatio === null) {
    const debtToEquity = financialData?.debtToEquity ?? null;
    if (debtToEquity !== null && debtToEquity >= 0) {
      equityRatio = 100 / (1 + debtToEquity / 100);
    }
  }

  const name =
    price?.shortName ??
    price?.longName ??
    assetProfile?.name ??
    ticker;

  const businessSummary = assetProfile?.longBusinessSummary ?? '';

  return {
    ticker,
    name,
    per: per !== undefined ? per : null,
    pbr: pbr !== undefined ? pbr : null,
    roe,
    equityRatio,
    businessSummary,
  };
}

async function fetchFinancialData(ticker: string): Promise<FinancialData> {
  const result = (await yahooFinance.quoteSummary(ticker, {
    modules: [
      'summaryDetail',
      'defaultKeyStatistics',
      'financialData',
      'assetProfile',
      'price',
      'balanceSheetHistory',
    ],
  })) as QuoteSummaryData;

  return extractFinancials(ticker, result);
}

// --- Gemini: single batch call for ALL companies ---

interface GeminiCompanyInfo {
  japaneseName: string;
  keywords: string[];
  description: string;
}

const MODELS_TO_TRY = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-2.5-flash'] as const;

async function batchEnrichWithGemini(
  companies: FinancialData[],
): Promise<Map<string, GeminiCompanyInfo>> {
  const fallbackMap = new Map<string, GeminiCompanyInfo>();
  for (const c of companies) {
    fallbackMap.set(c.ticker, {
      japaneseName: c.name,
      keywords: [],
      description: '',
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || companies.length === 0) return fallbackMap;

  const companiesBlock = companies
    .map((c, i) => {
      const summary = c.businessSummary
        ? c.businessSummary.slice(0, 800)
        : '(概要なし)';
      return `【企業${i + 1}】
ティッカー: ${c.ticker}
英語名: ${c.name}
概要: ${summary}`;
    })
    .join('\n\n');

  const prompt = `以下の${companies.length}社について、それぞれJSON形式で情報を返してください。

各企業について:
- "ticker": ティッカーをそのまま
- "japaneseName": 正式な日本語企業名（日本で知られている通称でOK。元から日本語ならそのまま）
- "keywords": 消費者がイメージしやすい具体的な事業・製品・サービス名を3つ（日本語、短い単語）
- "description": どんな会社か一般投資家向けに日本語300文字以内で説明（事業内容、主力製品、市場での立ち位置）

回答はJSON配列のみ。説明文や装飾は不要。
例: [{"ticker":"7203.T","japaneseName":"トヨタ自動車","keywords":["自動車","ハイブリッド車","TOYOTA"],"description":"トヨタ自動車は世界最大級の..."}]

${companiesBlock}`;

  const genAI = new GoogleGenerativeAI(apiKey);

  for (const modelName of MODELS_TO_TRY) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();

      // Strip markdown code fences
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

      const arrayMatch = text.match(/\[[\s\S]*\]/);
      if (!arrayMatch) continue;

      const parsed = JSON.parse(arrayMatch[0]) as Array<{
        ticker?: string;
        japaneseName?: string;
        keywords?: string[];
        description?: string;
      }>;

      if (!Array.isArray(parsed)) continue;

      const resultMap = new Map<string, GeminiCompanyInfo>();
      for (const item of parsed) {
        if (!item.ticker) continue;
        resultMap.set(item.ticker, {
          japaneseName:
            typeof item.japaneseName === 'string' && item.japaneseName.length > 0
              ? item.japaneseName
              : fallbackMap.get(item.ticker)?.japaneseName ?? item.ticker,
          keywords:
            Array.isArray(item.keywords) &&
            item.keywords.length > 0 &&
            item.keywords.every((k) => typeof k === 'string')
              ? item.keywords.slice(0, 3)
              : [],
          description:
            typeof item.description === 'string' && item.description.length > 0
              ? item.description.slice(0, 400)
              : '',
        });
      }

      // Merge: fill missing companies with fallback
      for (const c of companies) {
        if (!resultMap.has(c.ticker)) {
          resultMap.set(c.ticker, fallbackMap.get(c.ticker)!);
        }
      }
      return resultMap;
    } catch {
      // Try next model
      continue;
    }
  }

  return fallbackMap;
}

// --- Competitor finding ---

async function findCompetitorTickers(
  ticker: string,
  companyName: string,
  industryKey?: string,
): Promise<string[]> {
  const competitors: string[] = [];

  try {
    const recommended = await yahooFinance.recommendationsBySymbol(ticker);
    if (recommended?.recommendedSymbols) {
      for (const rec of recommended.recommendedSymbols) {
        if (rec.symbol && competitors.length < 3) {
          competitors.push(rec.symbol);
        }
      }
    }
  } catch {
    // not available
  }

  if (competitors.length < 3) {
    try {
      const searchResults = await yahooFinance.search(companyName, { newsCount: 0 });
      if (searchResults?.quotes) {
        for (const quote of searchResults.quotes) {
          if (!quote.isYahooFinance) continue;
          const q = quote as { symbol: string };
          if (q.symbol && q.symbol !== ticker && !competitors.includes(q.symbol) && competitors.length < 3) {
            competitors.push(q.symbol);
          }
        }
      }
    } catch {
      // fallback failed
    }
  }

  if (competitors.length < 3 && industryKey) {
    try {
      const results = await yahooFinance.search(industryKey, { newsCount: 0 });
      if (results?.quotes) {
        for (const quote of results.quotes) {
          if (!quote.isYahooFinance) continue;
          const q = quote as { symbol: string };
          if (q.symbol && q.symbol !== ticker && !competitors.includes(q.symbol) && competitors.length < 3) {
            competitors.push(q.symbol);
          }
        }
      }
    } catch {
      // fallback failed
    }
  }

  return competitors.slice(0, 3);
}

// --- Main handler ---

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as { ticker?: string };

    if (!body.ticker || typeof body.ticker !== 'string') {
      return Response.json(
        { success: false, error: '証券コードを入力してください' } satisfies AnalysisResponse,
        { status: 400 },
      );
    }

    const ticker = normalizeTicker(body.ticker);

    // 1. Fetch target financial data
    const targetFinancials = await fetchFinancialData(ticker);

    // 2. Find competitors
    let industryKey: string | undefined;
    try {
      const profile = (await yahooFinance.quoteSummary(ticker, {
        modules: ['assetProfile'],
      })) as QuoteSummaryData;
      industryKey = profile.assetProfile?.industryKey;
    } catch {
      // ignore
    }

    const competitorTickers = await findCompetitorTickers(
      ticker,
      targetFinancials.name,
      industryKey,
    );

    // 3. Fetch competitor financial data
    const competitorResults = await Promise.allSettled(
      competitorTickers.map((t) => fetchFinancialData(t)),
    );
    const competitorFinancials = competitorResults
      .filter((r): r is PromiseFulfilledResult<FinancialData> => r.status === 'fulfilled')
      .map((r) => r.value);

    const allFinancials = [targetFinancials, ...competitorFinancials];

    // 4. Single Gemini call for ALL companies (keywords + description + Japanese name)
    const geminiInfo = await batchEnrichWithGemini(allFinancials);

    // 5. Build CompanyData for each
    const allCompanyData: CompanyData[] = allFinancials.map((f) => {
      const info = geminiInfo.get(f.ticker);
      const { score, scoreBreakdown, rank } = calculateScore(f.per, f.pbr, f.roe, f.equityRatio);

      return {
        ticker: f.ticker,
        name: info?.japaneseName || f.name,
        description: info?.description || '',
        per: f.per,
        pbr: f.pbr,
        roe: f.roe,
        equityRatio: f.equityRatio,
        businessSummary: f.businessSummary,
        businessKeywords: info?.keywords?.length ? info.keywords : [],
        score,
        scoreBreakdown,
        rank,
      };
    });

    const response: AnalysisResponse = {
      success: true,
      data: {
        target: allCompanyData[0],
        competitors: allCompanyData.slice(1),
      },
    };

    return Response.json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '予期しないエラーが発生しました';
    return Response.json(
      { success: false, error: `分析に失敗しました: ${message}` } satisfies AnalysisResponse,
      { status: 500 },
    );
  }
}
