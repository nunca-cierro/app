"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import {
  MdDesktopWindows,
  MdLaptopMac,
  MdPhoneIphone,
  MdTabletMac,
} from "react-icons/md";

import { cn } from "@/lib/utils";
import { siteDevicePreview } from "@/data/site";

type DeviceKey = "desktop" | "laptop" | "tablet" | "phone";
type FrameConfig = { w: number; h: number; r: number };

type BlockLayoutKey = "topbar" | "hero" | "cardA" | "cardB" | "cardC" | "cta";

type BlockLayout = {
  left: string;
  top: string;
  width: string;
  height: string;
  radius?: number;
};

type ResponsiveDeviceMorphProps = {
  className?: string;
  containerClassName?: string;
  containerStyle?: CSSProperties;
  height?: number;
  phoneWidth?: number | string;
  frameByDevice?: Record<DeviceKey, FrameConfig>;
};

const DEFAULT_FRAME_BY_DEVICE: Record<DeviceKey, FrameConfig> = {
  desktop: { w: 440, h: 270, r: 20 },
  laptop: { w: 420, h: 260, r: 20 },
  tablet: { w: 310, h: 390, r: 26 },
  phone: { w: 220, h: 420, r: 34 },
};

const BLOCK_LAYOUTS: Record<DeviceKey, Record<BlockLayoutKey, BlockLayout>> = {
  desktop: {
    topbar: { left: "6%", top: "8%", width: "88%", height: "10%", radius: 10 },
    hero: { left: "6%", top: "22%", width: "58%", height: "18%", radius: 12 },
    cta: { left: "6%", top: "44%", width: "40%", height: "10%", radius: 999 },
    cardA: { left: "6%", top: "62%", width: "27%", height: "22%", radius: 14 },
    cardB: { left: "36%", top: "62%", width: "27%", height: "22%", radius: 14 },
    cardC: { left: "66%", top: "22%", width: "28%", height: "62%", radius: 14 },
  },
  laptop: {
    topbar: { left: "6%", top: "8%", width: "88%", height: "10%", radius: 10 },
    hero: { left: "6%", top: "22%", width: "64%", height: "18%", radius: 12 },
    cta: { left: "6%", top: "44%", width: "46%", height: "10%", radius: 999 },
    cardA: { left: "6%", top: "62%", width: "30%", height: "22%", radius: 14 },
    cardB: { left: "39%", top: "62%", width: "31%", height: "22%", radius: 14 },
    cardC: { left: "73%", top: "22%", width: "21%", height: "62%", radius: 14 },
  },
  tablet: {
    topbar: { left: "8%", top: "7%", width: "84%", height: "9%", radius: 12 },
    hero: { left: "8%", top: "20%", width: "84%", height: "16%", radius: 14 },
    cta: { left: "8%", top: "40%", width: "58%", height: "9%", radius: 999 },
    cardA: { left: "8%", top: "54%", width: "84%", height: "13%", radius: 16 },
    cardB: { left: "8%", top: "70%", width: "40%", height: "19%", radius: 16 },
    cardC: { left: "52%", top: "70%", width: "40%", height: "19%", radius: 16 },
  },
  phone: {
    topbar: { left: "10%", top: "7%", width: "80%", height: "8%", radius: 14 },
    hero: { left: "10%", top: "19%", width: "80%", height: "16%", radius: 16 },
    cta: { left: "10%", top: "38%", width: "72%", height: "8%", radius: 999 },
    cardA: { left: "10%", top: "52%", width: "80%", height: "12%", radius: 18 },
    cardB: { left: "10%", top: "67%", width: "80%", height: "12%", radius: 18 },
    cardC: { left: "10%", top: "82%", width: "80%", height: "12%", radius: 18 },
  },
};

