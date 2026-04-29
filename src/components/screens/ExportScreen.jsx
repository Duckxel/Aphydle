import { useEffect, useMemo, useRef, useState } from "react";
import { tokens } from "../ui/tokens.js";
import { Sheet } from "./Sheet.jsx";
import { tileCountForLevel, buildHint } from "../../engine/game.js";
import { preloadImage, getCachedImage } from "../../lib/imageCache.js";

const APHYDLE_URL = "aphydle.aphylia.app";
const EXPORT_SIZE = 1080;

// Five cards: level 7 → "guess the plant", levels 6/5/4 → hints, level 3 → CTA.
const CARD_HINTS = [
  { key: "habitat", label: "Habitat" },
  { key: "growth", label: "Growth form" },
  { key: "colors", label: "Foliage" },
];

function buildCards(plant) {
  return [
    { level: 7, kind: "title", title: "TRY TO GUESS", subtitle: "THE PLANT" },
    {
      level: 6,
      kind: "hint",
      hintLabel: CARD_HINTS[0].label,
      hintValue: buildHint(CARD_HINTS[0].key, plant),
    },
    {
      level: 5,
      kind: "hint",
      hintLabel: CARD_HINTS[1].label,
      hintValue: buildHint(CARD_HINTS[1].key, plant),
    },
    {
      level: 4,
      kind: "hint",
      hintLabel: CARD_HINTS[2].label,
      hintValue: buildHint(CARD_HINTS[2].key, plant),
    },
    { level: 3, kind: "cta", title: "TRY ON APHYDLE", subtitle: APHYDLE_URL },
  ];
}

function drawMosaic(ctx, img, level, w, h) {
  ctx.imageSmoothingEnabled = false;
  const srcAR = img.width / img.height;
  const dstAR = w / h;
  let sx = 0,
    sy = 0,
    sw = img.width,
    sh = img.height;
  if (srcAR > dstAR) {
    sw = img.height * dstAR;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / dstAR;
    sy = (img.height - sh) / 2;
  }
  const tileCount = tileCountForLevel(level);
  if (tileCount <= 0) {
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  } else {
    const tmp = document.createElement("canvas");
    tmp.width = tileCount;
    tmp.height = tileCount;
    const tctx = tmp.getContext("2d");
    tctx.imageSmoothingEnabled = false;
    tctx.drawImage(img, sx, sy, sw, sh, 0, 0, tileCount, tileCount);
    ctx.drawImage(tmp, 0, 0, tileCount, tileCount, 0, 0, w, h);
  }
}

function drawTopBanner(ctx, w, h, lines) {
  // Translucent dark band across the top with stacked text lines.
  // `lines` is an array of { text, size, weight, family, letterSpacing, color }.
  const bandHeight = Math.round(h * 0.22);
  const grad = ctx.createLinearGradient(0, 0, 0, bandHeight);
  grad.addColorStop(0, "rgba(0,0,0,0.78)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, bandHeight);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const totalH = lines.reduce((acc, l) => acc + l.size * 1.15, 0);
  let y = Math.round(h * 0.06) + lines[0].size;
  // If the total height would push past the band, just stack from a fixed top.
  if (totalH > bandHeight - 32) y = Math.round(h * 0.05) + lines[0].size;

  for (const line of lines) {
    ctx.fillStyle = line.color || "#FFFFFF";
    ctx.font = `${line.weight || 600} ${line.size}px ${line.family || "system-ui, -apple-system, sans-serif"}`;
    if (line.letterSpacing && ctx.letterSpacing !== undefined) {
      ctx.letterSpacing = line.letterSpacing;
    }
    ctx.fillText(line.text, w / 2, y);
    y += Math.round(line.size * 1.25);
  }
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "0px";
}

function drawCardOnto(canvas, img, card) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);

  if (img) {
    drawMosaic(ctx, img, card.level, w, h);
  } else {
    ctx.fillStyle = "#0F0F0F";
    ctx.fillRect(0, 0, w, h);
  }

  if (card.kind === "title" || card.kind === "cta") {
    drawTopBanner(ctx, w, h, [
      {
        text: card.title,
        size: Math.round(w * 0.072),
        weight: 800,
        letterSpacing: "4px",
        family: "Georgia, 'Times New Roman', serif",
        color: "#FFFFFF",
      },
      {
        text: card.subtitle,
        size: Math.round(w * 0.038),
        weight: 500,
        letterSpacing: "3px",
        family: "ui-monospace, SFMono-Regular, Menlo, monospace",
        color: card.kind === "cta" ? "#00D26A" : "#F5F1E8",
      },
    ]);
  } else if (card.kind === "hint") {
    drawTopBanner(ctx, w, h, [
      {
        text: card.hintLabel.toUpperCase(),
        size: Math.round(w * 0.034),
        weight: 600,
        letterSpacing: "5px",
        family: "ui-monospace, SFMono-Regular, Menlo, monospace",
        color: "#8A8A85",
      },
      {
        text: card.hintValue,
        size: Math.round(w * 0.062),
        weight: 700,
        letterSpacing: "1px",
        family: "Georgia, 'Times New Roman', serif",
        color: "#FFFFFF",
      },
    ]);
  }
}

