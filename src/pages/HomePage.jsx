import { useEffect, useState } from "react";
import { logEvent } from "firebase/analytics";
import { analytics } from "../firebase";

import SplashScreen from "./home/SplashScreen";
import MatchRecorderScreen from "./home/MatchRecorderScreen";
import TextImportModal from "../components/home/modals/TextImportModal";
import useMatchRecorder from "../hooks/useMatchRecorder";
import { parseMatchText } from "../utils/matchFormat";
import { readJsonFile } from "../utils/fileJson";

function HomePage() {
  const recorder = useMatchRecorder();
  const { applyParsedMatchData } = recorder;
  const [showTextImport, setShowTextImport] = useState(false);
  const [textInput, setTextInput] = useState("");

  const importFromText = () => {
    try {
      const parsedData = parseMatchText(textInput);
      const success = applyParsedMatchData(parsedData);
      if (!success) {
        alert("No valid match data found. Please check the format.");
        return;
      }

      setShowTextImport(false);
      setTextInput("");
      logEvent(analytics, "import_match_text");
    } catch (e) {
      alert("Error parsing match data. Please check the format." + e.message);
    }
  };

  const importMatchFromJson = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await readJsonFile(file);
      applyParsedMatchData({
        startTime: data.startTime,
        duration: data.duration,
        events: data.events,
        notes: data.notes,
        teamNumber: data.teamNumber,
      });

      logEvent(analytics, "import_match_json", {
        numEvents: (data.events || []).length,
        totalScored: (data.events || [])
          .filter((ev) => ev.type === "cycle")
          .reduce((sum, ev) => sum + ev.scored, 0),
        totalBalls: (data.events || [])
          .filter((ev) => ev.type === "cycle")
          .reduce((sum, ev) => sum + ev.total, 0),
      });
    } catch {
      alert("Error loading match file. Please ensure it is a valid JSON file.");
    }
  };

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get("mt");
      if (!encoded) return;

      const decoded = atob(decodeURIComponent(encoded));
      const parsedData = parseMatchText(decoded);
      const success = applyParsedMatchData(parsedData);
      if (success) {
        logEvent(analytics, "import_match_text_url");
      }
    } catch (e) {
      console.warn("Failed to import match from URL", e);
    }
  }, [applyParsedMatchData]);

  const showRecorder = recorder.isRecording || recorder.matchStartTime !== null;

  return (
    <div className="min-h-screen p-3 sm:p-5 max-w-7xl mx-auto flex flex-col justify-center items-center gap-6 sm:gap-12">
      <header className="text-center mt-4 sm:mt-8 px-2">
        <h1 className="text-3xl sm:text-5xl font-bold">Heron Scout</h1>
        <p className="text-base sm:text-lg">
          Heron's Match Analysis for DECODE
        </p>
      </header>

      {!showRecorder ? (
        <>
          <SplashScreen
            recorder={recorder}
            onImportJson={importMatchFromJson}
            onOpenTextImport={() => setShowTextImport(true)}
          />
          <TextImportModal
            open={showTextImport}
            textInput={textInput}
            setTextInput={setTextInput}
            onImport={importFromText}
            onClose={() => {
              setShowTextImport(false);
              setTextInput("");
            }}
          />
        </>
      ) : (
        <MatchRecorderScreen recorder={recorder} />
      )}
    </div>
  );
}

export default HomePage;
