import { BasketballIcon, CricketIcon } from "@phosphor-icons/react";
import { formatTime } from "../utils/format";

const formatRoundedTimeLabel = (value) => {
  const rounded = Math.round((Number(value) || 0) / 1000) * 1000;
  return formatTime(Math.max(0, rounded));
};

function Timeline({ events = [], currentTime = 0 }) {
  const safeEvents = events || [];
  const safeCurrent = Number(currentTime) || 0;
  const maxTime = Math.max(
    safeCurrent,
    ...safeEvents.map((e) => Number(e.timestamp) || 0),
    1
  );

  return (
    <div className="w-full">
      <h3 className="text-2xl mb-5">Timeline</h3>
      <div className="bg-white p-4 sm:p-10 border-2 border-[#445f8b]">
        <div className="overflow-x-auto w-full pb-4">
          <div className="relative h-24 sm:h-32 min-w-[520px] sm:min-w-0 bg-white border-b-2 border-[#ddd] mb-2">
            {safeEvents.map((event, index) => {
              const timestamp = Number(event.timestamp) || 0;
              const position = (timestamp / maxTime) * 100;

              if (event.type === "cycle") {
                const successColor =
                  event.total > 0 && event.scored / event.total >= 0.5
                    ? "#2D6C3E"
                    : "#F44336";
                const balls = [];
                for (let i = 0; i < event.total; i += 1) {
                  const isScored = i < event.scored;
                  balls.push(
                    <div
                      key={i}
                      className="w-3 h-3 sm:w-6 sm:h-6 flex items-center justify-center"
                    >
                      <BasketballIcon
                        color={isScored ? successColor : "#ddd"}
                        className="w-full h-full"
                      />
                    </div>
                  );
                }

                return (
                  <div
                    key={`${timestamp}-${index}`}
                    className="absolute bottom-0 -translate-x-1/2 flex flex-col items-center"
                    style={{ left: `${position}%` }}
                    title={`${event.scored}/${event.total} at ${formatTime(
                      timestamp
                    )}`}
                  >
                    <div className="h-full flex flex-col-reverse items-center justify-start gap-1">
                      {balls}
                    </div>
                  </div>
                );
              }
              if (event.type === "gate") {
                return (
                  <div
                    key={`${timestamp}-gate-${index}`}
                    className="absolute top-0 h-full -translate-x-1/2"
                    style={{ left: `${position}%` }}
                    title={`Gate at ${formatTime(timestamp)}`}
                  >
                    <div className="w-5 sm:w-8 h-full bg-blue-50 text-white flex items-center justify-center font-bold border-2 border-blue-100">
                      <CricketIcon className="w-3 h-3 sm:w-5 sm:h-5 text-[#445f8b]" />
                    </div>
                  </div>
                );
              }
              return null;
            })}

            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[#2196f3] transition-all duration-100 before:content-[''] before:absolute before:-top-1.5 before:left-1/2 before:-translate-x-1/2 before:w-0 before:h-0 before:border-l-[6px] before:border-r-[6px] before:border-t-8 before:border-l-transparent before:border-r-transparent before:border-t-[#2196f3]"
              style={{ left: `${(safeCurrent / maxTime) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Desktop labels */}
        <div className="relative mt-4 hidden sm:block">
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
            <div
              key={fraction}
              className="absolute -translate-x-1/2 text-xs text-[#666]"
              style={{ left: `${fraction * 100}%` }}
            >
              {formatRoundedTimeLabel(maxTime * fraction)}
            </div>
          ))}
        </div>

        {/* Mobile labels */}
        <div className="mt-2 flex justify-between text-[10px] text-[#666] sm:hidden px-1">
          <div>{formatRoundedTimeLabel(0)}</div>
          <div>{formatRoundedTimeLabel(maxTime * 0.5)}</div>
          <div>{formatRoundedTimeLabel(maxTime)}</div>
        </div>
      </div>
    </div>
  );
}

export default Timeline;
