interface ScoreResult {
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

export function calculateScore(
  per: number | null,
  pbr: number | null,
  roe: number | null,
  equityRatio: number | null,
): ScoreResult {
  const perScore = per === null ? 0 : per <= 15 ? 25 : per <= 20 ? 10 : 0;
  const pbrScore = pbr === null ? 0 : pbr <= 1 ? 25 : pbr <= 1.5 ? 10 : 0;
  const equityScore =
    equityRatio === null ? 0 : equityRatio >= 50 ? 25 : equityRatio >= 30 ? 10 : 0;
  const roeScore = roe === null ? 0 : roe >= 8 ? 25 : roe >= 5 ? 10 : 0;

  const cheapness = perScore + pbrScore;
  const soundness = equityScore;
  const profitability = roeScore;
  const score = cheapness + soundness + profitability;

  const rank: ScoreResult['rank'] =
    score >= 90 ? 'S' : score >= 70 ? 'A' : score >= 50 ? 'B' : 'C';

  return {
    score,
    scoreBreakdown: { cheapness, perScore, pbrScore, soundness, profitability },
    rank,
  };
}
