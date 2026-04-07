"use client";

import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

interface RadarChartProps {
  data: {
    per: number;
    pbr: number;
    soundness: number;
    profitability: number;
  };
}

function normalizeScore(value: number, max: number): number {
  return Math.min(100, Math.max(0, (value / max) * 100));
}

export default function RadarChart({ data }: RadarChartProps) {
  const chartData = [
    {
      label: "割安性(PER)",
      value: normalizeScore(data.per, 25),
    },
    {
      label: "割安性(PBR)",
      value: normalizeScore(data.pbr, 25),
    },
    {
      label: "財務健全性",
      value: normalizeScore(data.soundness, 25),
    },
    {
      label: "収益性",
      value: normalizeScore(data.profitability, 25),
    },
  ];

  return (
    <div className="w-[250px] h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#6b7280" }}
          />
          <Radar
            dataKey="value"
            stroke="#4A90E2"
            fill="#4A90E2"
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
