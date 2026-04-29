import { useEffect, useMemo, useRef, useState } from "react";
import { tokens } from "../ui/tokens.js";
import { Sheet } from "./Sheet.jsx";
import { tileCountForLevel, buildHint } from "../../engine/game.js";
import { preloadImage, getCachedImage } from "../../lib/imageCache.js";
import logoUrl from "../../assets/FINAL.png";

const APHYDLE_URL = "aphydle.aphylia.app";
const EXPORT_SIZE = 1080;
const BRAND_FONT = '"Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace';
const APH_BG = "#0A0A0A";
const APH_FG = "#F5F1E8";
const APH_ACCENT = "#00D26A";
const APH_MUTED = "#8A8A85";

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

function drawTopBand(ctx, w, h) {
  // Soft dark gradient at the top so overlay text reads on any image.
  const bandHeight = Math.round(h * 0.34);
  const grad = ctx.createLinearGradient(0, 0, 0, bandHeight);
  grad.addColorStop(0, "rgba(10,10,10,0.88)");
  grad.addColorStop(0.6, "rgba(10,10,10,0.45)");
  grad.addColorStop(1, "rgba(10,10,10,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, bandHeight);
}

function drawBottomBand(ctx, w, h) {
  // Mirror gradient for the brand mark at the bottom.
  const bandHeight = Math.round(h * 0.18);
  const grad = ctx.createLinearGradient(0, h - bandHeight, 0, h);
  grad.addColorStop(0, "rgba(10,10,10,0)");
  grad.addColorStop(1, "rgba(10,10,10,0.85)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, h - bandHeight, w, bandHeight);
}

function setLetterSpacing(ctx, value) {
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = value;
}

function drawCenteredText(ctx, text, cx, y, opts) {
  ctx.fillStyle = opts.color;
  ctx.font = `${opts.weight} ${opts.size}px ${BRAND_FONT}`;
  setLetterSpacing(ctx, opts.letterSpacing || "0px");
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, cx, y);
}

function drawHairline(ctx, x1, y, x2, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
}

function drawTopContent(ctx, w, h, card) {
  drawTopBand(ctx, w, h);
  const cx = w / 2;
  // Tiny "APHYDLE · No." eyebrow keeps the brand visible above the headline.
  const eyebrowY = Math.round(h * 0.075);
  drawCenteredText(ctx, "APHYDLE · DAILY PLANT", cx, eyebrowY, {
    color: APH_ACCENT,
    weight: 600,
    size: Math.round(w * 0.022),
    letterSpacing: "6px",
  });
  // Hairline under the eyebrow.
  const lineY = Math.round(h * 0.095);
  drawHairline(
    ctx,
    Math.round(w * 0.36),
    lineY,
    Math.round(w * 0.64),
    "rgba(245,241,232,0.35)",
  );

  if (card.kind === "title") {
    drawCenteredText(ctx, card.title, cx, Math.round(h * 0.165), {
      color: APH_FG,
      weight: 700,
      size: Math.round(w * 0.07),
      letterSpacing: "4px",
    });
    drawCenteredText(ctx, card.subtitle, cx, Math.round(h * 0.235), {
      color: APH_FG,
      weight: 700,
      size: Math.round(w * 0.07),
      letterSpacing: "4px",
    });
  } else if (card.kind === "cta") {
    drawCenteredText(ctx, card.title, cx, Math.round(h * 0.175), {
      color: APH_FG,
      weight: 700,
      size: Math.round(w * 0.07),
      letterSpacing: "4px",
    });
    drawCenteredText(ctx, card.subtitle, cx, Math.round(h * 0.245), {
      color: APH_ACCENT,
      weight: 500,
      size: Math.round(w * 0.034),
      letterSpacing: "3px",
    });
  } else if (card.kind === "hint") {
    drawCenteredText(ctx, "HINT", cx, Math.round(h * 0.155), {
      color: APH_MUTED,
      weight: 500,
      size: Math.round(w * 0.026),
      letterSpacing: "8px",
    });
    drawCenteredText(ctx, card.hintLabel.toUpperCase(), cx, Math.round(h * 0.205), {
      color: APH_FG,
      weight: 600,
      size: Math.round(w * 0.038),
      letterSpacing: "5px",
    });
    drawCenteredText(ctx, card.hintValue, cx, Math.round(h * 0.272), {
      color: APH_ACCENT,
      weight: 500,
      size: Math.round(w * 0.034),
      letterSpacing: "1px",
    });
  }
}

function drawBrandMark(ctx, w, h, logoImg, card) {
  drawBottomBand(ctx, w, h);
  const pad = Math.round(w * 0.04);
  const logoSize = Math.round(w * 0.075);
  const baseline = h - pad;
  const logoY = baseline - logoSize;

  if (logoImg) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(logoImg, pad, logoY, logoSize, logoSize);
  }

  const wordmarkX = pad + logoSize + Math.round(w * 0.018);
  const wordmarkSize = Math.round(w * 0.034);
  ctx.fillStyle = APH_FG;
  ctx.font = `700 ${wordmarkSize}px ${BRAND_FONT}`;
  setLetterSpacing(ctx, "3px");
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("APHYDLE", wordmarkX, logoY + logoSize * 0.62);

  // URL on the right edge so it stays scannable in feeds.
  ctx.fillStyle = APH_MUTED;
  ctx.font = `500 ${Math.round(w * 0.022)}px ${BRAND_FONT}`;
  setLetterSpacing(ctx, "3px");
  ctx.textAlign = "right";
  ctx.fillText(APHYDLE_URL.toUpperCase(), w - pad, logoY + logoSize * 0.62);

  // Mosaic tagline below the wordmark — small, accent-colored, brand-defining.
  const taglineY = logoY + logoSize * 0.62 + Math.round(w * 0.026);
  ctx.fillStyle = APH_ACCENT;
  ctx.font = `500 ${Math.round(w * 0.016)}px ${BRAND_FONT}`;
  setLetterSpacing(ctx, "5px");
  ctx.textAlign = "left";
  ctx.fillText("MOSAIC · DAILY PLANT GAME", wordmarkX, taglineY);

  // Mosaic-level chip on the right, mirroring the in-game UI.
  ctx.fillStyle = APH_MUTED;
  ctx.font = `500 ${Math.round(w * 0.016)}px ${BRAND_FONT}`;
  setLetterSpacing(ctx, "5px");
  ctx.textAlign = "right";
  ctx.fillText(`MOSAIC LEVEL ${card.level}`, w - pad, taglineY);

  setLetterSpacing(ctx, "0px");
}

