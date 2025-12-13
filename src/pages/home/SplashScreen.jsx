import {
  ClipboardTextIcon,
  Play,
  UploadSimple,
} from "@phosphor-icons/react";
import { logEvent } from "firebase/analytics";
import { analytics } from "../../firebase";
import { matchRecorderConstants } from "../../hooks/useMatchRecorder";

function SplashScreen({ recorder, onImportJson, onOpenTextImport }) {
  const { startMatch } = recorder;

  return (
    <div className="bg-white border-2 border-[#445f8b] flex flex-col items-center w-full p-4 sm:p-8">
      <h2 className="text-2xl sm:text-3xl mt-2 mb-6 px-2 text-center">
        Start recording!
      </h2>

      <div className="bg-[#f7f9ff] border-2 border-[#445f8b] w-full max-w-xl p-4 mb-6">
        <h3 className="text-xl font-semibold mb-3">
          Match Mode (Auto + TeleOp)
        </h3>
        <label className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3 w-full">
          <span>Team Number:</span>
          <input
            type="number"
            value={recorder.teamNumber}
            onChange={(e) => recorder.setTeamNumber(e.target.value)}
            placeholder="1234"
            className="px-3 py-2 border-2 border-[#ddd] focus:border-[#445f8b] outline-none w-full sm:w-32 text-center font-mono"
            min="1"
            max="99999"
          />
        </label>
        <button
          onClick={() => {
            startMatch(matchRecorderConstants.MATCH_TOTAL_DURATION, "match");
            logEvent(analytics, "start_match_mode");
          }}
          className="btn mb-2 !py-3 !bg-[#445f8b] !text-white !px-6 w-full"
        >
          <Play size={24} weight="fill" />
          Start Match Mode (Auto + TeleOp)
        </button>
        <p className="text-sm text-[#555]">
          Runs 30s Auto, an 8s buffer to wrap up auto, then 2:00 TeleOp — all
          in one match and one save code.
        </p>
      </div>

      <div className="w-full max-w-xl mb-6">
        <h3 className="text-lg font-semibold mb-2">
          Manual Session (Legacy)
        </h3>
        <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
          <button
            onClick={() => {
              startMatch(null, "free");
              logEvent(analytics, "start_no_timer");
            }}
            className="btn !py-3 !px-6"
          >
            <Play size={24} weight="fill" />
            No Timer
          </button>
          <button
            onClick={() => {
              startMatch(30, "free");
              logEvent(analytics, "start_30sec_timer");
            }}
            className="btn"
          >
            <Play size={24} weight="fill" />
            0:30 Timer (Auto)
          </button>
          <button
            onClick={() => {
              startMatch(120, "free");
              logEvent(analytics, "start_2min_timer");
            }}
            className="btn"
          >
            <Play size={24} weight="fill" />
            2:00 Timer (TeleOp)
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xl justify-center">
        <label className="btn w-full sm:w-auto justify-center">
          <span className="flex items-center gap-2">
            <UploadSimple weight="bold" />
            Import Match from JSON
          </span>
          <input
            type="file"
            accept=".json"
            onChange={onImportJson}
            className="hidden"
          />
        </label>
        <button
          onClick={onOpenTextImport}
          className="btn w-full sm:w-auto justify-center"
        >
          <span className="flex items-center gap-2">
            <ClipboardTextIcon weight="bold" />
            From Text
          </span>
        </button>
      </div>

      <p className="mt-8 p-2 text-sm sm:text-base">
        Heron Scout is a scouting app designed for intensive data analysis. Its
        usages are threefold: Track your own robot in the workshop to see how
        design iterations affect performance, track your robot during
        competition, or track other people's robots during competitions for
        scouting. First and foremost, it's easy to use — just press one of the
        buttons above to start recording a match. (Or import one.)
        <br />
        <br />
        Matches are stored as JSON and easily shareable! Scout matches with
        Heron Scout and you'll be able to compare teams at tournaments using
        the Tournament Analysis page. Matches and Tournaments can both be
        imported on the "Lifetime Stats" page to explore your performance over
        the course of the season and generate cool graphs!
        <br />
        <br />
        We love graphs at Heron Robotics, so we made this for you :)
      </p>
    </div>
  );
}

export default SplashScreen;
