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
    <div className="w-full max-w-4xl space-y-6 sm:space-y-8">
      {/* Hero Section */}
      <div className="bg-white border-2 border-[#445f8b] p-6 sm:p-8 text-center animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Bird size={40} weight="duotone" className="text-[#445f8b]" />
          <h2 className="text-2xl sm:text-4xl font-bold">Heron Scout</h2>
        </div>
        <p className="text-base sm:text-lg text-[#555] max-w-2xl mx-auto">
          Track accuracy, cycle times, and performance for the FTC <i>DECODE</i> season.
          Start a match to begin recording, or import existing data!
        </p>
      </div>

      <KeyboardShortcuts />

      {/* Quick Start - Primary Action */}
      <div className="bg-linear-to-br from-[#445f8b] to-[#2d3e5c] border-2 border-[#445f8b] p-6 sm:p-8 text-white animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-xl sm:text-2xl font-bold text-white!">Start Recording</h3>
        </div>

        <div className="bg-white/10 backdrop-blur rounded-lg p-4 mb-6 space-y-3">
          <label className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
            <span className="text-white/90 font-medium flex items-center gap-2">
              <HashIcon size={20} weight="bold" />
              Team Number:
            </span>
            <input
              type="number"
              value={recorder.teamNumber}
              onChange={(e) => recorder.setTeamNumber(e.target.value)}
              placeholder="Enter team #"
              className="px-4 py-1 border border-white/30 min-w-48 bg-white/10 focus:border-white focus:bg-white/20 outline-none sm:w-40 text-center font-mono text-white placeholder-white/50 rounded-lg transition-all"
              min="1"
              max="99999"
            />
          </label>
          <label className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
            <span className="text-white/90 font-medium flex items-center gap-2">
              <Palette size={20} weight="bold" />
              Motif Pattern:
            </span>
            <select
              value={selectedMotif}
              onChange={(e) => setSelectedMotif(e.target.value)}
              className="px-4 py-1 border border-white/30 min-w-48 bg-white/10 focus:border-white focus:bg-white/20 outline-none sm:w-40 text-center font-mono text-white rounded-lg transition-all appearance-none cursor-pointer"
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
          className="w-full py-4 px-6 bg-white text-[#445f8b] font-bold text-lg rounded-lg hover:bg-white/90 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
        >
          <Play size={28} weight="fill" />
          Start Full Match (Auto + TeleOp)
        </button>

        <div className="flex items-center gap-2 mt-4 text-white/80 text-sm justify-center">
          <Timer size={18} />
          <span>30s Auto + 8s buffer + 2:00 TeleOp</span>
        </div>
      </div>

      <div className="bg-white border-2 border-[#445f8b] overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <button
          onClick={() => setShowTutorial(!showTutorial)}
          className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-[#f7f9ff] transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <LightbulbFilament size={24} weight="duotone" className="text-[#445f8b]" />
            <span className="text-lg font-semibold">How It Works</span>
            <span className="text-xs bg-[#445f8b]/10 text-[#445f8b] px-2 py-1 rounded-full font-medium">
              Quick Tutorial
            </span>
          </div>
          <CaretRight
            size={20}
            weight="bold"
            className={`text-[#445f8b] transition-transform ${showTutorial ? 'rotate-90' : ''}`}
          />
        </button>

        {showTutorial && (
          <div className="p-4 sm:p-6 border-t-2 border-[#445f8b]/20 bg-[#f7f9ff] space-y-6">
            <div className="flex gap-4">
              <div className="shrink-0">
                <NumberCircleOne size={40} weight="duotone" className="text-[#445f8b]" />
              </div>
              <div>
                <h4 className="font-bold text-lg mb-1">Start Recording</h4>
                <p className="text-[#555] text-sm">
                  Enter the team number and press "Start Full Match". The timer will automatically
                  handle Auto (30s), buffer (8s), and TeleOp (2:00) phases.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="shrink-0">
                <NumberCircleTwo size={40} weight="duotone" className="text-[#445f8b]" />
              </div>
              <div>
                <h4 className="font-bold text-lg mb-1">Record Cycles</h4>
                <p className="text-[#555] text-sm mb-3">
                  When the robot scores, record the cycle! You can use the button or keyboard shortcuts:
                </p>
                <div className="bg-white p-3 rounded-lg border border-[#ddd] inline-flex flex-wrap gap-3 items-center">
                  <div className="flex items-center gap-2">
                    <span className="kbd">1</span>
                    <span className="kbd">2</span>
                    <span className="kbd">3</span>
                    <span className="text-xs text-[#666]">= balls attempted</span>
                  </div>
                  <ArrowRight size={16} className="text-[#445f8b]" />
                  <div className="flex items-center gap-2">
                    <span className="kbd">0</span>
                    <span className="text-xs">to</span>
                    <span className="kbd">3</span>
                    <span className="text-xs text-[#666]">= balls scored</span>
                  </div>
                  <ArrowRight size={16} className="text-[#445f8b]" />
                  <span className="kbd">Enter</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="shrink-0">
                <NumberCircleThree size={40} weight="duotone" className="text-[#445f8b]" />
              </div>
              <div>
                <h4 className="font-bold text-lg mb-1">Export & Analyze</h4>
                <p className="text-[#555] text-sm">
                  After the match, export your data as JSON or shareable text. Import matches into
                  Tournament Analysis to compare teams, or Lifetime Stats to track progress over time!
                </p>
              </div>
            </div>

            {/* Pro Tips */}
            <div className="bg-[#445f8b]/10 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Confetti size={20} weight="duotone" className="text-[#445f8b]" />
                <span className="font-bold text-sm">Pro Tips</span>
              </div>
              <ul className="text-sm text-[#555] space-y-1.5">
                <li className="flex items-start gap-2">
                  <CaretRight size={14} className="text-[#445f8b] mt-1 shrink-0" />
                  Use keyboard shortcuts for faster recording during live matches
                </li>
                <li className="flex items-start gap-2">
                  <CaretRight size={14} className="text-[#445f8b] mt-1 shrink-0" />
                  Add match notes for context (defensive play, robot issues, etc.)
                </li>
                <li className="flex items-start gap-2">
                  <CaretRight size={14} className="text-[#445f8b] mt-1 shrink-0" />
                  Share matches via URL links for easy team collaboration
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="feature-card bg-white border-2 border-[#445f8b] p-5 flex flex-col items-center text-center">
          <ChartLineUp size={36} weight="duotone" className="text-[#445f8b] mb-3" />
          <h4 className="font-bold mb-1">Live Statistics</h4>
          <p className="text-sm text-[#666]">
            Real-time cycle times, accuracy rates, and performance metrics
          </p>
        </div>

        <div className="feature-card bg-white border-2 border-[#445f8b] p-5 flex flex-col items-center text-center">
          <Users size={36} weight="duotone" className="text-[#445f8b] mb-3" />
          <h4 className="font-bold mb-1">Team Comparison</h4>
          <p className="text-sm text-[#666]">
            Compare multiple teams at tournaments with aggregated data
          </p>
        </div>

        <div className="feature-card bg-white border-2 border-[#445f8b] p-5 flex flex-col items-center text-center">
          <Trophy size={36} weight="duotone" className="text-[#445f8b] mb-3" />
          <h4 className="font-bold mb-1">Season Tracking</h4>
          <p className="text-sm text-[#666]">
            Track your robot's progress throughout the entire season
          </p>
        </div>
      </div>

      {/* Alternative Options */}
      <div className="bg-white border-2 border-[#445f8b] p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-center gap-2 mb-4">
          <Info size={20} weight="duotone" className="text-[#445f8b]" />
          <h3 className="text-lg font-semibold">More Options</h3>
        </div>

        {/* Manual Session Options */}
        <div className="mb-5">
          <p className="text-sm text-[#666] mb-3 flex items-center gap-2">
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
        <div className="pt-4 border-t border-[#ddd]">
          <p className="text-sm text-[#666] mb-3 flex items-center gap-2">
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
