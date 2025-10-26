import { BasketballIcon, CricketIcon } from "@phosphor-icons/react"

function Timeline({ events, currentTime }) {
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const maxTime = Math.max(currentTime, ...events.map(e => e.timestamp), 1)

  return (
    <div className="mb-8 w-full">
      <h3 className="text-2xl mb-5">Timeline</h3>
      <div className="bg-white p-10 border-2 border-[#445f8b]">
        <div className="relative h-32 bg-white border-b-2 border-[#ddd] mb-3">
          {events.map((event, index) => {
            const position = (event.timestamp / maxTime) * 100

            if (event.type === 'cycle') {
              const successColor = event.scored / event.total >= 0.5 ? '#2D6C3E' : '#F44336';
              const balls = [];
                for (let i = 0; i < event.total; i++) {
                    const isScored = i < event.scored;
                    balls.push(
                        <div
                            key={i}
                            className="w-6 h-6"
                        >
                            <BasketballIcon color={isScored ? successColor : '#ddd'} />
                        </div>
                    );
                }

              return (
                <div
                  key={index}
                  className="absolute bottom-0 -translate-x-1/2 flex flex-col items-center cursor-pointer"
                  style={{ left: `${position}%` }}
                  title={`${event.scored}/${event.total} at ${formatTime(event.timestamp)}`}
                >
                    <div className="h-full flex flex-col-reverse items-center justify-start">
                        {balls}
                    </div>
                </div>
              )
            } else if (event.type === 'gate') {
              return (
                <div
                  key={index}
                  className="absolute top-0 h-full -translate-x-1/2"
                  style={{ left: `${position}%` }}
                  title={`Gate at ${formatTime(event.timestamp)}`}
                >
                  <div className="w-8 h-full bg-blue-50 text-white flex items-center justify-center font-bold border-2 border-blue-100">
                    <CricketIcon className="w-5 h-5 text-[#445f8b]" />
                  </div>
                </div>
              )
            }
            return null
          })}
          
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-[#2196f3] transition-all duration-100 before:content-[''] before:absolute before:-top-1.5 before:left-1/2 before:-translate-x-1/2 before:w-0 before:h-0 before:border-l-[6px] before:border-r-[6px] before:border-t-8 before:border-l-transparent before:border-r-transparent before:border-t-[#2196f3]"
            style={{ left: `${(currentTime / maxTime) * 100}%` }}
          ></div>
        </div>
        
        <div className="relative flex justify-between mt-3">
          {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => (
            <div key={i} className="absolute -translate-x-1/2 text-xs text-[#666]" style={{ left: `${fraction * 100}%` }}>
              {formatTime(maxTime * fraction)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Timeline
