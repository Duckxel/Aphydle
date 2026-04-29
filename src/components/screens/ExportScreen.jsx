import { useEffect, useMemo, useRef, useState } from "react";
import { tokens } from "../ui/tokens.js";
import { Sheet } from "./Sheet.jsx";
import { tileCountForLevel, buildHint } from "../../engine/game.js";
import { preloadImage, getCachedImage } from "../../lib/imageCache.js";
import { loadArchivedPuzzle } from "../../lib/data.js";
import logoUrl from "../../assets/FINAL.png";

const APHYDLE_URL = "aphydle.aphylia.app";
const EXPORT_SIZE = 1080;
const BRAND_FONT = '"Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace';
const APH_BG = "#0A0A0A";
const APH_FG = "#F5F1E8";
const APH_ACCENT = "#00D26A";
const APH_MUTED = "#8A8A85";

// Full pool of hints the export can surface. Picking three deterministically
// per plant (seeded by id) means each plant gets a stable but varied trio
// instead of always Climate / Plant type / Foliage.
const HINT_POOL = [
  { key: "family", label: "Family" },
  { key: "type", label: "Plant type" },
  { key: "utility", label: "Utility" },
  { key: "origin", label: "Country of origin" },
  { key: "climate", label: "Climate" },
  { key: "livingSpace", label: "Living space" },
  { key: "foliage", label: "Foliage" },
  { key: "habitat", label: "Habitat" },
  { key: "lifeCycle", label: "Life cycle" },
];

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Fisher–Yates with an LCG seeded off the plant id — same plant always gets
// the same shuffle, different plants don't.
function seededShuffle(arr, seedStr) {
  const out = arr.slice();
  let s = hashString(String(seedStr || "aphydle")) || 1;
  function rand() {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickHintsForPlant(plant) {
  const populated = HINT_POOL.filter(
    (h) => String(buildHint(h.key, plant) || "").trim() !== "",
  );
  return seededShuffle(populated, plant?.id || "").slice(0, 3);
}

function buildCards(plant, yesterday) {
  const hints = pickHintsForPlant(plant);
  const cards = [
    { level: 7, kind: "title", title: "TRY TO GUESS", subtitle: "THE PLANT" },
    ...hints.map((h, i) => ({
      level: 6 - i,
      kind: "hint",
      hintLabel: h.label,
      hintValue: buildHint(h.key, plant),
    })),
    { level: 3, kind: "cta", title: "TRY ON APHYDLE", subtitle: APHYDLE_URL },
  ];
  if (yesterday?.plant) {
    cards.push({
      level: 0,
      kind: "yesterday",
      plant: yesterday.plant,
      puzzleNo: yesterday.puzzleNo,
    });
  }
  return cards;
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

function drawTopBand(ctx, w, h, kind) {
  // Soft dark gradient at the top so overlay text reads on any image.
  // Hint cards extend the band so the value text below the label stays readable.
  // Yesterday's reveal also needs the wider band (eyebrow + line + name + sci).
  const ratio = kind === "hint" || kind === "yesterday" ? 0.42 : 0.34;
  const bandHeight = Math.round(h * ratio);
  const grad = ctx.createLinearGradient(0, 0, 0, bandHeight);
  grad.addColorStop(0, "rgba(10,10,10,0.92)");
  grad.addColorStop(0.7, "rgba(10,10,10,0.6)");
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
  drawTopBand(ctx, w, h, card.kind);
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
    drawCenteredText(ctx, "HINT", cx, Math.round(h * 0.13), {
      color: APH_MUTED,
      weight: 500,
      size: Math.round(w * 0.024),
      letterSpacing: "8px",
    });
    drawCenteredText(ctx, card.hintLabel.toUpperCase(), cx, Math.round(h * 0.185), {
      color: APH_ACCENT,
      weight: 600,
      size: Math.round(w * 0.032),
      letterSpacing: "5px",
    });
    const value = (card.hintValue || "").trim() || "—";
    const valueSize = Math.round(w * 0.058);
    drawCenteredText(ctx, value, cx, Math.round(h * 0.28), {
      color: APH_FG,
      weight: 700,
      size: valueSize,
      letterSpacing: "2px",
    });
  } else if (card.kind === "yesterday") {
    drawCenteredText(ctx, "YESTERDAY", cx, Math.round(h * 0.13), {
      color: APH_MUTED,
      weight: 500,
      size: Math.round(w * 0.024),
      letterSpacing: "8px",
    });
    drawCenteredText(ctx, "THE ANSWER WAS", cx, Math.round(h * 0.185), {
      color: APH_ACCENT,
      weight: 600,
      size: Math.round(w * 0.026),
      letterSpacing: "5px",
    });
    const name = (card.plant?.commonName || "—").toUpperCase();
    const nameSize = Math.round(w * (name.length > 22 ? 0.045 : name.length > 16 ? 0.052 : 0.062));
    drawCenteredText(ctx, name, cx, Math.round(h * 0.28), {
      color: APH_FG,
      weight: 700,
      size: nameSize,
      letterSpacing: "3px",
    });
    if (card.plant?.scientificName && card.plant.scientificName !== card.plant.commonName) {
      drawCenteredText(ctx, card.plant.scientificName.toUpperCase(), cx, Math.round(h * 0.335), {
        color: APH_MUTED,
        weight: 500,
        size: Math.round(w * 0.022),
        letterSpacing: "3px",
      });
    }
  }
}

// Right-edge "swipe →" affordance drawn on every card except the last so the
// carousel reads as continuous on Instagram / X / TikTok. Vertically centered
// with a soft circular shadow so it stays legible over any mosaic.
function drawSwipeIndicator(ctx, w, h) {
  const cx = w - Math.round(w * 0.06);
  const cy = h / 2;
  const radius = Math.round(w * 0.04);

  ctx.fillStyle = "rgba(10,10,10,0.6)";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `${APH_ACCENT}80`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.strokeStyle = APH_ACCENT;
  ctx.lineWidth = Math.max(3, Math.round(w * 0.005));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const armX = radius * 0.38;
  const armY = radius * 0.42;
  ctx.beginPath();
  ctx.moveTo(cx - armX * 0.6, cy - armY);
  ctx.lineTo(cx + armX * 0.7, cy);
  ctx.lineTo(cx - armX * 0.6, cy + armY);
  ctx.stroke();

  ctx.fillStyle = APH_FG;
  ctx.font = `600 ${Math.round(w * 0.014)}px ${BRAND_FONT}`;
  setLetterSpacing(ctx, "3px");
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("SWIPE", cx, cy + radius + Math.round(w * 0.025));
  setLetterSpacing(ctx, "0px");
}

function drawBrandMark(ctx, w, h, logoImg) {
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

  setLetterSpacing(ctx, "0px");
}

function drawFrame(ctx, w, h) {
  // Thin Aphydle frame to anchor the composition.
  ctx.strokeStyle = "rgba(245,241,232,0.18)";
  ctx.lineWidth = 2;
  const inset = Math.round(w * 0.018);
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
}

function drawCardOnto(canvas, images, logoImg, card, position) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);

  // The yesterday card pulls a different source image (yesterday's answer)
  // and renders it clear; every other card uses today's mosaic.
  const sourceImg = card.kind === "yesterday" ? images.yesterday : images.today;
  if (sourceImg) {
    drawMosaic(ctx, sourceImg, card.level, w, h);
  } else {
    ctx.fillStyle = APH_BG;
    ctx.fillRect(0, 0, w, h);
  }

  drawTopContent(ctx, w, h, card);
  drawBrandMark(ctx, w, h, logoImg);
  drawFrame(ctx, w, h);
  if (position && position.current < position.total - 1) {
    drawSwipeIndicator(ctx, w, h);
  }
}

