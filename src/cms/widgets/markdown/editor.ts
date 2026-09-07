import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";

import type { ColorScheme } from "@/cms/widgets/markdown/colorScheme";
import { editorTheme } from "@/cms/widgets/markdown/theme";

type EditorOptions = {
  parent: HTMLElement;
  value: string;
  scheme: ColorScheme;
  onChange: (value: string) => void;
};

export type MarkdownEditor = {
  /** Replaces the document, unless it already matches (which would fight the caret). */
  setValue: (value: string) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  destroy: () => void;
};

export function createMarkdownEditor({
  parent,
  value,
  scheme,
  onChange,
}: EditorOptions): MarkdownEditor {
  const theme = new Compartment();

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: value,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown(),
        EditorView.lineWrapping,
        theme.of(editorTheme(scheme)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChange(update.state.doc.toString());
        }),
      ],
    }),
  });

  return {
    setValue: (next) => {
      const current = view.state.doc.toString();
      if (next === current) return;
      view.dispatch({ changes: { from: 0, to: current.length, insert: next } });
    },
    setColorScheme: (next) => {
      view.dispatch({ effects: theme.reconfigure(editorTheme(next)) });
    },
    destroy: () => view.destroy(),
  };
}
