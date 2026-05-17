---
type: marketing-scaffolding
workstream: sunfish-pitch-narrative-6llc-commercial
stage: pre-deck-artifact
authored-by: yeoman
date: 2026-05-17
pao-review-required: true
---

# Sunfish Pitch Narrative Scaffolding
## Pre-Deck Artifact — PAO Review Required Before Copy Drafts

---

## The One-Sentence Sunfish Promise

**Draft:** "Sunfish runs your business software on your machine, with a cloud relay that can be unplugged without losing data."

**Sharpened against the 6-LLC use case:** "Sunfish gives a 6-entity property operator a local-first ERPNext install — rent collection, bank reconciliation, tenant communications, Schedule-E — that keeps working when the internet doesn't, and hands you your data in a plain file when you want to leave."

**PAO choice:** the PAO directive's version is the cleaner elevator pitch. The sharpened version is better for the operator audience. Recommend the PAO directive version as the headline, the sharpened version as the supporting sentence underneath it.

---

## Four-Act Narrative Arc

### Act 1 — The SaaS-Tax Problem for a 6-LLC Operator

The BDFL's situation is the scenario. Six entities: four LLCs, a holding company, a management company. Spouse co-ownership active. Accountant on their own node. CPA with read-only year-end access. Every tenant with a portal.

The SaaS-tax problem for this operator is not the monthly fee — it is the accumulated dependencies. AppFolio for rent collection. QuickBooks for accounting. A third tool for tenant communications. A fourth for lease management. Each tool owns a piece of the operator's data. None of them talk to each other without a paid integration. Bank reconciliation requires exporting from one and importing into another. Year-end tax prep requires manually reconciling what three tools say about the same transactions.

The deeper problem: all three tools can raise prices, change terms, or stop serving the operator's jurisdiction with 30 days' notice. The 2022 SaaS enforcement events (hundreds of thousands of organizations losing access to Western tools overnight under sanctions) are the canonical recent example. The failure mode is not technical. It is jurisdictional. No contract clause prevents it.

For a 6-LLC operator, the vendor-dependency stack is not an abstraction. It is a concrete list of tools, each with its own price, its own data format, and its own terms of service. The question is whether there is a better foundation.

### Act 2 — Why "Just Use ERPNext" Is Half the Answer

ERPNext (Frappe, GPLv3) is the accounting and property engine the operator's workflow actually needs. It handles:
- Multi-entity general ledger (6 entities, each isolated)
- Rent invoicing and collection
- Bank reconciliation via native bank feed or CSV import
- Vendor payment tracking
- Statement generation (rent rolls, P&L, Schedule-E source data)

ERPNext self-hosted is genuinely powerful. The BDFL validated this: W#60 P1 PASS — ERPNext running on the CO's machine, lease + rent payment + ledger confirmed 2026-05-12.

But ERPNext alone is half the answer. The other half of the answer is what ERPNext does not give you:
- Offline-first: ERPNext is a web app. It requires a running server. If the Surface Pro is not connected, the app is not available.
- Local encryption: ERPNext on a server holds plaintext. The encryption boundary is at the device level, not the record level.
- Tenant portal with end-to-end encrypted communications: ERPNext has no native tenant messaging.
- Cryptographic recovery: if the device dies, getting back to the ERPNext data requires a backup restore — which requires knowing where the backup is, having the credentials, and setting up a new server.
- React UI skin for the operator: ERPNext's UI is a full ERP application interface. An operator-facing React UI showing only the relevant screens (rent roll, bank statement, tenant comms) does not exist in ERPNext.

"Just use ERPNext" solves the multi-tool dependency problem. It does not solve the offline, encryption, tenant portal, or recovery problems.

### Act 3 — The Local-First Composition: What Each Component Does

The Sunfish architecture answers the second half of the answer. Each component has a specific role:

**ERPNext (self-hosted, GPLv3)**
- Owns the accounting data model: chart of accounts, journal entries, bank transactions, invoices, vendor payments
- Owns the multi-entity general ledger: 6 entities isolated, each with its own books
- Owns statement generation: rent roll, P&L, Schedule-E source data
- Does NOT own: offline operation, client-side encryption, tenant communications, cryptographic recovery

**Sunfish (local-first layer)**
- Owns the React UI skin: operator-facing screens (rent roll, bank statement, tenant communications, property dashboard) without exposing the full ERPNext interface
- Owns the offline cache: Tauri v2 SQLite store on the Surface Pro; operator works disconnected; changes sync to ERPNext on reconnect
- Owns tenant communications: end-to-end encrypted channel between operator and tenant, independent of ERPNext
- Owns cryptographic recovery: `Foundation.Recovery` with multi-sig trustee model; spouse co-ownership via HKDF subkeys; paper key backup

