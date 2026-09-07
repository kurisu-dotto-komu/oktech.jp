import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

import type { ColorScheme } from "@/cms/widgets/markdown/colorScheme";

const MONOSPACE = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

/**
 * Sveltia renders custom controls inside its own shadow-free DOM, so the editor
 * borrows Sveltia's CSS variables to sit flush with the built-in field controls.
 */
const layout = EditorView.theme({
  "&": {
    fontSize: "14px",
    borderRadius: "4px",
    border: "1px solid var(--sui-textbox-border-color, rgba(127, 127, 127, 0.4))",
  },
  "&.cm-focused": {
    outline: "2px solid var(--sui-primary-accent-color-light, #4a90d9)",
    outlineOffset: "-1px",
  },
  ".cm-scroller": { fontFamily: MONOSPACE, lineHeight: "1.6" },
  ".cm-content": { padding: "8px 4px", minHeight: "16em" },
});

/** Markdown-only highlight palette; readable on Sveltia's light surfaces. */
const lightHighlight = HighlightStyle.define([
  { tag: tags.heading, color: "#0b5cad", fontWeight: "bold" },
  { tag: tags.strong, color: "#1a1a1a", fontWeight: "bold" },
  { tag: tags.emphasis, color: "#1a1a1a", fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.link, color: "#0b5cad", textDecoration: "underline" },
  { tag: tags.url, color: "#7a3e9d" },
  { tag: tags.monospace, color: "#0f7b6c" },
  { tag: tags.quote, color: "#5c6370", fontStyle: "italic" },
  { tag: tags.list, color: "#a04000" },
  { tag: tags.contentSeparator, color: "#8a8a8a" },
  { tag: tags.processingInstruction, color: "#8a8a8a" },
  { tag: tags.comment, color: "#8a8a8a", fontStyle: "italic" },
]);

/** The dark half is `oneDark`, which brings its own surface colours and highlight style. */
const light: Extension = [
  EditorView.theme({
    "&": {
      color: "var(--sui-primary-foreground-color, #1a1a1a)",
      backgroundColor: "var(--sui-textbox-background-color, #ffffff)",
    },
  }),
  syntaxHighlighting(lightHighlight),
];

export function editorTheme(scheme: ColorScheme): Extension {
  return [layout, scheme === "dark" ? oneDark : light];
}
