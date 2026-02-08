import { TrendUp } from "@phosphor-icons/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function smoothSeries(points, getter, windowSize = 5) {
  if (!points.length) return [];
  const half = Math.floor(windowSize / 2);
  return points.map((_, index) => {
    const start = Math.max(0, index - half);
    const end = Math.min(points.length - 1, index + half);
    const windowPoints = points.slice(start, end + 1);
    const sum = windowPoints.reduce((acc, p) => acc + getter(p), 0);
    return sum / windowPoints.length;
  });
}

function ProgressionCharts({ matchStats }) {
  const sorted = [...matchStats].sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );

  const smoothedAccuracy = smoothSeries(sorted, (s) => s.accuracy);
  const smoothedCycleTime = smoothSeries(sorted, (s) => s.avgCycleTime);
  const smoothedBallsPerTwoMinutes = smoothSeries(
    sorted,
    (s) => (Number.isFinite(s.ballsPerTwoMinutes) ? s.ballsPerTwoMinutes : 0),
  );

  const chartData = sorted.map((stat, index) => ({
    ...stat,
    timestamp: new Date(stat.date).getTime(),
    smoothedAccuracy: smoothedAccuracy[index],
    smoothedAvgCycleTime: smoothedCycleTime[index],
    smoothedBallsPerTwoMinutes: smoothedBallsPerTwoMinutes[index],
  }));

  return (
    <div className="bg-brand-bg border border-brand-border rounded-xl p-4 sm:p-6 mb-8">
      <h2 className="text-3xl mb-5 flex items-center gap-3">
        <TrendUp weight="bold" size={32} />
        Progression
      </h2>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-3">Accuracy Over Time</h3>
        <div className="h-80 border border-brand-border rounded-lg bg-brand-bg">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
            >
              <CartesianGrid stroke="var(--color-brand-border)" strokeDasharray="0" />
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={["auto", "auto"]}
                tickFormatter={(value) =>
                  new Date(value).toLocaleString("en-US")
                }
                stroke="var(--color-brand-muted)"
                style={{ fontSize: "12px", fontFamily: "League Spartan" }}
                interval="preserveStartEnd"
                minTickGap={20}
                angle={-35}
                textAnchor="end"
                height={60}
              />
              <YAxis
                domain={[0, 100]}
                stroke="var(--color-brand-muted)"
                style={{ fontSize: "12px", fontFamily: "League Spartan" }}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-brand-bg)",
                  border: "2px solid var(--color-brand-border)",
                  fontFamily: "League Spartan",
                }}
                formatter={(value) => [`${value.toFixed(1)}%`, "Accuracy"]}
                labelFormatter={(label, payload) => payload[0]?.payload.name}
              />
              <Line
                type="monotone"
                dataKey="smoothedAccuracy"
                stroke="var(--color-brand-accent)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-3">
          Average Cycle Time Over Time
        </h3>
        <div className="h-80 border border-brand-border rounded-lg bg-brand-bg">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
            >
              <CartesianGrid stroke="var(--color-brand-border)" strokeDasharray="0" />
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={["auto", "auto"]}
                tickFormatter={(value) =>
                  new Date(value).toLocaleString("en-US")
                }
                stroke="var(--color-brand-muted)"
                style={{ fontSize: "12px", fontFamily: "League Spartan" }}
                interval="preserveStartEnd"
                minTickGap={20}
                angle={-35}
                textAnchor="end"
                height={60}
              />
              <YAxis
                stroke="var(--color-brand-muted)"
                style={{ fontSize: "12px", fontFamily: "League Spartan" }}
                tickFormatter={(val) => `${val}s`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-brand-bg)",
                  border: "2px solid var(--color-brand-border)",
                  fontFamily: "League Spartan",
                }}
                formatter={(value) => [`${value.toFixed(1)}s`, "Avg Cycle Time"]}
                labelFormatter={(label, payload) => payload[0]?.payload.name}
              />
              <Line
                type="monotone"
                dataKey="smoothedAvgCycleTime"
                stroke="var(--color-brand-accent)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-3">
          Balls Scored per 2 Minutes
        </h3>
        <div className="h-80 border border-brand-border rounded-lg bg-brand-bg">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
            >
              <CartesianGrid stroke="var(--color-brand-border)" strokeDasharray="0" />
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={["auto", "auto"]}
                tickFormatter={(value) =>
                  new Date(value).toLocaleString("en-US")
                }
                stroke="var(--color-brand-muted)"
                style={{ fontSize: "12px", fontFamily: "League Spartan" }}
                interval="preserveStartEnd"
                minTickGap={20}
                angle={-35}
                textAnchor="end"
                height={60}
              />
              <YAxis
                stroke="var(--color-brand-muted)"
                style={{ fontSize: "12px", fontFamily: "League Spartan" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-brand-bg)",
                  border: "2px solid var(--color-brand-border)",
                  fontFamily: "League Spartan",
                }}
                formatter={(value) => [
                  `${value.toFixed(1)}`,
                  "Balls Scored / 2 min",
                ]}
                labelFormatter={(label, payload) => payload[0]?.payload.name}
              />
              <Line
                type="monotone"
                dataKey="smoothedBallsPerTwoMinutes"
                stroke="var(--color-brand-accent)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default ProgressionCharts;