import { useEffect, useRef } from "react";

const GLYPHS = "01ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ";

export default function MatrixElectricField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fontSize = 18;
    const columnSpacing = 24;
    let viewWidth = 0;
    let viewHeight = 0;
    let pixelRatio = 1;
    let drops = [];
    let animationFrame = 0;
    let lastFrame = 0;

    function resize() {
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
      viewWidth = window.innerWidth;
      viewHeight = window.innerHeight;
      canvas.width = Math.round(viewWidth * pixelRatio);
      canvas.height = Math.round(viewHeight * pixelRatio);
      canvas.style.width = `${viewWidth}px`;
      canvas.style.height = `${viewHeight}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      drops = Array.from(
        { length: Math.ceil(viewWidth / columnSpacing) },
        () => Math.random() * (viewHeight / fontSize) - 8
      );
      drawCode(0, true);
    }

    function drawCode(time, staticFrame = false) {
      context.clearRect(0, 0, viewWidth, viewHeight);
      context.font = `${fontSize}px "Consolas", "Yu Gothic", monospace`;
      context.textBaseline = "top";

      drops.forEach((drop, column) => {
        const x = column * columnSpacing;
        const headY = drop * fontSize;
        const trailLength = 7;

        for (let trail = trailLength; trail >= 0; trail -= 1) {
          const y = headY - trail * fontSize;
          if (y < -fontSize || y > viewHeight + fontSize) continue;
          const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          if (trail === 0) {
            context.fillStyle = "rgba(213, 255, 160, 0.88)";
            context.shadowColor = "rgba(132, 255, 45, 0.95)";
            context.shadowBlur = 12;
          } else {
            const alpha = Math.max(0.06, 0.34 - trail * 0.038);
            context.fillStyle = `rgba(92, 255, 37, ${alpha})`;
            context.shadowBlur = 0;
          }
          context.fillText(glyph, x, y);
        }

        context.shadowBlur = 0;
        if (!staticFrame) {
          drops[column] += 0.55 + (column % 5) * 0.09;
          if (headY > viewHeight + Math.random() * viewHeight * 0.55 && Math.random() > 0.975) {
            drops[column] = -Math.random() * 18;
          }
        }
      });
    }

    function frame(time) {
      if (time - lastFrame < 33) {
        animationFrame = window.requestAnimationFrame(frame);
        return;
      }
      lastFrame = time;
      drawCode(time);
      animationFrame = window.requestAnimationFrame(frame);
    }

    resize();
    if (!reducedMotion) animationFrame = window.requestAnimationFrame(frame);
    window.addEventListener("resize", resize, { passive: true });
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="matrix-electric-field" aria-hidden="true" />;
}
