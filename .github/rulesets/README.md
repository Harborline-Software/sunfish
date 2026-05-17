# GitHub Rulesets — sunfish

Branch and tag rulesets for the sunfish (local-first property ERP) repo.

## Cross-repo dependency note

sunfish's csproj `ProjectReference`s resolve to `../shipyard/packages/...`.
CI checks out **both** `sunfish` and sibling `shipyard` (under their natural
folder names) so `dotnet restore` resolves cleanly. The web app + Tauri shell
also consume `shipyard/packages/ui-react`. Local builds need the same
sibling-layout — see sunfish `README.md` + `Directory.Build.props` for the
verification target.

## Files

| File | Target | Purpose |
|---|---|---|
| `main-branch.json` | `~DEFAULT_BRANCH` | Gate merges into `main` behind PR review + CI (Build & Test + commitlint + ban-pr-target + CodeQL csharp + CodeQL js/ts) |
| `release-tags.json` | `refs/tags/v*` | Prevent deletion or rewriting of release tags |

## Apply

```bash
gh api -X POST repos/Harborline-Software/sunfish/rulesets \
  --input .github/rulesets/main-branch.json

gh api -X POST repos/Harborline-Software/sunfish/rulesets \
  --input .github/rulesets/release-tags.json
```

## Required checks

- **Build & Test** — `.github/workflows/ci.yml` (Windows MAUI build + tests)
- **Lint PR commits** — `.github/workflows/commitlint.yml`
- **Scan workflows for banned triggers** — `.github/workflows/ban-pull-request-target.yml`
- **Analyze (csharp)** + **Analyze (javascript-typescript)** — `.github/workflows/codeql.yml`

## Optional workflows (not branch-protected)

- **web CI** — runs on `apps/web/**` changes (was anchor-react-ci.yml). Not branch-protected because the broader **Build & Test** doesn't trigger for web-only PRs.
- **Tauri cross-platform build** — runs on `apps/desktop/**` changes. Build artifacts are uploaded but cross-platform builds aren't a merge gate.
- **SBOM** — runs on release publication or manual dispatch.

If you want web-ci.yml and tauri-build.yml to gate merges on PRs that touch their paths, add `web CI: Build & Test` and `Build (x86_64-pc-windows-msvc)` (etc.) to the required-checks list above; bear in mind that with path-filtered triggers, GitHub considers a missing check as PENDING for PRs that don't touch those paths, so add them only if you accept that posture.
