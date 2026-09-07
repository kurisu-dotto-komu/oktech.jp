import { Component, type ReactNode } from "react";

import { type ColorScheme, observeColorScheme, readColorScheme } from "@/cms/colorScheme";

interface PreviewShellProps {
  /** The preview iframe's document, so the site's theme applies inside it. */
  document: Document;
  children: ReactNode;
}

/**
 * Frame every preview shares: it mirrors the CMS light/dark choice onto the iframe's
 * `<html data-theme>` — which is what the site's DaisyUI themes key off — and lays the
 * content out with the same container rhythm the real pages use.
 *
 * A class component, like every other component in the preview tree: Sveltia renders these
 * with its own bundled React, where hooks from the site's copy have no dispatcher.
 */
export default class PreviewShell extends Component<PreviewShellProps, { scheme: ColorScheme }> {
  state = { scheme: readColorScheme() };
  private stopObserving: (() => void) | null = null;

  componentDidMount() {
    this.applyScheme(this.state.scheme);
    this.stopObserving = observeColorScheme((scheme) => {
      this.setState({ scheme });
      this.applyScheme(scheme);
    });
  }

  componentWillUnmount() {
    this.stopObserving?.();
  }

  private applyScheme(scheme: ColorScheme) {
    const root = this.props.document.documentElement;
    root.dataset.theme = scheme;
    root.style.colorScheme = scheme;
    this.props.document.body.classList.add("bg-base-100", "text-base-900", "font-body");
  }

  render() {
    return (
      <div className="bg-base-100 text-base-900 font-body min-h-screen p-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">{this.props.children}</div>
      </div>
    );
  }
}