export function ResponsiveDeviceMorph({
  className,
  containerClassName,
  containerStyle,
  height = 480,
  phoneWidth,
  frameByDevice = DEFAULT_FRAME_BY_DEVICE,
}: ResponsiveDeviceMorphProps) {
  const shouldReduceMotion = useReducedMotion();
  const sequence = useMemo(
    () => [
      {
        key: "desktop" as const,
        label: siteDevicePreview.labels.desktop,
        Icon: MdDesktopWindows,
      },
      {
        key: "laptop" as const,
        label: siteDevicePreview.labels.laptop,
        Icon: MdLaptopMac,
      },
      {
        key: "tablet" as const,
        label: siteDevicePreview.labels.tablet,
        Icon: MdTabletMac,
      },
      {
        key: "phone" as const,
        label: siteDevicePreview.labels.phone,
        Icon: MdPhoneIphone,
      },
    ],
    [],
  );

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (shouldReduceMotion) return;

    const intervalId = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % sequence.length);
    }, 1600);

    return () => window.clearInterval(intervalId);
  }, [sequence.length, shouldReduceMotion]);

  const active = sequence[activeIndex];
  const frame = frameByDevice[active.key];
  const layout = BLOCK_LAYOUTS[active.key];
  const morphWidth =
    active.key === "phone"
      ? (phoneWidth ?? `min(90vw, ${frame.w}px)`)
      : `min(92vw, ${frame.w}px)`;

  return (
    <div className={cn("w-full flex justify-center lg:justify-end", className)}>
      <div
        className={cn("relative w-full overflow-hidden", containerClassName)}
        style={{ height, ...containerStyle }}
      >
        <div className="absolute inset-0 rounded-3xl" />
        <div className="absolute left-0 right-0 z-10 flex items-center justify-center gap-3 px-4">
          <div className="h-px w-16 bg-slate-700/80" />
          <motion.div
            key={active.key}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-950/70 px-3 py-1 text-slate-100 shadow-sm"
          >
            <active.Icon className="text-cyan-400" />
            <span className="text-xs font-semibold tracking-wide text-slate-200">
              {active.label}
            </span>
          </motion.div>
          <div className="h-px w-16 bg-slate-700/80" />
        </div>

        <LayoutGroup>
          <motion.div
            className="absolute left-1/2 top-1/2 overflow-hidden border border-slate-700/70 bg-slate-950/40 shadow-sm"
            style={{ translateX: "-50%", translateY: "-50%" }}
            animate={
              shouldReduceMotion
                ? undefined
                : {
                    width: morphWidth,
                    height: frame.h,
                    borderRadius: frame.r,
                  }
            }
            transition={{ type: "spring", stiffness: 140, damping: 18 }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_top,rgba(56,189,248,0.06),transparent_55%)]" />

            <div className="relative h-full w-full">
              {[
                { id: "topbar" as const, tone: "bg-slate-100/5" },
                { id: "hero" as const, tone: "bg-slate-100/7" },
                { id: "cta" as const, tone: "bg-cyan-500/20" },
                { id: "cardA" as const, tone: "bg-slate-100/5" },
                { id: "cardB" as const, tone: "bg-slate-100/5" },
                { id: "cardC" as const, tone: "bg-slate-100/5" },
              ].map((block) => (
                <motion.div
                  key={block.id}
                  className={
                    "absolute border border-slate-700/70 " +
                    block.tone +
                    " backdrop-blur-xs"
                  }
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : {
                          left: layout[block.id].left,
                          top: layout[block.id].top,
                          width: layout[block.id].width,
                          height: layout[block.id].height,
                          borderRadius: layout[block.id].radius,
                        }
                  }
                  transition={{ type: "spring", stiffness: 170, damping: 20 }}
                >
                  <div className="flex h-full w-full flex-col justify-center gap-2 p-3">
                    <div className="h-1.5 w-3/4 rounded-full bg-slate-200/10" />
                    <div className="h-1.5 w-2/3 rounded-full bg-slate-200/10" />
                    <div className="h-1.5 w-1/2 rounded-full bg-slate-200/10" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </LayoutGroup>
      </div>
    </div>
  );
}
