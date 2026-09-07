import { Component } from "react";

import type { CustomFieldControlProps } from "@sveltia/cms";

import { type PullRequestInfo, findPullRequest } from "@/cms/github/pullRequests";

type Status = "loading" | "none" | "found";

interface State {
  status: Status;
  pull?: PullRequestInfo;
}

/**
 * Read-only control linking to the entry's open pull request.
 *
 * It asks GitHub rather than guessing, so an entry with no pull request says so instead of
 * offering a search link that lands on an empty result page. A class component: Sveltia
 * mounts custom widgets with its own bundled React, where hooks have no dispatcher.
 */
export default class PullRequestControl extends Component<CustomFieldControlProps, State> {
  state: State = { status: "loading" };
  private mounted = false;

  componentDidMount() {
    this.mounted = true;
    const { collection, slug, isNew } = this.identity();
    if (isNew || !collection || !slug) {
      this.setState({ status: "none" });
      return;
    }
    void findPullRequest(collection, slug).then((pull) => {
      if (!this.mounted) return;
      this.setState(pull ? { status: "found", pull } : { status: "none" });
    });
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  private identity() {
    const { entry } = this.props;
    return {
      slug: entry?.get("slug") as string | undefined,
      collection: entry?.get("collection") as string | undefined,
      isNew: Boolean(entry?.get("newRecord")),
    };
  }

  render() {
    const { status, pull } = this.state;
    // Nothing at all while the lookup is in flight, so the field never flashes a wrong answer.
    if (status === "loading") return null;

    // Rendered inside Sveltia's own UI, where the site's Tailwind styles are not loaded.
    if (status === "none" || !pull) {
      return (
        <p id={this.props.forID} style={{ margin: 0, opacity: 0.7 }}>
          No open pull request.
        </p>
      );
    }

    return (
      <p id={this.props.forID} style={{ margin: 0 }}>
        <a href={pull.url} target="_blank" rel="noopener noreferrer">
          Open pull request #{pull.number} on GitHub ↗
        </a>
      </p>
    );
  }
}
