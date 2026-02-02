import { KeyboardIcon } from "@phosphor-icons/react";

let keyboardShortcutsDidAnimate = false;

const KeyboardShortcuts = () => {
    const shouldAnimate = !keyboardShortcutsDidAnimate;
    if (!keyboardShortcutsDidAnimate) keyboardShortcutsDidAnimate = true;

    return (
        <div
          className={`card p-4 sm:p-5 ${
            shouldAnimate ? "animate-slide-up" : ""
          }`}
          style={shouldAnimate ? { animationDelay: "0.4s" } : undefined}
        >
          <div className="flex items-center gap-2 mb-3">
            <KeyboardIcon size={20} weight="duotone" className="text-brand-accent" />
            <span className="font-semibold text-sm">Keyboard Shortcuts (During Recording)</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-brand-text">
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