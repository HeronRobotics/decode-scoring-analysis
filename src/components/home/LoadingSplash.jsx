import { Bird, CircleNotch } from "@phosphor-icons/react";

function LoadingSplash({ message = "Loading match data..." }) {
  return (
    <div className="fixed inset-0 z-50 bg-[#DFEBFF] flex flex-col items-center justify-center">
      {/* Animated logo container */}
      <div className="relative mb-8">
        {/* Outer rotating ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-[#445f8b]/20 border-t-[#445f8b] animate-spin-slow" />
        </div>

        {/* Inner pulsing circle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-[#445f8b]/10 animate-pulse-scale" />
        </div>

        {/* Center icon */}
        <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center">
          <Bird
            size={64}
            weight="duotone"
            className="text-[#445f8b] animate-float sm:hidden"
          />
          <Bird
            size={80}
            weight="duotone"
            className="text-[#445f8b] animate-float hidden sm:block"
          />
        </div>
      </div>

      {/* Brand text */}
      <h1 className="text-3xl sm:text-4xl font-bold text-[#445f8b] mb-2 animate-fade-in">
        Heron Scout
      </h1>
      <p className="text-base sm:text-lg text-[#2d3e5c] mb-8 animate-fade-in-delay">
        Match Analysis for DECODE
      </p>

      {/* Loading indicator */}
      <div className="flex items-center gap-3 text-[#445f8b] animate-fade-in-delay-2">
        <CircleNotch size={24} weight="bold" className="animate-spin" />
        <span className="text-sm sm:text-base font-medium">{message}</span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 mt-6">
        <div className="w-2 h-2 rounded-full bg-[#445f8b] animate-bounce-dot" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-[#445f8b] animate-bounce-dot" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-[#445f8b] animate-bounce-dot" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

export default LoadingSplash;
