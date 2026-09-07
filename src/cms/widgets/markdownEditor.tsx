import { useEffect, useRef } from "react";

import type { CustomFieldControlProps } from "@sveltia/cms";

import { observeColorScheme, readColorScheme } from "@/cms/widgets/markdown/colorScheme";
import { type MarkdownEditor, createMarkdownEditor } from "@/cms/widgets/markdown/editor";

/**
 * Markdown body editor: CodeMirror 6 with markdown highlighting, a monospace face and
 * line wrapping. It replaces Sveltia's own markdown widget, which pairs a rich-text
 * mode with the raw one; bodies here are authored as markdown and nothing else.
 */
export default function MarkdownEditorControl({ value, forID, onChange }: CustomFieldControlProps) {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<MarkdownEditor | null>(null);
  const text = typeof value === "string" ? value : "";

  // Read through refs so the editor is created once and never torn down mid-edit.
  const emit = useRef(onChange);
  emit.current = onChange;
  const initial = useRef(text);

  useEffect(() => {
    const parent = host.current;
    if (!parent) return;

    const instance = createMarkdownEditor({
      parent,
      value: initial.current,
      scheme: readColorScheme(),
      onChange: (next) => emit.current(next),
    });
    editor.current = instance;
    const stopObserving = observeColorScheme(instance.setColorScheme);

    return () => {
      stopObserving();
      instance.destroy();
      editor.current = null;
    };
  }, []);

  // Keeps the document in step with external updates, e.g. Duplicate or a draft restore.
  useEffect(() => {
    editor.current?.setValue(text);
  }, [text]);

  return <div id={forID} ref={host} />;
}
