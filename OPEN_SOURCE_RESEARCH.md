# Open-source references

These are research references for the college cybersecurity learning platform. We have not copied source code from these projects.

| Project | Useful for | License status | Link |
| --- | --- | --- | --- |
| OWASP Juice Shop | Intentionally insecure web app for safe training, demos, and CTFs; could be run as a separate practice target later. | MIT. If we redistribute copied or modified portions, retain the copyright and permission notices. | https://github.com/juice-shop/juice-shop |
| CTFd | Challenge authoring, hints, flags, individual/team practice, and competition flow patterns. Could inform future faculty and student workflows. | Apache-2.0. Redistribution requires the license, notices, and marking modified files; check NOTICE if present. | https://github.com/CTFd/CTFd |
| picoCTF platform | Educational challenge ideas and student progression patterns. The repository returned by search is archived, so treat as historical reference. | MIT file present in the repository; retain notices if reusing source. | https://github.com/CyLabAcademy/picoCTF |
| OWASP WebGoat | Potential guided lesson reference. | Not verified in this review; do not reuse code until the repository license is confirmed. | https://github.com/WebGoat/WebGoat |

## Reuse rules for this project

- Prefer building our own faculty/student dashboard and use the projects above for product research.
- If we bring in code, record the exact repository, file paths, license, copyright notice, and changes in an `ATTRIBUTIONS.md` file.
- Keep intentionally vulnerable applications isolated from the public internet and from college systems. For the first milestone, the dashboard uses mock data and does not connect to a vulnerable target.
- Before adopting a full framework or lab, review its current setup instructions, dependencies, maintenance status, and license at the exact commit we use.
