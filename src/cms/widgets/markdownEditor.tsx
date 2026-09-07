import { Component, createRef } from "react";

import type { CustomFieldControlProps } from "@sveltia/cms";

import { observeColorScheme, readColorScheme } from "@/cms/colorScheme";
import { type MarkdownEditor, createMarkdownEditor } from "@/cms/widgets/markdown/editor";

const asText = (value: unknown) => (typeof value === "string" ? value : "");

/**
 * Markdown body editor: CodeMirror 6 with markdown highlighting, a monospace face and
 * line wrapping. It replaces Sveltia's own markdown widget, which pairs a rich-text
 * mode with the raw one; bodies here are authored as markdown and nothing else.
 *
 * A class component on purpose: Sveltia mounts custom widgets with its own bundled
 * React, so hooks from the site's React copy have no dispatcher and throw.
 */
export default class MarkdownEditorControl extends Component<CustomFieldControlProps> {
  private host = createRef<HTMLDivElement>();
  private editor: MarkdownEditor | null = null;
  private stopObserving: (() => void) | null = null;

  componentDidMount() {
    const parent = this.host.current;
    if (!parent) return;
    this.editor = createMarkdownEditor({
      parent,
      value: asText(this.props.value),
      scheme: readColorScheme(),
      onChange: (next) => this.props.onChange(next),
    });
    this.stopObserving = observeColorScheme(this.editor.setColorScheme);
  }

  // Keeps the document in step with external updates, e.g. Duplicate or a draft restore.
  componentDidUpdate(previous: CustomFieldControlProps) {
    const text = asText(this.props.value);
    if (text !== asText(previous.value)) this.editor?.setValue(text);
  }

  componentWillUnmount() {
    this.stopObserving?.();
    this.editor?.destroy();
    this.editor = null;
  }

  render() {
    return <div id={this.props.forID} ref={this.host} />;
  }
}