**Anchor (Zone A local-first desktop accelerator)**
- The .NET MAUI Blazor Hybrid shell that runs the full kernel stack on the operator's device
- Kernel stack: gossip daemon, CRDT engine, SQLCipher encrypted local DB, role attestation
- Connects to ERPNext via local API; caches relevant data in the local SQLite store
- Runs offline; syncs in background when connected

**signal-bridge / Bridge (Zone C relay)**
- Cloud relay: forwards ciphertext between nodes, holds no plaintext
- CPA read-only access via Bridge: year-end data accessible without giving CPA direct database access
- Accountant peer node via Headscale: peer-to-peer sync between operator Anchor and accountant Anchor
- Can be unplugged: if the relay goes down, all local nodes continue operating; data is not lost

**Galley (flight-deck MCP layer)**
- Book-side tooling; not part of the property-management pitch (do not include in operator-facing copy)

**flight-deck**
- Media + audiobook production; not part of the property-management pitch

**shipyard**
- Internal monorepo for shared packages (.NET + pnpm workspace); operators never see this name

**signal-bridge (in operator-facing copy: "cloud relay")**
- Operators do not need to know the repo name; use "cloud relay" in external copy

### Act 4 — The Proof: BDFL Runs His Real Business on It

The proof is not a demo. It is a production workload.

The BDFL is 8-14 weeks from G-1 MVP-ready (per MASTER-PLAN velocity baseline). G-1 done conditions:
- W#60 P3 PASS: CO works offline on Surface Pro 30 min; reconnects; changes appear in ERPNext
- W#60 P4 PASS: Accountant peer node syncing; CPA can view year-end data; tenant portal works via magic-link
- W#60 P5 PASS: rent roll + P&L + Schedule-E accessible from React UI
- Annual cycle dry-run: tax-prep export matches accountant's records

The proof statement for the pitch: the BDFL processed the first rent collection cycle end-to-end (React UI → ERPNext → bank statement), sent the first tenant communication through the Sunfish channel, and the accountant performed bank reconciliation from their own Anchor node. The system survived a deliberate offline test on a Surface Pro in a location without wifi, and the changes appeared in ERPNext when the device reconnected.

This is the proof no AppFolio slide can match: a real operator, a real 6-entity workload, a real offline test, and the data is still there.

---

## Brand-Boundary One-Liners

These are Sunfish-facing (for pitches, landing pages, README hero copy) — not internal architecture descriptions.

| Component | One-liner | Notes |
|---|---|---|
| **Sunfish** | The local-first business software layer: React UI, offline cache, tenant communications, and cryptographic recovery — running on your machine, not a vendor's server. | Sunfish = the composition layer + the differentiating features (offline, encryption, comms, recovery). ERPNext does the accounting. |
| **Anchor** | The desktop application that keeps your business software running offline, on your device, with end-to-end encrypted local storage. | Operator-facing name for the MAUI shell. "Anchor" as a name can be used in operator marketing. |
| **Bridge** | The cloud relay that connects your local node to collaborators — accountants, CPAs, tenants — without holding your data in plaintext. | "Bridge" or "cloud relay" for operators. Never "the relay" alone (sounds like infrastructure). |
| **Galley** | The authoring and measurement toolchain for *The Inverted Stack* book — not part of the property software. | Do not surface in property-management pitch materials. |
| **flight-deck** | The media production platform for audiobook and book production — not part of the property software. | Do not surface in property-management pitch materials. |
| **shipyard** | The internal package monorepo powering all fleet applications — operators never see this name. | Internal only. Never in external copy. |
| **signal-bridge** | The relay infrastructure repo — in operator copy, call it "the cloud relay." | Internal repo name. Operator copy uses "cloud relay" or "Bridge." |

**Brand-boundary conflicts identified in current docs:**
1. `sunfish/src/README.md` describes Anchor as "the local-first desktop reports and admin dashboard accelerator" — the word "reports" undersells what Anchor does and the word "accelerator" is internal vocabulary. Neither should appear in external copy.
2. The distinction between Sunfish (the composition layer) and Anchor (the MAUI shell) is not visible to an operator and should not be surfaced in pitch copy. From the operator's perspective, "Sunfish" is what runs on their machine.
3. signal-bridge does not appear in any operator-facing context but its name ("signal-bridge") uses the word "bridge" differently than the Bridge accelerator (Zone C SaaS shell). These share a vocabulary root but are different things; pitch copy should use "cloud relay" for signal-bridge and reserve "Bridge" for the Zone C accelerator only if the operator-facing pitch needs to address the accountant / CPA access scenario.

