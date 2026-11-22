"use client";

import { useEffect, useRef } from "react";

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  lifetime: number;
  hue: number;
  size: number;
};

export default function SoldFireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastTime = 0;
    let nextBurst = 0;
    let sparks: Spark[] = [];

    function resize() {
      if (!canvas || !context) return;
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }

    function burst() {
      const x = width * (0.12 + Math.random() * 0.76);
      const y = height * (0.12 + Math.random() * 0.6);
      const scale = Math.max(0.65, Math.min(width / 900, 1.3));
      const hue = Math.random() < 0.2 ? 10 : 38 + Math.random() * 12;

      for (let i = 0; i < 72; i++) {
        const angle = (i / 72) * Math.PI * 2 + (Math.random() - 0.5) * 0.12;
        const speed = (35 + Math.random() * 135) * scale;
        sparks.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          age: 0,
          lifetime: 0.8 + Math.random() * 1.1,
          hue: hue + Math.random() * 8,
          size: 1.2 + Math.random() * 1.5,
        });
      }
    }

    function animate(time: number) {
      if (!context) return;
      const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
      lastTime = time;
      nextBurst -= delta;
      if (nextBurst <= 0) {
        burst();
        nextBurst = 0.35 + Math.random() * 0.25;
      }

      context.clearRect(0, 0, width, height);
      context.lineCap = "round";
      context.shadowBlur = 5;
      context.shadowColor = "#f59e0b";
      sparks = sparks.filter((spark) => {
        spark.age += delta;
        if (spark.age >= spark.lifetime) return false;
        spark.x += spark.vx * delta;
        spark.y += spark.vy * delta;
        spark.vx *= Math.pow(0.45, delta);
        spark.vy = spark.vy * Math.pow(0.45, delta) + 35 * delta;

        const remaining = 1 - spark.age / spark.lifetime;
        const flicker = 0.7 + Math.random() * 0.3;
        context.strokeStyle = `hsla(${spark.hue}, 100%, 48%, ${remaining * flicker})`;
        context.lineWidth = spark.size * remaining + 0.4;
        context.beginPath();
        context.moveTo(spark.x - spark.vx * 0.07, spark.y - spark.vy * 0.07);
        context.lineTo(spark.x, spark.y);
        context.stroke();
        return true;
      });
      frame = window.requestAnimationFrame(animate);
    }

    function updateMotion() {
      window.cancelAnimationFrame(frame);
      sparks = [];
      lastTime = 0;
      nextBurst = 0;
      context?.clearRect(0, 0, width, height);
      if (!motion.matches) frame = window.requestAnimationFrame(animate);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    updateMotion();
    motion.addEventListener("change", updateMotion);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      motion.removeEventListener("change", updateMotion);
    };
  }, []);

  return <canvas ref={canvasRef} className="sold-fireworks" aria-hidden="true" style={{
    position: "absolute",
    inset: 0,
    zIndex: 10,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  }} />;
}
