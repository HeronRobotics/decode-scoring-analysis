import { KeyboardIcon } from "@phosphor-icons/react";

const KeyboardShortcuts = () => {
    return (
        <div className="bg-[#f7f9ff] border-2 border-[#445f8b]/30 p-4 sm:p-5 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center gap-2 mb-3">
            <KeyboardIcon size={20} weight="duotone" className="text-[#445f8b]" />
            <span className="font-semibold text-sm">Keyboard Shortcuts (During Recording)</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#555]">
            <span className="flex items-center gap-2">
              <span className="kbd">1</span>-<span className="kbd">3</span>
              <span>Balls attempted</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="kbd">0</span>-<span className="kbd">3</span>
              <span>Balls scored</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="kbd">Enter</span>
              <span>Confirm cycle</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="kbd">G</span>
              <span>Gate open</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="kbd">Esc</span>
              <span>Cancel</span>
            </span>
          </div>
        </div>
    );
};

export default KeyboardShortcuts;