function canvasToBytes(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(null);
        return;
      }
      const buf = await blob.arrayBuffer();
      resolve(new Uint8Array(buf));
    }, "image/png");
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC32_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Minimal store-only ZIP encoder — PNGs are already compressed, so storing them
// keeps the implementation tiny and avoids pulling in a deflate library just to
// bundle five files behind one download click.
function makeZipBlob(files) {
  const enc = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const data = f.data;
    const crc = crc32(data);
    const size = data.length;

    const local = new ArrayBuffer(30 + nameBytes.length);
    const lv = new DataView(local);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    new Uint8Array(local, 30).set(nameBytes);
    parts.push(new Uint8Array(local), data);

    const cd = new ArrayBuffer(46 + nameBytes.length);
    const cv = new DataView(cd);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    new Uint8Array(cd, 46).set(nameBytes);
    central.push(new Uint8Array(cd));

    offset += 30 + nameBytes.length + size;
  }

  const cdSize = central.reduce((s, p) => s + p.length, 0);
  const cdOffset = offset;

  const eocd = new ArrayBuffer(22);
  const ev = new DataView(eocd);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdOffset, true);
  ev.setUint16(20, 0, true);

  return new Blob([...parts, ...central, new Uint8Array(eocd)], {
    type: "application/zip",
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
  const [yesterday, setYesterday] = useState(null);
  const cards = useMemo(() => buildCards(plant, yesterday), [plant, yesterday]);
  const [img, setImg] = useState(() => getCachedImage(plant.imageUrl));
  const [yesterdayImg, setYesterdayImg] = useState(null);
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

  // Pull yesterday's plant so the carousel can close with a "the answer was…"
  // reveal. Skipped for puzzle #1 (no prior day exists yet).
  useEffect(() => {
    if (!puzzleNo || puzzleNo <= 1) return;
    let cancelled = false;
    loadArchivedPuzzle(puzzleNo - 1).then((res) => {
      if (cancelled || !res?.plant) return;
      setYesterday(res);
      const cached = getCachedImage(res.plant.imageUrl);
      if (cached) {
        setYesterdayImg(cached);
      } else if (res.plant.imageUrl) {
        preloadImage(res.plant.imageUrl).then((loaded) => {
          if (!cancelled) setYesterdayImg(loaded);
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [puzzleNo]);

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
    const images = { today: img, yesterday: yesterdayImg };
    cards.forEach((card, i) => {
      const c = previewRefs.current[i];
      if (c) {
        drawCardOnto(c, images, logo, card, { current: i, total: cards.length });
      }
    });
  }, [img, yesterdayImg, logo, fontReady, cards]);

  // Block download until every image the carousel needs is decoded — otherwise
  // the yesterday card would render as a black square.
  const waitingForYesterday =
    !!yesterday?.plant?.imageUrl && !yesterdayImg;
  const ready = !!img && !waitingForYesterday;

  async function handleDownloadAll() {
    if (!ready || downloading) return;
    setDownloading(true);
    try {
      await ensureBrandFontReady();
      const safeId = String(plant.id).replace(/[^a-z0-9-]/gi, "-").toLowerCase();
      const stem = `aphydle-${puzzleNo}-${safeId}`;
      const images = { today: img, yesterday: yesterdayImg };
      const files = [];
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const c = document.createElement("canvas");
        c.width = EXPORT_SIZE;
        c.height = EXPORT_SIZE;
        drawCardOnto(c, images, logo, card, { current: i, total: cards.length });
        const data = await canvasToBytes(c);
        if (!data) continue;
        files.push({ name: `${stem}-${i + 1}.png`, data });
      }
      if (files.length === 0) return;
      const zip = makeZipBlob(files);
      downloadBlob(zip, `${stem}.zip`);
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
        {cards.length} 1080&times;1080 cards in the Aphydle palette — leaf mark,
        wordmark, and Fira Code typography on every card. Order: teaser, three
        random hints picked for this plant, the call to play
        {yesterday?.plant ? ", and yesterday's reveal" : ""}. A
        swipe arrow nudges viewers through the carousel.
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
                if (el && img) {
                  drawCardOnto(
                    el,
                    { today: img, yesterday: yesterdayImg },
                    logo,
                    card,
                    { current: i, total: cards.length },
                  );
                }
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
          disabled={!ready || downloading}
          style={{
            flex: 1,
            minWidth: 220,
            padding: "16px 22px",
            background: T.accent,
            color: "#0A0A0A",
            border: "none",
            cursor: !ready || downloading ? "wait" : "pointer",
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.16em",
            fontWeight: 700,
            opacity: !ready || downloading ? 0.6 : 1,
          }}
        >
          {downloading
            ? "PREPARING…"
            : `DOWNLOAD ALL · ${cards.length} IMAGES (.ZIP)`}
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
