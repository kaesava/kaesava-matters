"use client";

import React, { useRef, useState } from "react";
import { t } from "@kaesava/i18n";

export interface SignaturePadProps {
  onChange?: (dataUrl: string | null) => void;
  width?: number;
  height?: number;
  clearLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function SignaturePad({
  onChange,
  width = 480,
  height = 180,
  clearLabel,
  disabled = false,
  className = "",
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [hasStroke, setHasStroke] = useState(false);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pt = getPoint(e);
    drawingRef.current = true;
    ctx.strokeStyle = "#1B2B4B";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pt = getPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    if (!hasStroke) setHasStroke(true);
  };

  const handlePointerEnd = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onChange?.(canvasRef.current ? canvasRef.current.toDataURL("image/png") : null);
  };

  const handleClear = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, width, height);
    setHasStroke(false);
    onChange?.(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
        className="w-full rounded-xl border border-slate-200 bg-white touch-none cursor-crosshair"
        style={{ height }}
      />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled || !hasStroke}
          className="min-h-[44px] sm:min-h-0 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
        >
          {clearLabel ?? t("common.clear")}
        </button>
      </div>
    </div>
  );
}
