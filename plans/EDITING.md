# Event Editing Feature - Research & Solutions

## Goal

Create a feature that allows users to edit event markdown content directly from the website and submit changes as pull requests, while maintaining our static site (SSG-only) architecture.

## Proposed Feature Requirements

- **New route**: `/event/[slug]/edit` - renders an editable version of the event page
- **Client-side state**: Editor state managed in browser with localStorage persistence
- **Version history**: Ability to view and restore previous versions from localStorage
- **Preview mode**: Live preview of rendered markdown
- **PR creation**: Submit changes as a pull request to the repository

## Overview of Solutions

After researching GitHub's API capabilities and authentication constraints, we've identified three viable approaches:

1. **[Copy-to-Clipboard](#option-1-copy-to-clipboard)** - Simplest approach with zero infrastructure requirements. User manually pastes content into GitHub's web editor.

2. **[User-Provided Personal Access Token](#option-2-user-provided-personal-access-token)** - Fully automated workflow where users provide their own GitHub token for direct API access.

3. **[GitHub Actions Proxy](#option-3-github-actions-proxy)** - Uses GitHub Actions as a serverless backend, with two variants:
   - [Issue Comment Trigger](#3a-issue-comment-trigger) - Zero authentication via public issue creation
   - [Workflow Dispatch](#3b-workflow-dispatch) - Direct workflow trigger with user token

Each approach has different trade-offs between simplicity, user experience, and infrastructure requirements.

## What Doesn't Work

### GitHub URL Pre-filling for Edits

**Initial idea:** Use URL format like `https://github.com/OWNER/REPO/edit/BRANCH/path/to/file.txt?value=CONTENT` to pre-fill edited content.

**Result:** GitHub does **not** support pre-filling content via URL parameters when editing existing files. The `value` parameter only works for creating **new** files via the `/new/` endpoint.

**Reference:** The [oktechjp/card](https://github.com/oktechjp/card) repository encountered this same limitation and uses a copy-to-clipboard workaround with multiple confirmation dialogs to guide users through the manual paste process.

### Pure OAuth/API Without Backend

**Initial idea:** Use GitHub OAuth or Device Flow to authenticate directly from the client-side static site.

**Challenges discovered:**
- GitHub OAuth requires `client_secret` for token exchange, which cannot be safely exposed in client-side code
- Even with new PKCE support (added July 2025), the client secret is still required for the token exchange step
- Device Flow doesn't require a secret, but GitHub blocks direct browser calls due to CORS restrictions
- Both approaches require some form of server/proxy to handle the authentication flow securely

**Conclusion:** Cannot achieve GitHub API authentication with a purely static GitHub Pages deployment. Any OAuth-based solution requires at least minimal server infrastructure (e.g., Cloudflare Workers, Netlify Functions) which violates our SSG-only constraint.

## Viable Solutions

### Option 1: Copy-to-Clipboard

The simplest approach with zero infrastructure requirements.

**How it works:**
1. User edits content in the web app
2. Clicks "Create PR" → content is copied to clipboard
3. Browser opens GitHub edit URL in new tab
4. User manually pastes content and submits PR through GitHub's interface

**Implementation:**
```typescript
const onClick = async () => {
  await navigator.clipboard.writeText(editedContent);
  alert('Content copied! Paste it into GitHub on the next page.');
  window.open(
    `https://github.com/oktechjp/oktech.jp/edit/main/events/${slug}/event.md`,
    '_blank'
  );
};
```

**Pros:**
- ✅ Zero infrastructure required
- ✅ No authentication needed
- ✅ Simple implementation (~10 lines of code)
- ✅ Works immediately without setup

**Cons:**
- ❌ Manual paste step required
- ❌ Not seamless UX
- ❌ User must have GitHub account and be logged in

### Option 2: User-Provided Personal Access Token

Fully automated workflow where users provide their own GitHub token.

**How it works:**
1. User creates a fine-grained Personal Access Token with `contents:write` scope for the repository
2. User pastes token into the app (stored in localStorage)
3. App uses GitHub API directly to create branch, commit changes, and open PR
4. User receives PR URL immediately

**Implementation:**
```typescript
const createPR = async (token: string, slug: string, content: string) => {
  const octokit = new Octokit({ auth: token });

  // Create branch
  const branch = `edit-event-${slug}-${Date.now()}`;
  await octokit.rest.git.createRef({
    owner: 'oktechjp',
    repo: 'oktech.jp',
    ref: `refs/heads/${branch}`,
    sha: mainBranchSha
  });

  // Create/update file
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: 'oktechjp',
    repo: 'oktech.jp',
    path: `events/${slug}/event.md`,
    message: `Edit event: ${slug}`,
    content: btoa(content),
    branch
  });

  // Create PR
  const pr = await octokit.rest.pulls.create({
    owner: 'oktechjp',
    repo: 'oktech.jp',
    title: `Edit event: ${slug}`,
    head: branch,
    base: 'main'
  });

  return pr.data.html_url;
};
```

**Pros:**
- ✅ Fully automated workflow (one click)
- ✅ No external infrastructure needed
- ✅ User maintains full control over permissions via token scopes
- ✅ Can revoke token anytime

**Cons:**
- ❌ Requires user to create and manage PAT
- ❌ Token management UX adds friction
- ❌ Security concerns if token is compromised (though scoped to single repo)
- ❌ Token stored in localStorage (cleared if user clears browser data)

### Option 3: GitHub Actions Proxy

Uses GitHub Actions as a serverless backend - two implementation variants.

#### 3a. Issue Comment Trigger

Uses GitHub's public issue system as an API endpoint - requires zero authentication.

**How it works:**
1. User edits content in the app
2. Clicks "Create PR" → opens GitHub issue creation page with pre-filled body
3. Issue body contains special command format: `/edit-event slug:event-123` followed by markdown content
4. User submits the issue (no auth needed for public repos!)
5. GitHub Action triggers on `issues.opened` event
6. Workflow parses issue body, creates branch, commits changes, opens PR
7. Bot comments PR link on the issue and automatically closes it

**Workflow example:**
```yaml
name: Edit Event via Issue
on:
  issues:
    types: [opened]

jobs:
  create-pr:
    if: contains(github.event.issue.body, '/edit-event')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Parse issue body
        id: parse
        run: |
          # Extract slug and content from issue body
          SLUG=$(echo "${{ github.event.issue.body }}" | grep -oP 'slug:\s*\K\S+')
          echo "slug=$SLUG" >> $GITHUB_OUTPUT

      - name: Create branch and commit
        run: |
          BRANCH="edit-event-${{ steps.parse.outputs.slug }}-${{ github.event.issue.number }}"
          git checkout -b "$BRANCH"

          # Extract and write content
          echo "${{ github.event.issue.body }}" | sed -n '/^---$/,/^---$/p' | sed '1d;$d' > "events/${{ steps.parse.outputs.slug }}/event.md"

          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add .
          git commit -m "Edit event: ${{ steps.parse.outputs.slug }}"
          git push origin "$BRANCH"

      - name: Create PR
        id: create-pr
        run: |
          PR_URL=$(gh pr create \
            --title "Edit event: ${{ steps.parse.outputs.slug }}" \
            --body "Automated edit from issue #${{ github.event.issue.number }}" \
            --head "$BRANCH" \
            --base main)
          echo "pr_url=$PR_URL" >> $GITHUB_OUTPUT
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Comment and close issue
        uses: peter-evans/create-or-update-comment@v4
        with:
          issue-number: ${{ github.event.issue.number }}
          body: |
            ✅ Pull request created: ${{ steps.create-pr.outputs.pr_url }}

            This issue will be automatically closed.

      - name: Close issue
        run: gh issue close ${{ github.event.issue.number }}
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Pros:**
- ✅ Zero authentication required
- ✅ 100% GitHub infrastructure (aligns with SSG-only goal)
- ✅ Complete audit trail in issues
- ✅ Works for anonymous users on public repos
- ✅ GitHub handles all security and rate limiting

**Cons:**
- ❌ Extra step (user must submit issue)
- ❌ Unconventional UX (using issues as API)
- ❌ Creates issues (though immediately auto-closed)
- ❌ Issue history may become cluttered over time

#### 3b. Workflow Dispatch

Direct workflow trigger using user-provided token with narrower scope.

**How it works:**
1. User creates PAT with only `actions:write` scope (narrower than Option 2)
2. User pastes token into app (stored in localStorage)
3. App triggers workflow via API, passing content as base64-encoded input
4. Workflow creates branch, commits, and opens PR automatically
5. User receives PR URL

**Client-side trigger:**
```typescript
const triggerWorkflow = async (token: string, slug: string, content: string) => {
  const response = await fetch(
    `https://api.github.com/repos/oktechjp/oktech.jp/actions/workflows/edit-event.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          slug,
          content: btoa(content) // Base64 encode
        }
      })
    }
  );

  if (response.status === 204) {
    console.log('PR creation initiated!');
  }
};
```

**Workflow:**
```yaml
name: Edit Event
on:
  workflow_dispatch:
    inputs:
      slug:
        description: 'Event slug'
        required: true
      content:
        description: 'Base64 encoded markdown content'
        required: true

