import React from "react";

import { Resvg } from "@resvg/resvg-js";
import type { APIContext } from "astro";
import satori from "satori";

import { loadFonts } from "./fonts";
import type { CacheKeyData } from "./ogCache";
import { OGImageCache } from "./ogCache";

// ============================================================================
// Types
// ============================================================================

export interface OGHandlerOptions {
  component: React.ComponentType<any>;
  props: Record<string, unknown>;
  cacheKeyData: CacheKeyData; // Required - be explicit about cache invalidation
  width?: number;
  height?: number;
}

// ============================================================================
// Image Utilities
// ============================================================================

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  const { buffer: underlying, byteOffset, byteLength } = buffer;

  if (underlying instanceof ArrayBuffer) {
    return underlying.slice(byteOffset, byteOffset + byteLength);
  }

  const arrayBuffer = new ArrayBuffer(byteLength);
  new Uint8Array(arrayBuffer).set(buffer);
  return arrayBuffer;
}

// ============================================================================
// OG Image Generation
// ============================================================================

/**
 * Main OG image route handler
 * Combines route wrapper and image generation into a single function
 */
export function createOGImageRoute(
  handler: (context: APIContext) => Promise<OGHandlerOptions | null>,
) {
  return async (context: APIContext): Promise<Response> => {
    try {
      // Get handler options
      const options = await handler(context);
      if (!options) {
        return new Response("Not found", { status: 404 });
      }

      const { component, props, cacheKeyData, width = 1200, height = 630 } = options;

      // Initialize cache
      const cache = new OGImageCache();

      // Determine cache control based on version parameter
      const hasVersion = context.url.searchParams.has("v");
      const cacheControl = hasVersion
        ? "public, max-age=31536000, immutable" // 1 year with version
        : "public, max-age=3600"; // 1 hour without version

      // Check cache (always check, even in development for testing)
      const cachedBuffer = await cache.getCachedImage(cacheKeyData);
      if (cachedBuffer) {
        return new Response(bufferToArrayBuffer(cachedBuffer), {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": cacheControl,
          },
        });
      }

      // Load fonts (memoized)
      const fonts = await loadFonts();

      // Generate SVG with Satori
      const markup = React.createElement(component, props);
      const svg = await satori(markup, { width, height, fonts });

      // Convert SVG to PNG with Resvg
      const resvg = new Resvg(svg, {
        fitTo: { mode: "width", value: width },
      });
      const pngBuffer = resvg.render().asPng();

      // Cache the generated image
      await cache.cacheImage(cacheKeyData, pngBuffer);

      // Return the image
      return new Response(bufferToArrayBuffer(pngBuffer), {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": cacheControl,
        },
      });
    } catch (error) {
      console.error("Error generating OG image:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return new Response(`Error generating image: ${message}`, { status: 500 });
    }
  };
}
