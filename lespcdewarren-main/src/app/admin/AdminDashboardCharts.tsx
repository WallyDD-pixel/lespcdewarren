"use client";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

type ChartData = { labels: string[]; datasets: { label: string; data: number[]; borderColor: string; backgroundColor: string; yAxisID?: string }[] };
type MarketChartData = { labels: string[]; datasets: { label: string; data: number[]; borderColor: string; backgroundColor: string }[] };

export default function AdminDashboardCharts({
  chartData,
  marketChartData,
  days,
  hasMarketDaily,
}: {
  chartData: ChartData;
  marketChartData: MarketChartData;
  days: number;
  hasMarketDaily: boolean;
}) {
  return (
    <>
      <div className="section-contrast p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Performance (global) ({days} j)</h2>
        </div>
        <div style={{ height: 220 }}>
          <Line
            data={chartData}
            options={{
              maintainAspectRatio: false,
              plugins: { legend: { labels: { color: "#eaeaea" } } },
              scales: { x: { ticks: { color: "#bbb" } }, y: { ticks: { color: "#bbb" } }, y2: { position: "right", grid: { drawOnChartArea: false }, ticks: { color: "#bbb" } } },
            }}
          />
        </div>
      </div>

      {hasMarketDaily && (
        <div className="section-contrast p-4 mt-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Marketplace (brut vs vendeurs vs frais) ({days} j)</h2>
          </div>
          <div style={{ height: 220 }}>
            <Line
              data={marketChartData}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: "#eaeaea" } } },
                scales: { x: { ticks: { color: "#bbb" } }, y: { ticks: { color: "#bbb" } } },
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
