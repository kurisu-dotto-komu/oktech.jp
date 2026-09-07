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
