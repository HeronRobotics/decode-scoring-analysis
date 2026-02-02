import { useState } from "react";
import {
  Play,
  UploadSimple,
  ClipboardText,
  Rocket,
  Timer,
  ChartLineUp,
  Users,
  Target,
  LightbulbFilament,
  ArrowRight,
  Info,
  CaretRight,
  NumberCircleOne,
  NumberCircleTwo,
  NumberCircleThree,
  Confetti,
  Trophy,
  Bird,
  HashIcon,
  Palette,
} from "@phosphor-icons/react";
import { logEvent } from "firebase/analytics";
import { usePostHog } from "posthog-js/react";
import { analytics } from "../../firebase";
import { matchRecorderConstants } from "../../hooks/useMatchRecorder";
import KeyboardShortcuts from "../../components/home/KeyboardShortcuts";
import { setPath } from "../../utils/navigation";

function SplashScreen({ recorder, onImportJson, onOpenTextImport }) {
  const { startMatch } = recorder;
  const posthog = usePostHog();
  const [showTutorial, setShowTutorial] = useState(false);
  const [selectedMotif, setSelectedMotif] = useState("");

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 flex flex-col">

      <KeyboardShortcuts />

      {/* Quick Start - Primary Action */}
      <div className="p-6 sm:p-8 text-brand-text animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-xl sm:text-2xl font-bold">Start Recording</h3>
        </div>

        <div className="bg-brand-surfaceStrong/70 border border-muted rounded-lg p-4 mb-6 space-y-3">
          <label className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
            <span className="text-brand-muted font-medium flex items-center gap-2">
              <HashIcon size={20} weight="bold" />
              Team Number:
            </span>
            <input
              type="number"
              value={recorder.teamNumber}
              onChange={(e) => recorder.setTeamNumber(e.target.value)}
              placeholder="Enter team #"
              className="input min-w-48 sm:w-40 text-center font-mono text-brand-text placeholder-brand-muted"
              min="1"
              max="99999"
            />
          </label>
          <label className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
            <span className="text-brand-muted font-medium flex items-center gap-2">
              <Palette size={20} weight="bold" />
              Motif Pattern:
            </span>
            <select
              value={selectedMotif}
              onChange={(e) => setSelectedMotif(e.target.value)}
              className="input min-w-48 sm:w-40 text-center font-mono text-brand-text appearance-none cursor-pointer"
            >
              <option value="" className="text-gray-800">Not set</option>
              <option value="GPP" className="text-gray-800">GPP (Green-Purple-Purple)</option>
              <option value="PGP" className="text-gray-800">PGP (Purple-Green-Purple)</option>
              <option value="PPG" className="text-gray-800">PPG (Purple-Purple-Green)</option>
            </select>
          </label>
        </div>

        <button
          onClick={() => {
            startMatch(matchRecorderConstants.MATCH_TOTAL_DURATION, "match", selectedMotif || null);
            setPath("/match");
            logEvent(analytics, "start_match_mode");
            posthog.capture("start_match", {
              mode: "match",
              duration: matchRecorderConstants.MATCH_TOTAL_DURATION,
              teamNumber: recorder.teamNumber,
              motif: selectedMotif || null,
            });
          }}
          className="button w-full flex items-center justify-center gap-3 text-white"
        >
          <Play size={28} weight="fill" />
          Start Full Match
        </button>

        <div className="flex items-center gap-2 mt-4 text-brand-muted text-sm justify-center">
          <Timer size={18} />
          <span>30s Auto + 8s buffer + 2:00 TeleOp</span>
        </div>

        <div className="flex items-center flex-row justify-center gap-2">
          <p>
            Or
          </p>
          <button
            onClick={() => {
              startMatch(null, "free", selectedMotif || null);
              setPath("/match");
              logEvent(analytics, "start_no_timer_from_quick_start");
              posthog.capture("start_match", {
                mode: "free",
                duration: null,
                teamNumber: recorder.teamNumber,
                motif: selectedMotif || null,
              });
            }}
            className=""
          >
            Start No-Timer Match
          </button>
        </div>
      </div>

      <div className="card overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <button
          onClick={() => setShowTutorial(!showTutorial)}
          className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-brand-surfaceStrong/70 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <LightbulbFilament size={24} weight="duotone" className="text-brand-accent" />
            <span className="text-lg font-semibold">How It Works</span>
            <span className="text-xs bg-brand-accent/10 text-brand-accent px-2 py-1 rounded-full font-medium">
              Quick Tutorial
            </span>
          </div>
          <CaretRight
            size={20}
            weight="bold"
            className={`text-brand-accent transition-transform ${showTutorial ? 'rotate-90' : ''}`}
          />
        </button>

        {showTutorial && (
          <div className="p-4 sm:p-6 border-t border-brand-outline bg-brand-surfaceStrong/80 space-y-6">
            <div className="flex gap-4">
              <div className="shrink-0">
                <NumberCircleOne size={40} weight="duotone" className="text-brand-accent" />
              </div>
              <div>
                <h4 className="font-bold text-lg mb-1">Start Recording</h4>
                <p className="text-brand-muted text-sm">
                  Enter the team number and press "Start Full Match". The timer will automatically
                  handle Auto (30s), buffer (8s), and TeleOp (2:00) phases.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="shrink-0">
                <NumberCircleTwo size={40} weight="duotone" className="text-brand-accent" />
              </div>
              <div>
                <h4 className="font-bold text-lg mb-1">Record Cycles</h4>
                <p className="text-brand-muted text-sm mb-3">
                  When the robot scores, record the cycle! You can use the button or keyboard shortcuts:
                </p>
                <div className="bg-brand-surface p-3 rounded-lg border border-brand-outline inline-flex flex-wrap gap-3 items-center">
                  <div className="flex items-center gap-2">
                    <span className="kbd">1</span>
                    <span className="kbd">2</span>
                    <span className="kbd">3</span>
                    <span className="text-xs text-brand-muted">= balls attempted</span>
                  </div>
                  <ArrowRight size={16} className="text-brand-accent" />
                  <div className="flex items-center gap-2">
                    <span className="kbd">0</span>
                    <span className="text-xs">to</span>
                    <span className="kbd">3</span>
                    <span className="text-xs text-brand-muted">= balls scored</span>
                  </div>
                  <ArrowRight size={16} className="text-brand-accent" />
                  <span className="kbd">Enter</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="shrink-0">
                <NumberCircleThree size={40} weight="duotone" className="text-brand-accent" />
              </div>
              <div>
                <h4 className="font-bold text-lg mb-1">Export & Analyze</h4>
                <p className="text-brand-muted text-sm">
                  After the match, export your data as JSON or shareable text. Import matches into
                  Tournament Analysis to compare teams, or Lifetime Stats to track progress over time!
                </p>
              </div>
            </div>

            {/* Pro Tips */}
            <div className="bg-brand-accent/10 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Confetti size={20} weight="duotone" className="text-brand-accent" />
                <span className="info">Pro Tips</span>
              </div>
              <ul className="text-sm text-brand-muted space-y-1.5">
                <li className="flex items-start gap-2">
                  <CaretRight size={14} className="text-brand-accent mt-1 shrink-0" />
                  Use keyboard shortcuts for faster recording during live matches
                </li>
                <li className="flex items-start gap-2">
                  <CaretRight size={14} className="text-brand-accent mt-1 shrink-0" />
                  Add match notes for context (defensive play, robot issues, etc.)
                </li>
                <li className="flex items-start gap-2">
                  <CaretRight size={14} className="text-brand-accent mt-1 shrink-0" />
                  Share matches via URL links for easy team collaboration
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="feature-card card p-5 flex flex-col items-center text-center">
          <ChartLineUp size={36} weight="duotone" className="text-brand-accent mb-3" />
          <h4 className="font-bold mb-1">Live Statistics</h4>
          <p className="text-sm text-brand-muted">
            Real-time cycle times, accuracy rates, and performance metrics
          </p>
        </div>

        <div className="feature-card card p-5 flex flex-col items-center text-center">
          <Users size={36} weight="duotone" className="text-brand-accent mb-3" />
          <h4 className="font-bold mb-1">Team Comparison</h4>
          <p className="text-sm text-brand-muted">
            Compare multiple teams at tournaments with aggregated data
          </p>
        </div>

        <div className="feature-card card p-5 flex flex-col items-center text-center">
          <Trophy size={36} weight="duotone" className="text-brand-accent mb-3" />
          <h4 className="font-bold mb-1">Season Tracking</h4>
          <p className="text-sm text-brand-muted">
            Track your robot's progress throughout the entire season
          </p>
        </div>
      </div>

      {/* Alternative Options */}
      <div className="card p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-center gap-2 mb-4">
          <Info size={20} weight="duotone" className="text-brand-accent" />
          <h3 className="text-lg font-semibold">More Options</h3>
        </div>

        {/* Manual Session Options */}
        <div className="mb-5">
          <p className="text-sm text-brand-muted mb-3 flex items-center gap-2">
            <Timer size={16} />
            Manual Session (Legacy) - Custom timer modes:
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                startMatch(null, "free");
                setPath("/match");
                logEvent(analytics, "start_no_timer");
                posthog.capture("start_match", {
                  mode: "free",
                  duration: null,
                  teamNumber: recorder.teamNumber,
                });
              }}
              className="btn py-2.5! px-4!"
            >
              <Play size={18} weight="fill" />
              No Timer
            </button>
            <button
              onClick={() => {
                startMatch(30, "free");
                setPath("/match");
                logEvent(analytics, "start_30sec_timer");
                posthog.capture("start_match", {
                  mode: "free",
                  duration: 30,
                  teamNumber: recorder.teamNumber,
                });
              }}
              className="btn py-2.5! px-4!"
            >
              <Play size={18} weight="fill" />
              0:30 Auto
            </button>
            <button
              onClick={() => {
                startMatch(120, "free");
                setPath("/match");
                logEvent(analytics, "start_2min_timer");
                posthog.capture("start_match", {
                  mode: "free",
                  duration: 120,
                  teamNumber: recorder.teamNumber,
                });
              }}
              className="btn py-2.5! px-4!"
            >
              <Play size={18} weight="fill" />
              2:00 TeleOp
            </button>
          </div>
        </div>

        {/* Import Options */}
        <div className="pt-4 border-t border-brand-outline">
          <p className="text-sm text-brand-muted mb-3 flex items-center gap-2">
            <UploadSimple size={16} />
            Import existing match data:
          </p>
          <div className="flex flex-wrap gap-2">
            <label className="btn py-2.5! px-4! cursor-pointer">
              <UploadSimple size={18} weight="bold" />
              Import JSON
              <input
                type="file"
                accept=".json"
                onChange={onImportJson}
                className="hidden"
              />
            </label>
            <button onClick={onOpenTextImport} className="btn py-2.5! px-4!">
              <ClipboardText size={18} weight="bold" />
              From Text
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;
