# Sunfish — Anchor (local-first desktop runtime)

Sunfish is the local-first MAUI desktop runtime for the Harborline Software fleet. It hosts the Anchor application shell and integrates the full Sunfish platform stack for offline-capable property management.

## First-time clone setup

After cloning, wire the local git hooks:

```bash
dotnet tool restore && dotnet husky install
```

This restores the `husky` (0.9.1) and `docfx` dotnet tools from `.config/dotnet-tools.json` and sets `core.hookspath=.husky` so the pre-commit (SUNFISH_I18N_001 resx validation) and commit-msg (commitlint) hooks activate for your local clone.

## Structure

```text
sunfish/
  src/                 Sunfish.Anchor MAUI project + tests
  apps/                Desktop + web app surfaces
  .config/             dotnet tool manifest (husky + docfx)
  .husky/              Git hooks (pre-commit, commit-msg)
```

## Cross-repo dependencies

This repo depends on packages from `shipyard/`. Clone both repos at sibling level:

```text
Projects/
  Harborline-Software/
    shipyard/
    sunfish/
```

Builds use relative ProjectReferences — the sibling layout is required for `dotnet build` to resolve shipyard packages.

## Fleet context

Part of the Harborline Software fleet. See the parent `CLAUDE.md` for cross-fleet protocols and the fleet org chart.
