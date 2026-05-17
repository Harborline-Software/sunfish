## Summary

<!-- What does this PR do? One or two sentences. -->

## Affected surfaces

- [ ] `src/` (Anchor MAUI app)
- [ ] `src/tests/`
- [ ] `apps/web/` (React app, was anchor-react)
- [ ] `apps/desktop/` (Tauri shell, was anchor-tauri)
- [ ] Repo infrastructure / CI / docs only

## Cross-repo notes

- [ ] No shipyard package changes required
- [ ] Requires matching change in `shipyard/packages/...` or `shipyard/apps/local-node-host/` (link the PR)

## Checklist

- [ ] `dotnet restore Sunfish.slnx` succeeds with sibling shipyard
- [ ] `dotnet build Sunfish.slnx` passes on Windows
- [ ] `apps/web/` lint / typecheck / test / build green (if touched)
- [ ] Tauri build green for at least one platform (if touched)
- [ ] Tests added / updated where applicable
- [ ] Public API changes XML-documented