---

## Three Audiences and Their First Question

### Audience 1 — Property-Management Operator Looking at AppFolio

**First question:** "Why not just keep AppFolio?"

**Answer:** AppFolio owns your lease data, your tenant payment history, your maintenance records, and your rent roll. It can raise prices (it has, repeatedly — the 2024 pricing restructure doubled costs for many mid-size portfolios), change terms, or stop serving your jurisdiction with 30 days' notice. When AppFolio is down, your operation is down. When you want to leave AppFolio, you need their cooperation to get your data out in a usable format. Sunfish gives you the same workflows — rent collection, tenant portal, lease management, bank reconciliation — on your machine. Your data lives in a local encrypted store. You can export it in plain JSON and CSV without calling anyone. The cloud relay is optional and can be replaced. AppFolio cannot be unplugged without losing everything.

**Pitch hook:** "AppFolio is a good product as long as AppFolio wants you as a customer."

### Audience 2 — Local-First Practitioner / Inverted Stack Book Reader

**First question:** "Is this the book's reference architecture?"

**Answer:** Yes. Sunfish is the living reference implementation of *The Inverted Stack*. The W#60 pivot (ERPNext composition) is the book's Zone A architecture applied to a real commercial workload: ERPNext as the domain engine, Anchor as the local-first node (Zone A), Bridge as the hybrid relay (Zone C), cryptographic recovery via `Foundation.Recovery`, CRDT-backed sync via `Sunfish.Kernel.Sync`. The BDFL's 6-LLC property management business is the first production deployment. The book's architecture is not aspirational here — it is running.

**Pitch hook:** "The book describes what to build. This is what was built."

### Audience 3 — Open-Source ERPNext Community / Frappe Ecosystem

**First question:** "Why not just upstream into Frappe?"

**Answer:** The local-first layer — offline-first SQLite cache, end-to-end encrypted tenant communications, cryptographic multi-trustee recovery, Ed25519 device keys, gossip-protocol sync between nodes — is not a Frappe feature. Frappe is a web application framework with a hosted data model. Making Frappe local-first would require replacing its data layer, its session model, and its network assumptions — a different project. Sunfish wraps ERPNext at the API layer and adds the local-first features as a separate application layer. ERPNext stays ERPNext; Sunfish adds what ERPNext cannot be without becoming something else.

Additionally: the Sunfish stack (.NET MAUI, SQLCipher, Ed25519 keys, CRDT sync) is not a Python/Frappe stack. These are parallel approaches to a problem ERPNext was not designed to solve.

**Pitch hook:** "ERPNext solves the accounting problem. Sunfish solves the ownership problem."

---

## Post-Restructure Brand-Boundary Gaps (for PAO escalation if contradictory)

The following observations are flagged for PAO review. These appear to be **unclear rather than contradictory** — no yeoman-question has been filed:

1. **"Sunfish" as product vs. repo:** The `sunfish` repo is the local-first application layer. But from a user-facing perspective, "Sunfish" is the entire composition (Anchor + Bridge + ERPNext integration). The pitch copy should pick one register and use it consistently. Recommendation: "Sunfish" in external copy means the user-facing product (the whole composition); internal docs use repo names.

2. **Anchor vs. "the app":** Anchor is the MAUI accelerator. In the 6-LLC scenario, the operator will install something that looks like an app. Should that app be called "Sunfish" or "Anchor" in marketing copy? Recommendation: "Sunfish" (the product name) for external copy; "Anchor" for developer-facing documentation.

3. **signal-bridge vs. Bridge:** Naming ambiguity noted above. This is unclear but not contradictory — the two things serve different roles at different layers. Clarification needed in any copy that references both in the same sentence.

---

## What This Scaffolding Is NOT

- Not slide copy. Slides come after PAO + CIC ratify this framing.
- Not README hero copy. That draft comes in a follow-on cycle.
- Not a business plan. The MASTER-PLAN has the G-1 done conditions and velocity baseline.
- Not a technical specification. The architecture papers (v13, v5) and Sunfish ADRs are the specifications.

This is the narrative logic that slide copy and hero copy will instantiate. PAO reviews the logic before the words are written.
