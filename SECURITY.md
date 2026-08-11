# Security Policy

## Supported surface

This repository ships the public portfolio at [bqurtas.com](https://bqurtas.com) (Cloudflare Pages + Pages Functions). The live site is the only supported surface for security reports.

## Reporting a vulnerability

Email **hello@bqurtas.com** with:

- A clear description of the issue and impact
- Steps to reproduce (or a proof-of-concept)
- The URL / endpoint involved

Please do not open a public GitHub issue for undisclosed vulnerabilities.

You can expect an acknowledgement within a few business days. Fixes are prioritized by severity; confirmation follows once a patch is live or the report is declined with a short reason.

## Scope notes

- Public content APIs (read-only Supabase keys, Umami) are intentional and not secret credentials.
- Studio / 2FA endpoints require a private edit token; do not attempt to brute-force them.
- Out of scope: social-engineering of personal accounts, physical office access, and third-party services we do not control.
