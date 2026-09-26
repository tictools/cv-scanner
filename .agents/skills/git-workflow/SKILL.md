---
name: git-workflow
description: >-
  Creates git branches and pull requests for this repo following its exact conventions:
  Conventional-Commits-style branch names, the OpenSpec propose/apply/archive stage prefix when a
  branch implements an OpenSpec change, and the .github/PULL_REQUEST_TEMPLATE.md body for every
  PR. Use this skill whenever the user asks to create or checkout a new branch, start work on a
  feature/fix/change, open or create a pull request, or push work that will need a PR — even if
  they just say "create a branch", "open a PR", "push this change", "I want to make a pull
  request", or name an OpenSpec change they're about to propose/apply/archive. Also consult it
  whenever a `git push` is about to run (it governs how out-of-sync branches and conflicts must
  be handled) and whenever a commit is about to be made (it governs the mandatory human review
  gate before committing). Do not use it for routine `git status`/`git log`/`git diff`
  inspection that isn't part of a branch/commit/PR workflow.
metadata:
  author: jaumevillarreal
  version: "1.0.0"
---

# Git Workflow

This repo has specific, non-negotiable conventions for branches, commits, and PRs. The point of
this skill isn't ceremony — it's that branch names double as a changelog (anyone scanning
`git branch -a` should immediately know what a branch does and what stage it's at), and a commit
is the one git operation that's genuinely hard to walk back cleanly once pushed and built on. So
the naming is mechanical, but the commit gate is a hard stop.

## Step 1 — Name the branch

**Regular branch** (not tied to an OpenSpec change):

```
<type>/<short-kebab-description>
```

`<type>` is a [Conventional Commits](https://www.conventionalcommits.org/) type: `feat`, `fix`,
`docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, or `revert`. Pick the one
that matches what the branch actually does, not what module it touches. The description is a
handful of kebab-case words, e.g. `feat/add-cv-upload`, `fix/pdf-parsing-bug`,
`chore/update-deps`.

If the type isn't obvious from what the user asked for (e.g. it could reasonably be `feat` or
`refactor`), ask — the type is metadata every future reader relies on, and guessing wrong is
worse than a one-line question.

**OpenSpec-linked branch**: if the work is proposing, implementing, or archiving an OpenSpec
change (see the `openspec-*` skills), the branch name combines the Conventional Commits type
with the OpenSpec stage as a prefix on the description:

```
<type>/<stage>-<change-name>
```

where `<stage>` is exactly one of `propose`, `apply`, or `archive`, and `<change-name>` is the
OpenSpec change's own kebab-case id (the same name used in `openspec new change "<name>"` and
under its change directory — don't invent a different slug for the branch than the one OpenSpec
already uses). Examples: `feat/propose-add-rag-pipeline`, `feat/apply-add-rag-pipeline`,
`chore/archive-add-rag-pipeline`. The stage always sits immediately after the type, never
replacing it — the type still tells you _what kind_ of change this is; the stage tells you
_which OpenSpec step_ this branch covers.

## Step 2 — Sync before branching

Before creating any new branch, always bring the remote's default branch up to date first and
branch from it — never from a possibly-stale local copy:

```bash
git fetch origin
git checkout <default-branch>   # e.g. main — resolve it, don't hardcode if the repo uses something else
git pull origin <default-branch>
git checkout -b <type>/<...>
```

Use `git symbolic-ref refs/remotes/origin/HEAD` (or `git remote show origin`) to find the actual
default branch name rather than assuming `main`.

## Step 3 — Commits require human review, always

**No commit happens without the user reviewing it first — this is mandatory and has no
exceptions**, regardless of how permissive the current session's settings are. This holds even
for small or "obviously fine" changes, because a commit is the boundary past which fixing a
mistake means rewriting history instead of just editing a file.

Concretely, before running `git commit`:

1. Stage the intended changes.
2. Show the user the actual diff being committed (`git diff --staged`) and the proposed commit
   message.
3. Wait for their explicit go-ahead. "Looks good" / "yes" / an explicit confirmation counts;
   silence or moving on to another topic does not.
4. Only then commit.

Never batch this away by committing first and asking forgiveness after, and never assume a prior
approval covers a new, different set of changes.

## Step 4 — Push, and handle sync issues before forcing anything

Push normally (`git push -u origin <branch>` on first push). If the push is rejected, or `git
status` reports the branch has diverged from its upstream, or a subsequent pull surfaces
conflicts, resolve it like this:

```bash
git fetch origin
git pull --rebase origin <branch>
```

- If the rebase completes cleanly, push again.
- If the rebase surfaces conflicts, **stop and hand it to the user** — list the conflicting
  files, don't auto-resolve them, and don't guess which side is "right." Once they've resolved
  or told you how to resolve each conflict, `git add` the resolved files, `git rebase
--continue`, and only then push.
- Never force-push (`git push --force` / `--force-with-lease`) to make a divergence go away
  without the user explicitly asking for it — rebasing is about catching up with the remote, not
  about overwriting it.

## Step 5 — Open the PR from the repo's template

This repo's PR body template lives at `.github/PULL_REQUEST_TEMPLATE.md`. When opening a PR:

1. Read that file fresh (don't assume its contents from memory — it can change).
2. Fill each section from the actual commits/diff on the branch — don't invent testing steps or
   summary bullets that aren't grounded in what the branch really does. Leave a section's
   placeholder/comment in place if there's genuinely nothing truthful to put there yet.
3. Show the filled-in body to the user before running `gh pr create` — opening a PR is visible to
   others, so it gets the same "confirm before acting" treatment as any other shared-visibility
   action, on top of the commit-review gate already covered in Step 3.
4. If `.github/PULL_REQUEST_TEMPLATE.md` doesn't exist in the repo, say so and ask whether to
   proceed with a plain PR body or create the template first — don't silently skip it.

## Non-goals

- **Choosing what to build.** This skill only governs branch/commit/PR mechanics, not scoping or
  implementing the change itself — that's the relevant `openspec-*` skill or ordinary
  implementation work.
- **Resolving conflicts on the user's behalf.** Surfacing and staging conflicts is in scope;
  silently picking a resolution is not (Step 4).
- **Routine read-only git commands** (`status`, `log`, `diff`, `branch -a`) outside of an actual
  branch/commit/PR workflow — no need to route those through this skill.
