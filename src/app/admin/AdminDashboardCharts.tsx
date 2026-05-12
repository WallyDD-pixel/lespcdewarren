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

type ChartData = {
  labels: string[];
  datasets: { label: string; data: number[]; borderColor: string; backgroundColor: string; yAxisID?: string }[];
};

export default function AdminDashboardCharts({ chartData, days }: { chartData: ChartData; days: number }) {
  return (
    <div className="section-contrast p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Performance boutique ({days} j)</h2>
      </div>
      <div style={{ height: 220 }}>
        <Line
          data={chartData}
          options={{
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: "#eaeaea" } } },
            scales: {
              x: { ticks: { color: "#bbb" } },
              y: { ticks: { color: "#bbb" } },
              y2: { position: "right", grid: { drawOnChartArea: false }, ticks: { color: "#bbb" } },
            },
          }}
        />
      </div>
    </div>
  );
}
