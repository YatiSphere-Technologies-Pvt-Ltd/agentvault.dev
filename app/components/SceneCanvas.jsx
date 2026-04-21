"use client";

// Animated canvas background — theme-aware. Reads accent + bg from CSS vars.

import { useEffect, useRef } from "react";

function readCssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
function hslVarToRgba(hslStr, alpha) {
  const m = hslStr.match(/([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/);
  if (!m) return `rgba(60,90,160,${alpha})`;
  const h = parseFloat(m[1]), s = parseFloat(m[2]) / 100, l = parseFloat(m[3]) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const mm = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  const R = Math.round((r + mm) * 255), G = Math.round((g + mm) * 255), B = Math.round((b + mm) * 255);
  return `rgba(${R},${G},${B},${alpha})`;
}

export default function SceneCanvas({ mode = "vault", theme = "light-calm", overlay = 0.15 }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const stateRef = useRef({ t: 0, mx: 0.5, my: 0.5, tmx: 0.5, tmy: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);

    const isLight = theme === "light-calm";
    // Canvas parses H-S-L numerically; read the dedicated --hsl-* fallback tokens.
    const accentHSL = readCssVar("--hsl-primary", "232 45% 38%");
    const fgHSL = readCssVar("--hsl-foreground", "222 28% 14%");
    const bgHSL = readCssVar("--hsl-hero-bg", "36 22% 96%");
    const C = {
      bg: hslVarToRgba(bgHSL, 1),
      accent: (a) => hslVarToRgba(accentHSL, a),
      ink: (a) => hslVarToRgba(fgHSL, a),
      dust: (a) => isLight ? hslVarToRgba(fgHSL, a * 0.5) : hslVarToRgba(accentHSL, a * 0.6),
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = Math.floor(W * DPR);
      canvas.height = Math.floor(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      stateRef.current.tmx = (e.clientX - rect.left) / rect.width;
      stateRef.current.tmy = (e.clientY - rect.top) / rect.height;
    };
    window.addEventListener("mousemove", onMove);

    const phi = (1 + Math.sqrt(5)) / 2;
    const icoVerts = [
      [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
      [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
      [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
    ];
    const icoEdges = [
      [0, 1], [0, 5], [0, 7], [0, 10], [0, 11], [1, 5], [1, 7], [1, 8], [1, 9],
      [2, 3], [2, 4], [2, 6], [2, 10], [2, 11], [3, 4], [3, 6], [3, 8], [3, 9],
      [4, 5], [4, 9], [4, 11], [5, 9], [5, 11], [6, 7], [6, 8], [6, 10],
      [7, 8], [7, 10], [8, 9], [10, 11],
    ];

    const N_AGENTS = 40;
    const agents = Array.from({ length: N_AGENTS }, () => {
      const theta = Math.random() * Math.PI * 2;
      const phi2 = Math.acos(2 * Math.random() - 1);
      const r = 2.0 + Math.random() * 2.0;
      return {
        theta, phi: phi2, r,
        speed: 0.04 + Math.random() * 0.12,
        pulse: Math.random() * Math.PI * 2,
        kind: Math.random() < 0.28 ? "primary" : "dim",
        size: 0.9 + Math.random() * 1.5,
      };
    });

    const N_PACKETS = 18;
    const packets = Array.from({ length: N_PACKETS }, () => ({
      t: Math.random(),
      speed: 0.15 + Math.random() * 0.35,
      fromIdx: Math.floor(Math.random() * N_AGENTS),
      toCore: Math.random() < 0.5,
    }));

    const N_DUST = 70;
    const dust = Array.from({ length: N_DUST }, () => ({
      x: Math.random(), y: Math.random(), z: Math.random(),
      s: 0.3 + Math.random() * 1.1,
      vx: (Math.random() - 0.5) * 0.00008,
      vy: (Math.random() - 0.5) * 0.00008,
      tw: Math.random() * Math.PI * 2,
    }));

    const N_NODES = 48;
    const netNodes = Array.from({ length: N_NODES }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00015,
      vy: (Math.random() - 0.5) * 0.00015,
      pulse: Math.random() * Math.PI * 2,
      primary: Math.random() < 0.22,
    }));
    const netEdges = [];
    for (let i = 0; i < N_NODES; i++) {
      for (let j = i + 1; j < N_NODES; j++) {
        if (Math.random() < 0.05) netEdges.push({ a: i, b: j, w: 0.3 + Math.random() * 0.7, t: Math.random(), sp: 0.08 + Math.random() * 0.3 });
      }
    }

    const project = (x, y, z, cx, cy, scale, rx, ry) => {
      let c = Math.cos(ry), s = Math.sin(ry);
      let X = x * c - z * s;
      let Z = x * s + z * c;
      c = Math.cos(rx); s = Math.sin(rx);
      let Y = y * c - Z * s;
      Z = y * s + Z * c;
      const persp = 5 / (5 + Z);
      return { x: cx + X * scale * persp, y: cy + Y * scale * persp, z: Z, s: persp };
    };

    const agentPos = (ag) => {
      const x = ag.r * Math.sin(ag.phi) * Math.cos(ag.theta);
      const y = ag.r * Math.cos(ag.phi) * 0.7;
      const z = ag.r * Math.sin(ag.phi) * Math.sin(ag.theta);
      return [x, y, z];
    };

    const drawVault = (t, mx, my) => {
      const breathe = 1 + Math.sin(t * 0.5) * 0.025;
      const cx = W * 0.72, cy = H * 0.52;
      const scale = Math.min(W, H) * 0.22 * breathe;
      const rx = (my - 0.5) * 0.5 + Math.sin(t * 0.12) * 0.08;
      const ry = t * 0.18 + (mx - 0.5) * 0.5;

      dust.forEach((d) => {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = 1; if (d.x > 1) d.x = 0;
        if (d.y < 0) d.y = 1; if (d.y > 1) d.y = 0;
        const a = (0.10 + Math.sin(t * 1.2 + d.tw) * 0.06) * (0.4 + d.z * 0.6);
        ctx.fillStyle = C.dust(a);
        ctx.beginPath();
        ctx.arc(d.x * W, d.y * H, d.s * (0.4 + d.z), 0, Math.PI * 2);
        ctx.fill();
      });

      const gAlpha = 0.05 + Math.sin(t * 0.7) * 0.02;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 3.5);
      g.addColorStop(0, C.accent(gAlpha + 0.06));
      g.addColorStop(0.4, C.accent(gAlpha * 0.4));
      g.addColorStop(1, C.accent(0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(cx, cy);
      for (let i = 0; i < 3; i++) {
        const orbR = scale * (2.0 + i * 0.4);
        const tilt = Math.sin(t * 0.08 + i * 0.7) * 0.25 + rx + i * 0.08;
        ctx.strokeStyle = C.accent(0.08 + i * 0.02);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, orbR, orbR * 0.28, tilt, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      const pts = icoVerts.map(v => project(v[0], v[1], v[2], cx, cy, scale, rx, ry));

      const edgesWithDepth = icoEdges.map(([a, b]) => ({
        a, b, z: (pts[a].z + pts[b].z) / 2,
      })).sort((p, q) => p.z - q.z);

      edgesWithDepth.forEach(({ a, b, z }) => {
        const p1 = pts[a], p2 = pts[b];
        const depth = Math.max(0, Math.min(1, (z + 2) / 4));
        const alpha = (isLight ? 0.12 : 0.18) + (1 - depth) * (isLight ? 0.35 : 0.55);
        ctx.strokeStyle = C.accent(alpha);
        ctx.lineWidth = 1 + (1 - depth) * 0.6;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      pts.forEach((p) => {
        const depth = Math.max(0, Math.min(1, (p.z + 2) / 4));
        const a = 0.4 + (1 - depth) * 0.55;
        ctx.fillStyle = C.accent(a);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.8 + (1 - depth) * 1.2, 0, Math.PI * 2);
        ctx.fill();
      });

      const pts2 = icoVerts.map(v => project(v[0] * 0.5, v[1] * 0.5, v[2] * 0.5, cx, cy, scale, -rx * 0.8, -ry * 1.3));
      icoEdges.forEach(([a, b]) => {
        const z = (pts2[a].z + pts2[b].z) / 2;
        const depth = Math.max(0, Math.min(1, (z + 2) / 4));
        ctx.strokeStyle = C.accent(0.06 + (1 - depth) * 0.06);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(pts2[a].x, pts2[a].y);
        ctx.lineTo(pts2[b].x, pts2[b].y);
        ctx.stroke();
      });

      const coreG = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 0.55);
      coreG.addColorStop(0, C.accent(0.35 + Math.sin(t * 1.2) * 0.12));
      coreG.addColorStop(0.5, C.accent(0.1));
      coreG.addColorStop(1, C.accent(0));
      ctx.fillStyle = coreG;
      ctx.beginPath();
      ctx.arc(cx, cy, scale * 0.55, 0, Math.PI * 2);
      ctx.fill();

      const agentScreen = agents.map((ag) => {
        ag.theta += ag.speed * 0.01;
        const [x, y, z] = agentPos(ag);
        const p = project(x, y, z, cx, cy, scale, rx, ry);
        return { ag, p };
      });

      packets.forEach((pk) => {
        pk.t += pk.speed * 0.006;
        if (pk.t >= 1) {
          pk.t = 0;
          pk.fromIdx = Math.floor(Math.random() * N_AGENTS);
          pk.toCore = Math.random() < 0.55;
        }
        const src = agentScreen[pk.fromIdx];
        const dst = pk.toCore
          ? { p: { x: cx, y: cy, s: 1, z: 0 } }
          : agentScreen[(pk.fromIdx + 7) % N_AGENTS];
        const k = pk.t;
        const x = src.p.x + (dst.p.x - src.p.x) * k;
        const y = src.p.y + (dst.p.y - src.p.y) * k;
        ctx.strokeStyle = C.accent(0.08 + (1 - k) * 0.1);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(src.p.x, src.p.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        const hg = ctx.createRadialGradient(x, y, 0, x, y, 7);
        hg.addColorStop(0, C.accent(0.7));
        hg.addColorStop(1, C.accent(0));
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
      });

      agentScreen.forEach(({ ag, p }) => {
        const depth = Math.max(0, Math.min(1, (p.z + 2) / 4));
        const pulseA = 0.65 + Math.sin(t * 1.8 + ag.pulse) * 0.35;
        if (ag.kind === "primary") {
          const gg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10 * p.s);
          gg.addColorStop(0, C.accent(0.45 * pulseA));
          gg.addColorStop(1, C.accent(0));
          ctx.fillStyle = gg;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 10 * p.s, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = C.accent(0.9 * pulseA);
          ctx.beginPath();
          ctx.arc(p.x, p.y, ag.size * p.s * 1.1, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = C.ink((0.35 - depth * 0.2) * pulseA);
          ctx.beginPath();
          ctx.arc(p.x, p.y, ag.size * p.s, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    };

    const drawNetwork = (t, mx, my) => {
      const gx = W * (0.65 + (mx - 0.5) * 0.1);
      const gy = H * (0.5 + (my - 0.5) * 0.1);
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(W, H) * 0.7);
      g.addColorStop(0, C.accent(0.08 + Math.sin(t * 0.7) * 0.02));
      g.addColorStop(1, C.accent(0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      dust.forEach((d) => {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = 1; if (d.x > 1) d.x = 0;
        if (d.y < 0) d.y = 1; if (d.y > 1) d.y = 0;
        ctx.fillStyle = C.dust(0.1 + Math.sin(t + d.tw) * 0.05);
        ctx.beginPath();
        ctx.arc(d.x * W, d.y * H, d.s * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });

      netNodes.forEach((n) => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0.02 || n.x > 0.98) n.vx *= -1;
        if (n.y < 0.02 || n.y > 0.98) n.vy *= -1;
      });

      netEdges.forEach((e) => {
        const a = netNodes[e.a], b = netNodes[e.b];
        const dx = (a.x - b.x) * W, dy = (a.y - b.y) * H;
        const dist = Math.hypot(dx, dy);
        if (dist > Math.min(W, H) * 0.4) return;
        const alpha = e.w * (1 - dist / (Math.min(W, H) * 0.4)) * (isLight ? 0.35 : 0.5);
        ctx.strokeStyle = C.accent(alpha * 0.4);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(a.x * W, a.y * H);
        ctx.lineTo(b.x * W, b.y * H);
        ctx.stroke();

        for (let kk = 0; kk < 2; kk++) {
          const k = (e.t + t * e.sp + kk * 0.5) % 1;
          const px = a.x * W + (b.x - a.x) * W * k;
          const py = a.y * H + (b.y - a.y) * H * k;
          const pg = ctx.createRadialGradient(px, py, 0, px, py, 5);
          pg.addColorStop(0, C.accent(alpha * 1.5));
          pg.addColorStop(1, C.accent(0));
          ctx.fillStyle = pg;
          ctx.beginPath();
          ctx.arc(px, py, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      netNodes.forEach((n) => {
        const pulseA = 0.6 + Math.sin(t * 1.8 + n.pulse) * 0.4;
        const x = n.x * W, y = n.y * H;
        if (n.primary) {
          const gg = ctx.createRadialGradient(x, y, 0, x, y, 14);
          gg.addColorStop(0, C.accent(0.5 * pulseA));
          gg.addColorStop(1, C.accent(0));
          ctx.fillStyle = gg;
          ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = C.accent(pulseA);
          ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = C.ink(0.3 * pulseA);
          ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
        }
      });
    };

    const drawLattice = (t, mx, my) => {
      const cx = W * 0.68, cy = H * 0.52;
      const scale = Math.min(W, H) * 0.08;
      const rx = -0.3 + (my - 0.5) * 0.25;
      const ry = t * 0.06 + (mx - 0.5) * 0.35;
      const pulseT = (t * 0.35) % 1;

      const pts = [];
      for (let x = -4; x <= 4; x += 0.9) {
        for (let y = -4; y <= 4; y += 0.9) {
          for (let z = -4; z <= 4; z += 0.9) {
            const onShell = Math.abs(x) >= 3.6 || Math.abs(y) >= 3.6 || Math.abs(z) >= 3.6;
            const wave = Math.sin(x * 0.5 + t * 0.6) * Math.cos(z * 0.5 + t * 0.4);
            const yy = y + wave * 0.3;
            const p = project(x, yy, z, cx, cy, scale, rx, ry);
            const depth = Math.max(0, Math.min(1, (p.z + 4) / 8));
            const rad = Math.hypot(x, y, z) / 4;
            const pulseA = Math.max(0, 1 - Math.abs(rad - pulseT) * 3);
            pts.push({ p, depth, onShell, pulseA });
          }
        }
      }
      pts.sort((a, b) => a.p.z - b.p.z);
      pts.forEach(({ p, depth, onShell, pulseA }) => {
        const base = onShell ? 0.3 + (1 - depth) * 0.4 : 0.06 + (1 - depth) * 0.14;
        const a = base + pulseA * 0.5;
        const size = onShell ? 1.3 : 0.9;
        ctx.fillStyle = (onShell || pulseA > 0.3) ? C.accent(Math.min(0.85, a)) : C.ink(a * 0.5);
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * p.s * (1 + pulseA * 0.4), 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const loop = () => {
      stateRef.current.t += 1 / 60;
      stateRef.current.mx += (stateRef.current.tmx - stateRef.current.mx) * 0.05;
      stateRef.current.my += (stateRef.current.tmy - stateRef.current.my) * 0.05;
      const { t, mx, my } = stateRef.current;

      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);

      if (mode === "vault") drawVault(t, mx, my);
      else if (mode === "network") drawNetwork(t, mx, my);
      else if (mode === "lattice") drawLattice(t, mx, my);

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      window.removeEventListener("mousemove", onMove);
    };
  }, [mode, theme]);

  const isLight = theme === "light-calm";

  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} className="hero-canvas" />
      <div
        className="absolute inset-y-0 left-0 w-2/3 pointer-events-none"
        style={{
          background: isLight
            ? "linear-gradient(90deg, var(--background) 0%, color-mix(in oklab, var(--background) 85%, transparent) 40%, transparent 100%)"
            : "linear-gradient(90deg, var(--background) 0%, color-mix(in oklab, var(--background) 70%, transparent) 45%, transparent 100%)",
          zIndex: 3,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isLight ? `rgba(255,255,255,${overlay * 0.4})` : `rgba(0,0,0,${overlay})`,
          zIndex: 3,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isLight
            ? "linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 25%, transparent 75%, var(--background) 100%)"
            : "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, transparent 30%, transparent 75%, rgba(0,0,0,0.5) 100%)",
          zIndex: 3,
        }}
      />
    </div>
  );
}