jobs:
  create-pr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Create branch and commit
        run: |
          BRANCH="edit-event-${{ inputs.slug }}-$(date +%s)"
          git checkout -b "$BRANCH"

          echo "${{ inputs.content }}" | base64 -d > "events/${{ inputs.slug }}/event.md"

          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add .
          git commit -m "Edit event: ${{ inputs.slug }}"
          git push origin "$BRANCH"

      - name: Create PR
        run: |
          gh pr create \
            --title "Edit event: ${{ inputs.slug }}" \
            --body "Automated edit via workflow dispatch" \
            --head "$BRANCH" \
            --base main
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Pros:**
- ✅ Clean, direct workflow (one API call)
- ✅ No issues created or cluttered
- ✅ Narrower token scope than Option 2 (`actions:write` vs `contents:write`)
- ✅ User maintains control over token

**Cons:**
- ❌ Still requires PAT creation and management
- ❌ Token management UX friction
- ❌ Token stored in localStorage

## Conclusion

Three distinct approaches are available, each with different trade-offs:

**Copy-to-Clipboard** offers the lowest barrier to entry - no setup, no authentication, no infrastructure. However, it requires manual user action and provides the least seamless experience.

**User-Provided PAT** enables full automation with a single click, but adds friction through token creation and management. Users must understand GitHub's token system and handle secure storage.

