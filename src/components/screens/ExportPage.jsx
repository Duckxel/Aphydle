import { useEffect, useMemo, useState } from "react";
import { ExportScreen } from "./ExportScreen.jsx";
import { tokens } from "../ui/tokens.js";
import { loadDailyPuzzle, loadArchivedPuzzle } from "../../lib/data.js";
import { getPuzzleNumber } from "../../engine/game.js";

// Optional secret-URL gate. When VITE_APHYDLE_EXPORT_TOKEN is set at build
// time, /export refuses to render unless ?key=<token> matches. Trivially
// bypassable (the token is in the bundle) but matches the threat model of
// the existing ?export=open gate on the FinishScreen.
const REQUIRED_TOKEN = import.meta.env.VITE_APHYDLE_EXPORT_TOKEN || "";

function readUrlParams() {
  if (typeof window === "undefined") return { puzzleNo: null, key: "" };
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("puzzle");
  const parsed = raw != null ? parseInt(raw, 10) : NaN;
  return {
    puzzleNo: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
    key: params.get("key") || "",
  };
}

function setPuzzleParam(puzzleNo) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("puzzle", String(puzzleNo));
  window.history.replaceState(null, "", url.toString());
}

function navigateHome() {
  if (typeof window === "undefined") return;
  window.location.href = "/";
}

export function ExportPage({ theme }) {
  const T = tokens(theme);
  const initial = useMemo(() => readUrlParams(), []);
  const todayPuzzleNo = useMemo(() => getPuzzleNumber(new Date()), []);
  const [puzzleNo, setPuzzleNo] = useState(initial.puzzleNo ?? todayPuzzleNo);
  const [puzzle, setPuzzle] = useState(null);
  const [pickerValue, setPickerValue] = useState(
    String(initial.puzzleNo ?? todayPuzzleNo),
  );

  // Token gate: only enforced when an env-baked token exists. Empty token
  // means no gate (current behaviour for the FinishScreen ?export=open path).
  const tokenOk = !REQUIRED_TOKEN || initial.key === REQUIRED_TOKEN;

  useEffect(() => {
    if (!tokenOk) return;
    let cancelled = false;
    setPuzzle(null);
    const loader =
      puzzleNo === todayPuzzleNo
        ? loadDailyPuzzle(new Date())
        : loadArchivedPuzzle(puzzleNo);
    loader.then((p) => {
      if (!cancelled) setPuzzle(p);
    });
    return () => {
      cancelled = true;
    };
  }, [puzzleNo, todayPuzzleNo, tokenOk]);

  useEffect(() => {
    if (!tokenOk) return;
    setPuzzleParam(puzzleNo);
  }, [puzzleNo, tokenOk]);

  if (!tokenOk) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: T.bg,
          color: T.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--mono)",
          fontSize: 12,
          letterSpacing: "0.16em",
          padding: 32,
          textAlign: "center",
        }}
      >
        NOT FOUND
      </div>
    );
  }

  if (!puzzle?.plant) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: T.bg,
          color: T.muted,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.16em",
        }}
      >
        LOADING PUZZLE #{puzzleNo}…
      </div>
    );
  }

  function submitPicker(e) {
    e.preventDefault();
    const parsed = parseInt(pickerValue, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return;
    setPuzzleNo(parsed);
  }

  return (
    <>
      <ExportScreen
        theme={theme}
        plant={puzzle.plant}
        puzzleNo={puzzle.puzzleNo}
        onClose={navigateHome}
      />
      <form
        onSubmit={submitPicker}
        style={{
          position: "fixed",
          left: "50%",
          bottom: 24,
          transform: "translateX(-50%)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          background: T.elevated,
          border: `1px solid ${T.border}`,
          borderRadius: 4,
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.14em",
          color: T.muted,
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        }}
      >
        <span>PUZZLE</span>
        <input
          type="number"
          min="1"
          value={pickerValue}
          onChange={(e) => setPickerValue(e.target.value)}
          style={{
            width: 80,
            padding: "6px 8px",
            background: T.bg,
            border: `1px solid ${T.border}`,
            color: T.text,
            fontFamily: "var(--mono)",
            fontSize: 12,
            letterSpacing: "0.12em",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "6px 12px",
            background: T.accent,
            color: "#0A0A0A",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.16em",
            fontWeight: 700,
          }}
        >
          GO
        </button>
        <button
          type="button"
          onClick={() => {
            setPickerValue(String(todayPuzzleNo));
            setPuzzleNo(todayPuzzleNo);
          }}
          style={{
            padding: "6px 10px",
            background: "transparent",
            color: T.text,
            border: `1px solid ${T.border}`,
            cursor: "pointer",
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.16em",
          }}
        >
          TODAY
        </button>
      </form>
    </>
  );
}
