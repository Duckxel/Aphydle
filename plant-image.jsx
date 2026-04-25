// Aphydle — Plant image with mosaic blur. Animates between levels.

const { useEffect, useRef, useState } = React;

function PlantImage({ src, level, theme, size = 560, framed = true }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const rafRef = useRef(null);
  const currentLevelRef = useRef(level);
  const [loaded, setLoaded] = useState(false);

  // Load the image once
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      imgRef.current = img;
      setLoaded(true);
      draw(currentLevelRef.current);
    };
    img.onerror = () => setLoaded(false);
    return () => {
      img.onload = null;
      img.onerror = null;
    };
    // eslint-disable-next-line
  }, [src]);

  function draw(lvl) {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    // tileCount = number of mosaic tiles across the image. Canvas-size-independent.
    const tileCount = window.APHYDLE_ENGINE.tileCountForLevel(lvl);

    ctx.imageSmoothingEnabled = false;
    // Cover-fit the source into the canvas
    const srcAR = img.width / img.height;
    const dstAR = w / h;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
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

  // Animate level changes
  useEffect(() => {
    if (!loaded) return;
    const startLvl = currentLevelRef.current;
    const endLvl = level;
    const duration = 700;
    const t0 = performance.now();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      // ease-out cubic
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
    // eslint-disable-next-line
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
      }}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: "100%", height: "100%", display: "block", imageRendering: "pixelated" }}
      />
      {/* subtle vignette */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        boxShadow: theme === "light"
          ? "inset 0 0 80px rgba(26,24,20,0.12)"
          : "inset 0 0 100px rgba(0,0,0,0.55)",
      }} />
      {/* chlorophyll glow corner */}
      <div style={{
        position: "absolute", top: 0, right: 0, width: "55%", height: "55%",
        background: theme === "light"
          ? "radial-gradient(circle at top right, rgba(0,127,63,0.06), transparent 60%)"
          : "radial-gradient(circle at top right, rgba(0,210,106,0.07), transparent 60%)",
        pointerEvents: "none",
      }} />
      {!loaded && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          color: theme === "light" ? "#6B6760" : "#8A8A85",
          fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.1em",
        }}>LOADING…</div>
      )}
    </div>
  );
}

window.PlantImage = PlantImage;