function downloadCanvas(canvas, filename) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve(true);
    }, "image/png");
  });
}

export function ExportScreen({ theme, onClose, plant, puzzleNo }) {
  const T = tokens(theme);
  const cards = useMemo(() => buildCards(plant), [plant]);
  const [img, setImg] = useState(() => getCachedImage(plant.imageUrl));
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (img) return;
    let cancelled = false;
    preloadImage(plant.imageUrl).then((loaded) => {
      if (!cancelled) setImg(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [plant.imageUrl, img]);

  const previewRefs = useRef([]);
  useEffect(() => {
    if (!img) return;
    cards.forEach((card, i) => {
      const c = previewRefs.current[i];
      if (c) drawCardOnto(c, img, card);
    });
  }, [img, cards]);

  async function handleDownloadAll() {
    if (!img || downloading) return;
    setDownloading(true);
    try {
      const safeId = String(plant.id).replace(/[^a-z0-9-]/gi, "-").toLowerCase();
      const stem = `aphydle-${puzzleNo}-${safeId}`;
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const c = document.createElement("canvas");
        c.width = EXPORT_SIZE;
        c.height = EXPORT_SIZE;
        drawCardOnto(c, img, card);
        const filename = `${stem}-${i + 1}-mosaic-${card.level}.png`;
        await downloadCanvas(c, filename);
        await new Promise((r) => setTimeout(r, 180));
      }
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Sheet theme={theme} title="Share" onClose={onClose}>
      <div
        style={{
          fontFamily: "var(--serif)",
          fontSize: 28,
          lineHeight: 1.2,
          color: T.text,
          marginBottom: 8,
        }}
      >
        Export for social
      </div>
      <div
        style={{
          fontFamily: "var(--sans)",
          fontSize: 14,
          color: T.muted,
          marginBottom: 28,
          maxWidth: 540,
          lineHeight: 1.55,
        }}
      >
        Five 1080&times;1080 cards revealing the plant step by step — a teaser,
        three hints, and a call to play. Download them all and post in order.
      </div>

      <div
        className="aph-export-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 28,
        }}
      >
        {cards.map((card, i) => (
          <div
            key={i}
            style={{
              position: "relative",
              aspectRatio: "1",
              background: "#0F0F0F",
              border: `1px solid ${T.border}`,
              overflow: "hidden",
            }}
          >
            <canvas
              ref={(el) => {
                previewRefs.current[i] = el;
                if (el && img) drawCardOnto(el, img, card);
              }}
              width={EXPORT_SIZE}
              height={EXPORT_SIZE}
              style={{
                width: "100%",
                height: "100%",
                display: "block",
                imageRendering: "pixelated",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 6,
                left: 6,
                fontFamily: "var(--mono)",
                fontSize: 9,
                letterSpacing: "0.14em",
                padding: "3px 6px",
                background: "rgba(0,0,0,0.55)",
                color: "#F5F1E8",
              }}
            >
              {i + 1} · LEVEL {card.level}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={handleDownloadAll}
          disabled={!img || downloading}
          style={{
            flex: 1,
            minWidth: 220,
            padding: "16px 22px",
            background: T.accent,
            color: "#0A0A0A",
            border: "none",
            cursor: !img || downloading ? "wait" : "pointer",
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.16em",
            fontWeight: 700,
            opacity: !img || downloading ? 0.6 : 1,
          }}
        >
          {downloading ? "DOWNLOADING…" : "DOWNLOAD ALL · 5 IMAGES"}
        </button>
        <button
          onClick={onClose}
          style={{
            minWidth: 140,
            padding: "16px 22px",
            background: "transparent",
            color: T.text,
            border: `1px solid ${T.border}`,
            cursor: "pointer",
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.16em",
          }}
        >
          DONE
        </button>
      </div>
    </Sheet>
  );
}
