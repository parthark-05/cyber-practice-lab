# Cyber Practice Lab

A safe, guided cybersecurity learning platform for engineering colleges.

## Live website

Live website: https://cyber-practice-lab.onrender.com

## Problem

Engineering students often learn cybersecurity concepts in theory but have limited access to safe, guided environments where they can practice identifying and fixing vulnerabilities. Faculty need classroom materials, while students need hands-on exercises they can continue during lab hours or independently.

## Audience

- **Faculty:** introduce a topic, demonstrate a lab, and share practice work.
- **Students:** complete guided exercises during lab hours or independently.

## First milestone

Build a responsive frontend dashboard with two paths: **Teach a class** and **Practice on your own**. Use mock content first; no real targets or live vulnerability scanning.

## Early exercise ideas

1. Input validation in a local demo app
2. Access control in a toy classroom portal
3. Secure configuration basics

## Product principles

- Exercises run only in an intentionally vulnerable, isolated practice environment.
- Explain the vulnerability and secure fix, not just whether an answer is right.
- Keep classroom setup lightweight for faculty.

## Developer access

The developer sign-in uses the backend-only `ADMIN_ACCESS_KEY` setting. Put it in `backend/.env` for local use or in the backend service's private environment settings before resuming the hosted service. Do not put the key in frontend variables or commit it. The current four-digit code is intended only for this fictional demo; replace it with a longer code before using any real student accounts or data. Failed attempts are rate-limited, and the admin session is cleared when the backend restarts.
