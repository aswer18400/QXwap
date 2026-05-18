# Security Policy

## Supported Versions

QXwap is pre-1.0. Only the latest commit on `main` is supported with security
fixes. Older commits and pre-launch staging snapshots are not patched.

| Version | Supported |
|---------|-----------|
| `main` (HEAD) | yes |
| anything else | no |

## Reporting a Vulnerability

**Do not** open a public GitHub issue, GitHub Discussion, or PR for a suspected
security problem.

Instead, email the maintainer directly:

```text
sarun012345@gmail.com
```

Include in your report:

- A clear description of the vulnerability.
- Steps to reproduce (curl/script/screenshot is fine).
- The commit SHA or `curl /api/version` output of the affected deployment.
- Impact estimate (data exposure, privilege escalation, denial of service, etc.).
- Whether you have already disclosed this anywhere else.

We aim to acknowledge reports within 72 hours and provide a remediation plan or
mitigation within 14 days for high-impact issues.

## Scope

In scope:

- The QXwap API (`apps/api`) and its deployed instance at the production URL
  listed in `AI_START_HERE.md`.
- The QXwap web frontend (`apps/web`) and its deployed instance on GitHub Pages.
- The deploy preflight and smoke scripts in `scripts/`.

Out of scope:

- Third-party services we depend on (Supabase, Render, GitHub) — please report
  those to the upstream vendor.
- Findings that require a compromised user device, browser extension, or
  network position (e.g. on-path MITM on an attacker-controlled network).
- Denial of service achieved purely by traffic volume.
- Self-XSS that requires the user to paste attacker-controlled JavaScript into
  their own DevTools console.

## Handling of Sensitive Values

- The Supabase service-role key, session secret, and database connection
  string never appear in this repository, in screenshots, in Figma, or in any
  AI handoff doc.
- If you accidentally commit a secret, rotate it before opening a PR to remove
  it. Removing the commit is not enough; the value must be considered exposed.

## Coordinated Disclosure

We prefer coordinated disclosure: please give us a reasonable window to ship a
fix before publishing details. We will credit researchers who request it in
release notes once the fix is deployed.
