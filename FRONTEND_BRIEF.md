# Frontend milestone 1: role dashboard

## Goal

Build a responsive starting page for an engineering-college cybersecurity practice platform. It should make the next step obvious for both faculty and students.

## First screen

- Product name: **Cyber Practice Lab**
- Welcome heading and short line explaining safe, guided security practice
- Two prominent cards:
  - **Teach a class** — browse lesson plans, choose a topic, and prepare a class session
  - **Practice on your own** — browse labs, continue an exercise, and see learning progress
- A small “How it works” section showing: Learn → Practice safely → Review the fix
- A few sample labs using mock data: Input validation, Access control, Secure configuration
- A clear safety note that all exercises are intentionally vulnerable and run in an isolated practice environment

## Interactions

- Role cards respond to click and keyboard activation.
- Choosing a path opens a simple placeholder view or section for that role.
- Lab cards can show a detail panel with topic, difficulty, estimated time, and a “Start lab” action.
- Use mock data only; no sign-in, database, scoring backend, or real vulnerability scanning in this milestone.

## Design and accessibility

- Make it work on mobile and desktop.
- Use semantic headings, visible focus states, readable contrast, and labels for icon-only controls.
- Keep the interface calm and classroom-friendly; avoid “hacker movie” styling.

## Done when

- A student can understand how to begin independent practice.
- A faculty member can understand how to prepare a class.
- The responsive layout and main interactions work with keyboard and mouse.
- The repository contains the frontend source and a short local run instruction.
