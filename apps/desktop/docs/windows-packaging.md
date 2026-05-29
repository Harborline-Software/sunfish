# Windows Packaging — MSI Signing, Packaging Hardening, and Uninstaller Verification

## Current state (2026-05-20)

| Item | Status |
|---|---|
| MSI build (WiX + NSIS) | ✅ Tauri `targets: "all"` |
| Tauri updater signing (minisign) | ✅ PR #29 — keypair at `~/.tauri/anchor.key` |
| Publisher / copyright metadata | ✅ `bundle.publisher` + `bundle.copyright` in `tauri.conf.json` |
| NSIS per-user install (no UAC) | ✅ `nsis.installMode: "currentUser"` |
| Authenticode code signing | ⏳ Cert not yet procured (see below) |
| Custom WiX installer branding | Deferred — low priority pre-MVP |

---

## MSI vs MSIX

### Recommendation: stay on MSI for now

| | MSI (WiX) | MSIX |
|---|---|---|
| Windows Store required | No | Yes (or Developer Mode) |
| Enterprise GPO deployment | Yes | Limited |
| Authenticode compatibility | Standard signtool | Requires MSIX-specific signing |
| UAC behavior | Configurable per-user/machine | Always per-user (no elevation needed) |
| Clean uninstall | WiX-managed | OS-managed (very clean) |
| Tauri 2.x support | First-class | Via NSIS-to-MSIX wrapper only |
| Sideloading (no Store) | Simple | Requires device policy unlock |

**Verdict:** MSI is the right default for a private B2B ERP app deployed to known machines. MSIX becomes attractive if we ever publish to the Microsoft Store or need OS-managed update rollback. Revisit at the v1.0 milestone.

---

## Authenticode code signing

### Why it matters

Without Authenticode, Windows SmartScreen shows:
- "Windows protected your PC" warning on first install
- "Unknown publisher" in the UAC prompt
- Potential antivirus false positives on unsigned binaries

### Certificate options

| Provider | Type | Cost/yr | Notes |
|---|---|---|---|
| DigiCert | OV (Organization Validated) | ~$500 | Most widely trusted; standard choice |
| Sectigo (Comodo) | OV | ~$180 | Good compatibility, lower cost |
| GlobalSign | OV | ~$400 | Enterprise-friendly |
| Azure Trusted Signing | Cloud HSM | ~$10/mo | Microsoft-hosted HSM; GitHub Actions native |

**Recommendation:** Azure Trusted Signing for MVP — cheapest, HSM-backed (private key never leaves Azure), native GitHub Actions support via `azure/trusted-signing-action`.

### Azure Trusted Signing setup

1. Create an Azure Trusted Signing account (portal.azure.com → Trusted Signing)
2. Create a certificate profile (Organization Validated)
3. Complete Microsoft identity verification (~3-5 business days)
4. In GitHub Actions secrets, add:
   - `AZURE_TENANT_ID`
   - `AZURE_CLIENT_ID`
   - `AZURE_CLIENT_SECRET`
   - `AZURE_TRUSTED_SIGNING_ENDPOINT` (e.g., `https://wus2.codesigning.azure.net`)
   - `AZURE_TRUSTED_SIGNING_ACCOUNT_NAME`
   - `AZURE_TRUSTED_SIGNING_CERT_PROFILE_NAME`

5. Update `tauri.conf.json` `bundle.windows.signCommand`:

```json
"windows": {
  "signCommand": "trusted-signing-cli -e %AZURE_TRUSTED_SIGNING_ENDPOINT% -a %AZURE_TRUSTED_SIGNING_ACCOUNT_NAME% -c %AZURE_TRUSTED_SIGNING_CERT_PROFILE_NAME% -d Anchor %1"
}
```

### PFX-based signing (traditional OV cert)

If using DigiCert/Sectigo/GlobalSign instead:

1. Obtain `.pfx` file from CA
2. Base64-encode it: `certutil -encode anchor-sign.pfx anchor-sign.b64`
3. Add to GitHub Actions secrets:
   - `WINDOWS_CERTIFICATE` — the base64 `.pfx` content
   - `WINDOWS_CERTIFICATE_PASSWORD` — the `.pfx` export password

The CI workflow (`tauri-build.yml`) already has the cert import step wired up — it activates automatically when `WINDOWS_CERTIFICATE` is set.

4. After import, the cert thumbprint lands in `ANCHOR_CERT_THUMBPRINT` env var.
   Add `signCommand` to `tauri.conf.json`:

```json
"windows": {
  "signCommand": "signtool sign /sha1 %ANCHOR_CERT_THUMBPRINT% /fd sha256 /tr http://timestamp.digicert.com /td sha256 %1"
}
```

---

## Bundle size optimization

Current MSI footprint: ~4.2 MB (Anchor 0.1.0 x64).

`Cargo.toml` release profile is already at the aggressive floor:

```toml
[profile.release]
strip = true
opt-level = "z"
lto = true
codegen-units = 1
panic = "abort"
```

Further options (post-MVP):

- **WebView2 bootstrapper mode**: `bundle.windows.webviewInstallMode.type: "downloadBootstrapper"` (already default) — keeps WebView2 out of the MSI itself.
- **UPX compression**: `cargo install cargo-pgo; upx --best anchor-tauri.exe` — saves ~30–40% but breaks Authenticode signatures; must run BEFORE signing. Deferred.
- **Binary splitting**: ship a `resources/` side-load for large static assets instead of embedding in the exe.

---

## Uninstaller verification procedure

Run after every release candidate build, before cutting the tag.

1. Install the MSI on a clean Windows VM or the Surface Pro test device:
   ```powershell
   msiexec /i "Anchor_<version>_x64_en-US.msi" /quiet
   ```

2. Verify installation artifacts:
   ```powershell
   Test-Path "C:\Users\$env:USERNAME\AppData\Local\Programs\Anchor\anchor-tauri.exe"  # per-user install
   Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*" | Where-Object DisplayName -eq "Anchor"
   ```

3. Uninstall via Programs & Features (UI) or:
   ```powershell
   $app = Get-WmiObject -Class Win32_Product -Filter "Name = 'Anchor'"
   $app.Uninstall()
   ```

4. Verify clean state — none of these should exist after uninstall:
   ```powershell
   Test-Path "C:\Users\$env:USERNAME\AppData\Local\Programs\Anchor"       # should be absent
   Test-Path "C:\Users\$env:USERNAME\AppData\Local\io.sunfish.anchor"      # Tauri app data — user data, NOT removed by uninstall (by design)
   Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*" | Where-Object DisplayName -eq "Anchor"  # should return nothing
   ```

   > **Note:** `AppData\Local\io.sunfish.anchor\` contains the Stronghold vault and SQLite cache. This is user data and is intentionally preserved on uninstall (standard behavior). If the user explicitly wants a clean wipe, they must delete this folder manually.

5. Reinstall the same version to confirm there are no "product already installed" errors.

6. Log results in the release checklist before publishing the GitHub release draft.
