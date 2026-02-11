import { useEffect, useState } from "react";
import { logEvent } from "firebase/analytics";
import { analytics } from "../firebase";

import SplashScreen from "./home/SplashScreen";
import TextImportModal from "../components/home/modals/TextImportModal";
import LoadingSplash from "../components/home/LoadingSplash";
import { useMatchRecorderContext } from "../data/MatchRecorderContext";
import { parseMatchText } from "../utils/matchFormat";
import { readJsonFile } from "../utils/fileJson";
import { readPaste } from "../utils/pasteService";
import { setPath } from "../utils/navigation";

function HomePage() {
  const recorder = useMatchRecorderContext();
  const { applyParsedMatchData } = recorder;
  const [showTextImport, setShowTextImport] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [isLoadingFromUrl, setIsLoadingFromUrl] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading match data...");

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
    let cancelled = false;

    const importFromQuery = async () => {
      const params = new URLSearchParams(window.location.search);
      const pasteKey = params.get("p");
      const encoded = params.get("mt");

      if (!pasteKey && !encoded) return;

      // Show loading splash
      setIsLoadingFromUrl(true);
      setLoadingMessage(pasteKey ? "Fetching shared match..." : "Decoding match data...");

      // Add a minimum delay for the animation to be visible
      const minDelay = new Promise(resolve => setTimeout(resolve, 1500));

      try {
        let decoded;

        if (pasteKey) {
          setLoadingMessage("Fetching shared match...");
          const b64Payload = await readPaste(pasteKey);
          decoded = atob(b64Payload);
        } else {
          decoded = atob(decodeURIComponent(encoded));
        }

        if (cancelled) return;

        setLoadingMessage("Processing match data...");
        const parsedData = parseMatchText(decoded);

        // Wait for minimum animation time
        await minDelay;

        if (cancelled) return;

        const success = applyParsedMatchData(parsedData);
        if (success) {
          logEvent(
            analytics,
            pasteKey ? "import_match_text_paste" : "import_match_text_url"
          );

          // Switch to the match recorder page and clear query params.
          setPath("/match", { replace: true });
        }
      } catch (e) {
        console.warn("Failed to import match from URL", e);
        await minDelay;
      } finally {
        if (!cancelled) {
          setIsLoadingFromUrl(false);
        }
      }
    };

    importFromQuery();

    return () => {
      cancelled = true;
    };
  }, [applyParsedMatchData]);

  // Show loading splash when loading from URL
  if (isLoadingFromUrl) {
    return <LoadingSplash message={loadingMessage} />;
  }

  return (
    <div className="page">
      <div className="bg" aria-hidden="true" />
      <div className="content min-h-screen p-4 sm:p-8 max-w-7xl mx-auto flex flex-col justify-center items-center gap-8 sm:gap-12">
        <div className="w-full text-center sm:text-left max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-accentBg border-2 border-brand-accent rounded-full mb-6 font-semibold text-brand-accent text-sm">
            <span className="w-2 h-2 bg-brand-accent rounded-full animate-pulse" />
            Over <span className="font-bold">750 matches</span> recorded!
          </div>
          <h1 className="title">
            <span className="fancy text-brand-accent">
              Data-Driven
            </span>
            &nbsp;Match Recording and Scouting
          </h1>
          <p className="subtitle mt-4 leading-relaxed">
            Track robot performance, analyze cycle times, and compare teams for the FTC <span className="font-semibold italic text-brand-accent">DECODE</span> season.
            Start recording matches instantly or import existing data!
          </p>
        </div>

        <div className="w-full p-4 sm:p-6">
          <SplashScreen
            recorder={recorder}
            onImportJson={importMatchFromJson}
            onOpenTextImport={() => setShowTextImport(true)}
          />
        </div>

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
      </div>
    </div>
  );
}

export default HomePage;
