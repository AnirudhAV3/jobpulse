"use client";

import { useEffect, useRef } from "react";

interface PortalNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: "volt" | "mint" | "sky";
  phase: number;
}

interface DataPulse {
  fromIdx: number;
  toIdx: number;
  t: number;
  speed: number;
  color: string;
}

const NODE_COLORS = {
  volt: "182, 255, 60",
  mint: "94, 234, 212",
  sky: "125, 211, 252",
};

export default function LoginAbstractBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId = 0;
    let nodes: PortalNode[] = [];
    let pulses: DataPulse[] = [];

    const pointer = { x: -9999, y: -9999, active: false };

    const initScene = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const isMobile = width < 768;
      const count = isMobile ? 28 : 54;
      const palette: ("volt" | "mint" | "sky")[] = ["volt", "mint", "sky", "volt"];

      nodes = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * (isMobile ? 0.32 : 0.45),
        vy: (Math.random() - 0.5) * (isMobile ? 0.32 : 0.45),
        r: 1.4 + Math.random() * 2.1,
        hue: palette[i % palette.length],
        phase: Math.random() * Math.PI * 2,
      }));

      pulses = [];
    };

    initScene();

    const onResize = () => initScene();
    const onPointerMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    };
    const onPointerLeave = () => {
      pointer.active = false;
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);

    let time = 0;

    const drawHarmonicRibbons = (t: number) => {
      const ribbons = [
        {
          amp1: 58,
          amp2: 28,
          freq1: 0.0022,
          freq2: 0.0048,
          speed: 0.55,
          yOffset: height * 0.28,
          alpha: 0.16,
          width: 1.8,
        },
        {
          amp1: 74,
          amp2: 34,
          freq1: 0.0018,
          freq2: 0.0039,
          speed: -0.42,
          yOffset: height * 0.52,
          alpha: 0.13,
          width: 1.5,
        },
        {
          amp1: 48,
          amp2: 24,
          freq1: 0.0026,
          freq2: 0.0053,
          speed: 0.36,
          yOffset: height * 0.74,
          alpha: 0.14,
          width: 1.4,
        },
        {
          amp1: 64,
          amp2: 20,
          freq1: 0.002,
          freq2: 0.0042,
          speed: 0.68,
          yOffset: height * 0.4,
          alpha: 0.09,
          width: 2.6,
        },
      ];

      for (const rb of ribbons) {
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, `rgba(182, 255, 60, 0)`);
        grad.addColorStop(0.22, `rgba(182, 255, 60, ${rb.alpha})`);
        grad.addColorStop(0.55, `rgba(94, 234, 212, ${rb.alpha * 1.15})`);
        grad.addColorStop(0.82, `rgba(125, 211, 252, ${rb.alpha * 0.9})`);
        grad.addColorStop(1, `rgba(125, 211, 252, 0)`);

        ctx.beginPath();
        const step = width < 768 ? 18 : 12;
        for (let x = 0; x <= width + step; x += step) {
          const y =
            rb.yOffset +
            Math.sin(x * rb.freq1 + t * rb.speed) * rb.amp1 +
            Math.cos(x * rb.freq2 - t * rb.speed * 1.3) * rb.amp2;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = grad;
        ctx.lineWidth = rb.width;
        ctx.stroke();
      }
    };

    const render = () => {
      time += prefersReduced ? 0.003 : 0.014;
      ctx.clearRect(0, 0, width, height);

      // 1. Sweeping abstract harmonic light waves
      drawHarmonicRibbons(time);

      // 2. Update & draw portal constellation nodes
      const maxDist = width < 768 ? 125 : 165;
      const maxDistSq = maxDist * maxDist;

      for (const n of nodes) {
        if (!prefersReduced) {
          n.x += n.vx;
          n.y += n.vy;

          if (pointer.active) {
            const dx = pointer.x - n.x;
            const dy = pointer.y - n.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < 48000 && dSq > 64) {
              const pull = 0.00035;
              n.vx += dx * pull;
              n.vy += dy * pull;
            }
          }

          // Gentle velocity damping
          const spd = Math.hypot(n.vx, n.vy);
          if (spd > 0.85) {
            n.vx = (n.vx / spd) * 0.85;
            n.vy = (n.vy / spd) * 0.85;
          }

          if (n.x < -20) n.x = width + 20;
          if (n.x > width + 20) n.x = -20;
          if (n.y < -20) n.y = height + 20;
          if (n.y > height + 20) n.y = -20;
        }
      }

      // 3. Draw constellation links + spawn live data packets
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dSq = dx * dx + dy * dy;
          if (dSq < maxDistSq) {
            const dist = Math.sqrt(dSq);
            const alpha = (1 - dist / maxDist) * 0.22;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(${NODE_COLORS[a.hue]}, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();

            // Occasionally launch a glowing data packet along an active link
            if (
              !prefersReduced &&
              pulses.length < 16 &&
              Math.random() < 0.0009
            ) {
              pulses.push({
                fromIdx: i,
                toIdx: j,
                t: 0,
                speed: 0.012 + Math.random() * 0.014,
                color: a.hue === "volt" ? "#b6ff3c" : a.hue === "mint" ? "#5eead4" : "#7dd3fc",
              });
            }
          }
        }

        // Pointer interactive laser filaments
        if (pointer.active) {
          const pdx = pointer.x - a.x;
          const pdy = pointer.y - a.y;
          const pdSq = pdx * pdx + pdy * pdy;
          if (pdSq < 36000) {
            const pAlpha = (1 - Math.sqrt(pdSq) / 190) * 0.38;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.strokeStyle = `rgba(182, 255, 60, ${pAlpha.toFixed(3)})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }
      }

      // 4. Advance & render traveling data pulses
      for (let k = pulses.length - 1; k >= 0; k--) {
        const p = pulses[k];
        p.t += p.speed;
        if (p.t >= 1) {
          pulses.splice(k, 1);
          continue;
        }
        const a = nodes[p.fromIdx];
        const b = nodes[p.toIdx];
        if (!a || !b) {
          pulses.splice(k, 1);
          continue;
        }
        const px = a.x + (b.x - a.x) * p.t;
        const py = a.y + (b.y - a.y) * p.t;

        ctx.beginPath();
        ctx.arc(px, py, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 5. Render glowing portal nodes
      for (const n of nodes) {
        const pulseScale = 0.75 + 0.35 * Math.sin(time * 2.1 + n.phase);
        const rgb = NODE_COLORS[n.hue];

        // Outer halo
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 2.8 * pulseScale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, 0.11)`;
        ctx.fill();

        // Crisp core
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * pulseScale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, 0.85)`;
        ctx.fill();
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#040708]">
      {/* Layer 1: Morphing volumetric aurora nebulae */}
      <div
        className="aurora-blob-a absolute -left-32 -top-32 h-[480px] w-[620px] rounded-full opacity-35 blur-[130px] sm:h-[620px] sm:w-[760px]"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, rgba(182, 255, 60, 0.55), rgba(16, 185, 129, 0.18) 55%, transparent 75%)",
        }}
      />
      <div
        className="aurora-blob-b absolute -bottom-40 -right-28 h-[460px] w-[580px] rounded-full opacity-35 blur-[135px] sm:h-[600px] sm:w-[720px]"
        style={{
          background:
            "radial-gradient(circle at 60% 60%, rgba(94, 234, 212, 0.5), rgba(56, 189, 248, 0.22) 55%, transparent 75%)",
        }}
      />
      <div
        className="aurora-blob-c absolute left-1/2 top-1/3 h-[380px] w-[500px] -translate-x-1/2 rounded-full opacity-25 blur-[140px]"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(125, 211, 252, 0.42), rgba(182, 255, 60, 0.15) 60%, transparent 80%)",
        }}
      />

      {/* Layer 2: Subtle top micro-grid + bottom 3D flowing cyber horizon */}
      <div className="bg-grid absolute inset-0 opacity-65" />
      <div className="login-perspective-grid absolute inset-x-0 bottom-0 h-[44vh]" />

      {/* Layer 3: Counter-rotating abstract orbital telemetry rings */}
      <svg
        viewBox="0 0 800 800"
        aria-hidden="true"
        className="orbit-cw absolute left-1/2 top-1/2 h-[680px] w-[680px] opacity-[0.16] sm:h-[920px] sm:w-[920px]"
      >
        <defs>
          <linearGradient id="jpOrbitVolt" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b6ff3c" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#5eead4" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle
          cx="400"
          cy="400"
          r="340"
          fill="none"
          stroke="url(#jpOrbitVolt)"
          strokeWidth="1.2"
          strokeDasharray="14 10 2 10"
        />
        <circle
          cx="400"
          cy="400"
          r="265"
          fill="none"
          stroke="rgba(94,234,212,0.35)"
          strokeWidth="0.8"
          strokeDasharray="90 180"
        />
        <circle cx="740" cy="400" r="4" fill="#b6ff3c" />
        <circle cx="400" cy="135" r="3" fill="#5eead4" />
      </svg>

      <svg
        viewBox="0 0 800 800"
        aria-hidden="true"
        className="orbit-ccw absolute left-1/2 top-1/2 h-[540px] w-[540px] opacity-[0.14] sm:h-[740px] sm:w-[740px]"
      >
        <circle
          cx="400"
          cy="400"
          r="310"
          fill="none"
          stroke="rgba(125,211,252,0.45)"
          strokeWidth="1"
          strokeDasharray="4 14"
        />
        <circle
          cx="400"
          cy="400"
          r="210"
          fill="none"
          stroke="rgba(182,255,60,0.35)"
          strokeWidth="1.1"
          strokeDasharray="120 220"
        />
        <circle cx="90" cy="400" r="3.5" fill="#7dd3fc" />
      </svg>

      {/* Layer 4: 60fps Interactive Harmonic Waves & Neural Portal Constellation Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Layer 5: Soft radial vignette so foreground Login Card pops with crisp contrast */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 75% 70% at 50% 50%, rgba(4,7,8,0.12) 0%, rgba(4,7,8,0.68) 100%)",
        }}
      />
    </div>
  );
}
