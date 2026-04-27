import { useEffect, useRef, useState } from "react";
import { tileCountForLevel } from "../engine/game.js";
import { getCachedImage, preloadImage } from "../lib/imageCache.js";

export function PlantImage({ src, level, theme, size = 560, framed = true }) {
  const canvasRef = useRef(null);
  // Seed from the shared cache so a remount (e.g. theme toggle, navigation)
  // can paint the first frame without flashing the LOADING placeholder.
  const cachedAtMount = getCachedImage(src);
  const imgRef = useRef(cachedAtMount);
  const rafRef = useRef(null);
  const currentLevelRef = useRef(level);
  const [loaded, setLoaded] = useState(Boolean(cachedAtMount));

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedImage(src);
    if (cached) {
      imgRef.current = cached;
      setLoaded(true);
      draw(currentLevelRef.current);
      return () => {
        cancelled = true;
      };
    }
    setLoaded(false);
    preloadImage(src).then((img) => {
      if (cancelled) return;
      if (!img) {
        setLoaded(false);
        return;
      }
      imgRef.current = img;
      setLoaded(true);
      draw(currentLevelRef.current);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  function draw(lvl) {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const tileCount = tileCountForLevel(lvl);

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

    if (tileCount <= 0) {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    } else {
      const smallW = Math.max(1, Math.round(tileCount));
      const smallH = Math.max(1, Math.round(tileCount));
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, smallW, smallH);
      ctx.drawImage(canvas, 0, 0, smallW, smallH, 0, 0, w, h);
    }
  }

  useEffect(() => {
    if (!loaded) return;
    const startLvl = currentLevelRef.current;
    const endLvl = level;
    const duration = 700;
    const t0 = performance.now();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = startLvl + (endLvl - startLvl) * eased;
      currentLevelRef.current = cur;
      draw(cur);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        currentLevelRef.current = endLvl;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, loaded]);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        background: theme === "light" ? "#E8E2D0" : "#0F0F0F",
        overflow: "hidden",
        borderRadius: framed ? 2 : 0,
        maxWidth: "100%",
      }}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
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
          inset: 0,
          pointerEvents: "none",
          boxShadow:
            theme === "light"
              ? "inset 0 0 80px rgba(26,24,20,0.12)"
              : "inset 0 0 100px rgba(0,0,0,0.55)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "55%",
          height: "55%",
          background:
            theme === "light"
              ? "radial-gradient(circle at top right, rgba(0,127,63,0.06), transparent 60%)"
              : "radial-gradient(circle at top right, rgba(0,210,106,0.07), transparent 60%)",
          pointerEvents: "none",
        }}
      />
      {!loaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: theme === "light" ? "#6B6760" : "#8A8A85",
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.1em",
          }}
        >
          LOADING…
        </div>
      )}
    </div>
  );
}
