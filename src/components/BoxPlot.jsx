import { formatStat, quantile } from "../utils/format";
import {
  ResponsiveContainer,
  ComposedChart,
  YAxis,
  CartesianGrid,
  Tooltip,
  Customized,
  XAxis,
  ReferenceLine,
} from "recharts";

export function BoxPlot({
  data,
  width = "100%",
  height = 200,
  unit = "s",
  title = "Cycle Time Distribution",
  rangeMin = 0,
  rangeMax = null,
}) {
  if (data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[#666]">
        No data available
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => a - b);
  const boxQ1 = quantile(sorted, 0.25);
  const boxMedian = quantile(sorted, 0.5);
  const boxQ3 = quantile(sorted, 0.75);
  const boxMin = sorted[0];
  const boxMax = sorted[sorted.length - 1];

  if (rangeMax == null) {
    rangeMax = boxMax + 0.1 * (boxMax - boxMin);
  }

  const step = (rangeMax - rangeMin) <= 10 ? 0.5 : Math.ceil((rangeMax - rangeMin) / 10);
  const ticks = [];
  for (let i = rangeMin; i <= rangeMax; i += step) {
    ticks.push(Number(i.toFixed(1)));
  }

  return (
    <div className="mt-4">
      <div className="text-xs text-[#666] mb-2">{title.toUpperCase()} ({unit.trim()})</div>
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width={width} height={height}>
          <ComposedChart
            data={[{ name: "dummy", x: boxMedian }]} // give XAxis a key to map
            margin={{ top: 10, right: 10, left: 10, bottom: 30 }}
          >
            <CartesianGrid stroke="#f7fafc" />

            {/* Bottom X axis with proper ticks */}
            <XAxis
              type="number"
              dataKey="x"
              domain={[rangeMin, rangeMax]}
              ticks={ticks}
              tickFormatter={(v) => `${v}`}
              stroke="#666"
              axisLine={true}
              tickLine={true}
              tick={{ fill: "#666", fontSize: 11 }}
              allowDecimals
            />

            <Tooltip formatter={(v) => `${v}${unit}`} />

            {/* Reference lines */}
            {[["Min", boxMin], ["Q1", boxQ1], ["Median", boxMedian], ["Q3", boxQ3], ["Max", boxMax]].map(
              ([label, val]) => (
                <ReferenceLine
                  key={label}
                  x={val}
                  stroke={label === "Median" ? "#d33" : "#999"}
                  strokeDasharray={label === "Median" ? "4 2" : "3 3"}
                  label={{
                    value: `${label} (${val}${unit})`,
                    position: "bottom",
                    fill: label === "Median" ? "#d33" : "#555",
                    fontSize: 11,
                  }}
                />
              )
            )}

            {/* Custom box plot */}
            <Customized
              component={({ width: containerWidth, height: containerHeight }) => {
                const h = typeof containerHeight === "number" ? containerHeight : height;
                const w = typeof containerWidth === "number" ? containerWidth : (typeof width === "number" ? width : 400);

                const cy = h / 2;
                const boxH = Math.min(80, h * 0.3);
                const capH = Math.min(24, boxH);

                const drawWidth = Math.max(0, w - 20);

                const scale = (val) =>
                  ((val - rangeMin) / (rangeMax - rangeMin)) * drawWidth + 10; // base width for drawing

                const xMin = scale(boxMin);
                const xMax = scale(boxMax);
                const xQ1 = scale(boxQ1);
                const xQ3 = scale(boxQ3);
                const xMedian = scale(boxMedian);

                return (
                  <g>
                    {/* Whisker */}
                    <line x1={xMin} x2={xMax} y1={cy} y2={cy} stroke="#445f8b" strokeWidth={1.2} />
                    {/* Caps */}
                    <line
                      x1={xMin}
                      x2={xMin}
                      y1={cy - capH / 2}
                      y2={cy + capH / 2}
                      stroke="#445f8b"
                      strokeWidth={1.2}
                    />
                    <line
                      x1={xMax}
                      x2={xMax}
                      y1={cy - capH / 2}
                      y2={cy + capH / 2}
                      stroke="#445f8b"
                      strokeWidth={1.2}
                    />
                    {/* Box */}
                    <rect
                      x={Math.min(xQ1, xQ3)}
                      y={cy - boxH / 2}
                      width={Math.abs(xQ3 - xQ1)}
                      height={boxH}
                      fill="#fff"
                      stroke="#445f8b"
                      strokeWidth={1.5}
                    />
                    {/* Median line */}
                    <line
                      x1={xMedian}
                      x2={xMedian}
                      y1={cy - boxH / 2}
                      y2={cy + boxH / 2}
                      stroke="#445f8b"
                      strokeWidth={2}
                    />
                  </g>
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="text-sm text-[#666] mt-2 flex flex-row flex-wrap justify-center items-center">
        <strong>Q1:</strong>&nbsp;{formatStat(boxQ1)}
        {unit} <strong className="ml-3">Median:</strong>&nbsp;{formatStat(boxMedian)}
        {unit} <strong className="ml-3">Q3:</strong>&nbsp;{formatStat(boxQ3)}
        {unit}
      </div>
    </div>
  );
}