function drawFrame(ctx, w, h) {
  // Thin Aphydle frame to anchor the composition.
  ctx.strokeStyle = "rgba(245,241,232,0.18)";
  ctx.lineWidth = 2;
  const inset = Math.round(w * 0.018);
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
}

function drawCardOnto(canvas, img, logoImg, card) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);

  if (img) {
    drawMosaic(ctx, img, card.level, w, h);
  } else {
    ctx.fillStyle = APH_BG;
    ctx.fillRect(0, 0, w, h);
  }

  drawTopContent(ctx, w, h, card);
  drawBrandMark(ctx, w, h, logoImg, card);
  drawFrame(ctx, w, h);
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

async function ensureBrandFontReady() {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await document.fonts.load(`700 48px "Fira Code"`);
    await document.fonts.load(`500 24px "Fira Code"`);
    await document.fonts.ready;
  } catch {
    /* no-op — fall back to system mono */
  }
}

export function ExportScreen({ theme, onClose, plant, puzzleNo }) {
  const T = tokens(theme);
  const cards = useMemo(() => buildCards(plant), [plant]);
  const [img, setImg] = useState(() => getCachedImage(plant.imageUrl));
  const [logo, setLogo] = useState(() => getCachedImage(logoUrl));
  const [fontReady, setFontReady] = useState(false);
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

  useEffect(() => {
    if (logo) return;
    let cancelled = false;
    preloadImage(logoUrl, { crossOrigin: null }).then((loaded) => {
      if (!cancelled) setLogo(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [logo]);

  useEffect(() => {
    let cancelled = false;
    ensureBrandFontReady().then(() => {
      if (!cancelled) setFontReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const previewRefs = useRef([]);
  useEffect(() => {
    if (!img) return;
    cards.forEach((card, i) => {
      const c = previewRefs.current[i];
      if (c) drawCardOnto(c, img, logo, card);
    });
  }, [img, logo, fontReady, cards]);

  async function handleDownloadAll() {
    if (!img || downloading) return;
    setDownloading(true);
    try {
      await ensureBrandFontReady();
      const safeId = String(plant.id).replace(/[^a-z0-9-]/gi, "-").toLowerCase();
      const stem = `aphydle-${puzzleNo}-${safeId}`;
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const c = document.createElement("canvas");
        c.width = EXPORT_SIZE;
        c.height = EXPORT_SIZE;
        drawCardOnto(c, img, logo, card);
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
        Five 1080&times;1080 cards in the Aphydle palette — leaf mark, wordmark,
        and Fira Code typography on every card. Download them all and post in
        order: teaser, three hints, then the call to play.
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
              background: APH_BG,
              border: `1px solid ${T.border}`,
              overflow: "hidden",
            }}
          >
            <canvas
              ref={(el) => {
                previewRefs.current[i] = el;
                if (el && img) drawCardOnto(el, img, logo, card);
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
                top: 6,
                right: 6,
                fontFamily: "var(--mono)",
                fontSize: 9,
                letterSpacing: "0.14em",
                padding: "3px 6px",
                background: "rgba(0,0,0,0.55)",
                color: APH_FG,
              }}
            >
              {i + 1} · LVL {card.level}
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
