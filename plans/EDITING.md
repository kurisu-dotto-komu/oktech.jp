# Event Editing Feature - Research & Solutions

## Goal

Create a feature that allows users to edit event markdown content directly from the website and submit changes as pull requests, while maintaining our static site (SSG-only) architecture.

## Proposed Feature Requirements

- **New route**: `/event/[slug]/edit` - renders an editable version of the event page
- **Client-side state**: Editor state managed in browser with localStorage persistence
- **Version history**: Ability to view and restore previous versions from localStorage
- **Preview mode**: Live preview of rendered markdown
- **PR creation**: Submit changes as a pull request to the repository

## Research Findings

### What Doesn't Work

**GitHub URL Pre-filling for Edits**
- Initial idea: Use URL format like `https://github.com/OWNER/REPO/edit/BRANCH/path/to/file.txt?value=CONTENT`
- **Result**: GitHub does **not** support pre-filling content via URL parameters when editing existing files
- The `value` parameter only works for creating **new** files via `/new/` endpoint
- Reference: [oktechjp/card](https://github.com/oktechjp/card) repo uses copy-to-clipboard workaround

**Pure OAuth/API Without Backend**
- GitHub OAuth requires `client_secret` for token exchange (cannot be exposed client-side)
- Even with new PKCE support (added July 2025), client secret is still required
- Device Flow doesn't require secret, but GitHub blocks direct browser calls (CORS restrictions)
- **Conclusion**: Cannot achieve GitHub API authentication with purely static GitHub Pages deployment

## Viable Solutions

### Option 1: Copy-to-Clipboard (Simplest)

**How it works:**
1. User edits content in the web app
2. Clicks "Create PR" → content copied to clipboard
3. Opens GitHub edit URL
4. User manually pastes content and submits PR

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
- ✅ Zero infrastructure
- ✅ No authentication needed
- ✅ Simple implementation

**Cons:**
- ❌ Manual paste step
- ❌ Not seamless UX

### Option 2: User-Provided Personal Access Token

**How it works:**
1. User creates fine-grained PAT with `contents:write` scope for repository
2. Pastes token into app (stored in localStorage)
3. App uses GitHub API directly to create branch, commit, and PR

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
- ✅ Fully automated workflow
- ✅ No external infrastructure
- ✅ User controls permissions

**Cons:**
- ❌ Requires user to create PAT
- ❌ Token management UX complexity

### Option 3: GitHub Actions Proxy (Recommended ⭐)

Using GitHub Actions as a serverless backend - three approaches:

#### 3a. Issue Comment Trigger (Zero Auth!)

**How it works:**
1. User edits content in app
2. Clicks "Create PR" → opens GitHub issue creation with pre-filled body
3. Issue body contains special command: `/edit-event slug:event-123` + content
4. User submits issue (no auth needed for public repos!)
5. GitHub Action triggers on `issues.opened` event
6. Workflow parses issue, creates branch, commits, opens PR
7. Bot comments PR link on issue and closes it

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
- ✅ No authentication needed
- ✅ 100% GitHub infrastructure
- ✅ Audit trail in issues
- ✅ Works with public repos

**Cons:**
- ❌ Extra step (create issue)
- ❌ Slightly unconventional UX
- ❌ Creates issues (though auto-closed)

#### 3b. Workflow Dispatch (User Token Required)

**How it works:**
1. User provides PAT with `actions:write` scope
2. App triggers workflow via API with content as input
3. Workflow creates PR automatically

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
- ✅ Clean, direct workflow
- ✅ No issues cluttered
- ✅ User controls token

**Cons:**
- ❌ Requires PAT creation
- ❌ Token management

## Recommendation

**Start with Option 3a (Issue Comment Trigger)** because:
1. Zero authentication friction
2. Uses only GitHub infrastructure (aligns with SSG-only goal)
3. Creative but functional
4. Can always upgrade to other options later

**Fallback to Option 1 (Copy-to-Clipboard)** if Issue approach feels too hacky.

## Implementation Checklist

- [ ] Create `/event/[slug]/edit` route
- [ ] Build markdown editor component with preview
- [ ] Implement localStorage persistence
- [ ] Add version history UI
- [ ] Create GitHub Actions workflow
- [ ] Build "Create PR" flow with issue template
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