**GitHub Actions Proxy** represents a middle ground using GitHub's own infrastructure:
- The **Issue variant** requires zero authentication and works for anonymous users, at the cost of using issues unconventionally
- The **Workflow Dispatch variant** provides cleaner UX with narrower token permissions than direct API access

All approaches successfully maintain the SSG-only architecture without requiring external infrastructure like Cloudflare Workers or serverless functions. The choice depends on whether the priority is simplicity, automation, or user experience.

## Implementation Checklist

- [ ] Create `/event/[slug]/edit` route
- [ ] Build markdown editor component with preview
- [ ] Implement localStorage persistence
- [ ] Add version history UI
- [ ] Choose and implement PR creation approach
- [ ] Create GitHub Actions workflow (if using Option 3)
- [ ] Build "Create PR" flow UI
- [ ] Add user documentation
- [ ] Test end-to-end flow

## Related Issues

This event editing feature relates to broader discussions about content management workflows:

- [#84 - Suggestion: Publish unconfirmed upcoming events](https://github.com/oktechjp/oktech.jp/issues/84) - Discussion about workflow changes for managing event states. [Comment #3809533226](https://github.com/oktechjp/oktech.jp/issues/84#issuecomment-3809533226) mentions "changing my workflow to support this" which relates to how events are created and managed.
- [#59 - Generative OG Images / Meetup.com Sync Workflow](https://github.com/oktechjp/oktech.jp/issues/59) - Existing workflow automation for event content
- [#63 - Preview builds for PRs](https://github.com/oktechjp/oktech.jp/issues/63) - Would allow previewing event edits before merge
- [#79 - Fix workflow over committing](https://github.com/oktechjp/oktech.jp/issues/79) - Related workflow issue
- [#61 - Automatically create redirects for renamed events](https://github.com/oktechjp/oktech.jp/issues/61) - Content management automation

The event editing feature would complement these existing workflows by making it easier for community members to propose changes directly through the website interface.

## References

- [GitHub PKCE Support (July 2025)](https://github.blog/changelog/2025-07-14-pkce-support-for-oauth-and-github-app-authentication/)
- [GitHub OAuth Apps Documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [GitHub Actions workflow_dispatch](https://docs.github.com/en/rest/actions/workflows)
- [oktechjp/card repository](https://github.com/oktechjp/card) - Example using copy-to-clipboard approach
- [Create Pull Request Action](https://github.com/marketplace/actions/create-pull-request)
- [Slash Command Dispatch](https://github.com/marketplace/actions/slash-command-dispatch)
