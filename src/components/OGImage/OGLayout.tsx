import React from "react";

import { twj } from "tw-to-css";

import { OG_FONT_FAMILY } from "@/utils/og/fonts";
import { themeColorsHex } from "@/utils/og/theme-colors";

import OGLogo from "./OGLogos";

interface OGLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function OGLayout({ children, title, subtitle }: OGLayoutProps) {
  const colors = themeColorsHex.light;

  return (
    <div
      style={{
        ...twj("h-full w-full flex flex-col justify-start gap-8 p-16"),
        background: "linear-gradient(to bottom, #ffe, #dde)",
        color: colors.baseContent,
        fontFamily: OG_FONT_FAMILY,
      }}
    >
      <OGLogo size={1.5} />
      <div style={twj("flex flex-col w-full gap-4")}>
        {title && <div style={twj("flex text-[48px] font-extrabold leading-tight")}>{title}</div>}
        {subtitle && <div style={{ ...twj("flex text-[26px]"), opacity: 0.65 }}>{subtitle}</div>}
      </div>
      <div style={twj("flex w-full")}>{children}</div>
    </div>
  );
}

/** City names are stored lowercase in content ("osaka"); cards show them capitalised. */
export const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

// Common icon components for reuse
export const CalendarIcon = ({ color = themeColorsHex.light.baseContent }: { color?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <g>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </g>
  </svg>
);

export const LocationIcon = ({
  size = 24,
  color = themeColorsHex.light.baseContent,
}: {
  size?: number;
  color?: string;
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <g>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </g>
  </svg>
);

export const IconWrapper = ({ children }: { children: React.ReactNode }) => (
  <div style={twj("flex items-center gap-3")}>{children}</div>
);
