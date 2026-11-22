import { useEffect, useRef, useState } from "react";
import "./App.css";

// ---------- Mock data (no network requests) ----------
const roles = [
  {
    id: "teach",
    tag: "For instructors",
    title: "Teach a class",
    description:
      "Create a lab session, choose exercises, and track how your students are progressing.",
    buttonLabel: "Set up a class",
    buttonClass: "button-primary",
    message: "Class setup is coming soon. (Mock action: Teach a class)",
  },
  {
    id: "practice",
    tag: "For learners",
    title: "Practice on your own",
    description:
      "Work through hands-on labs at your own pace and build skills with instant feedback.",
    buttonLabel: "Start practicing",
    buttonClass: "button-primary",
    message: "Solo practice is coming soon. (Mock action: Practice on your own)",
  },
];

const stats = [
  { id: "completed", label: "Labs completed", value: "7", note: "+2 this week" },
  { id: "streak", label: "Practice streak", value: "5 days", note: "Best: 9 days" },
  { id: "hours", label: "Hours practiced", value: "12.5", note: "Goal: 20 hours" },
  { id: "score", label: "Average score", value: "86%", note: "Up 4% this month" },
];

const continueItems = [
  {
    id: "web-basics",
    title: "Web Security Basics",
    module: "Module 3 of 5: Sessions and cookies",
    progress: 60,
  },
  {
    id: "secure-coding",
    title: "Secure Coding Habits",
    module: "Module 1 of 4: Error handling",
    progress: 25,
  },
];

const labs = [
  {
    id: "input-validation",
    title: "Input validation",
    description:
      "See how unchecked input causes problems, then practice validating and sanitizing it.",
    difficulty: "Beginner",
    badgeClass: "badge-beginner",
    time: "30 min",
    tags: ["Web", "Forms"],
  },
  {
    id: "access-control",
    title: "Access control",
    description:
      "Explore how roles and permissions protect resources, and what happens when they break.",
    difficulty: "Intermediate",
    badgeClass: "badge-intermediate",
    time: "45 min",
    tags: ["Permissions", "Roles"],
  },
  {
    id: "secure-configuration",
    title: "Secure configuration",
    description:
      "Find and fix risky default settings in a sample application setup.",
    difficulty: "Advanced",
    badgeClass: "badge-advanced",
    time: "40 min",
    tags: ["Hardening", "Settings"],
  },
];

const upcoming = [
  { id: "up-1", title: "Intro to Web Security", meta: "Mon, 10:00 AM · Room B204" },
  { id: "up-2", title: "Lab session: Access control", meta: "Wed, 2:00 PM · Online" },
];

const recent = [
  { id: "rec-1", title: "Finished Input validation (quiz)", meta: "Yesterday · Score 92%" },
  { id: "rec-2", title: "Started Secure Coding Habits", meta: "2 days ago" },
  { id: "rec-3", title: "Earned the 5-day streak badge", meta: "3 days ago" },
];

// ---------- Component ----------
function App() {
  // One small piece of state: the message shown near the top of the page.
  const [statusMessage, setStatusMessage] = useState(
    "Pick a role, resume a course, or preview a lab to get started."
  );

  // A reference to the glowing circle that follows the mouse.
  const cursorGlowRef = useRef(null);

  function handleAction(message) {
    setStatusMessage(message);
  }

  // Pointer effects: a soft glow follows the mouse, and glass panels
  // get a faint highlight where the mouse is. Nothing here changes layout.
  useEffect(() => {
    const glow = cursorGlowRef.current;
    if (!glow) return;

    // Only run on devices with a real mouse, and only if the person has
    // not asked for reduced motion.
    const hasMouse = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!hasMouse.matches || reduceMotion.matches) return;

    let targetX = 0; // where the mouse is
    let targetY = 0;
    let currentX = 0; // where the glow is drawn (it eases toward the mouse)
    let currentY = 0;
    let frameId = null;
    let hasMoved = false;

    function draw() {
      // Move 12% of the remaining distance each frame for a smooth trail.
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      glow.style.transform =
        "translate3d(" + currentX + "px, " + currentY + "px, 0) translate(-50%, -50%)";

      const isClose =
        Math.abs(targetX - currentX) < 0.5 && Math.abs(targetY - currentY) < 0.5;
      // Keep animating until the glow catches up, then stop to save work.
      frameId = isClose ? null : requestAnimationFrame(draw);
    }

    function handlePointerMove(event) {
      // Ignore touch and pen input. Only a mouse moves the glow.
      if (event.pointerType !== "mouse") return;

      targetX = event.clientX;
      targetY = event.clientY;

      if (!hasMoved) {
        // First movement: place the glow right at the cursor and show it.
        hasMoved = true;
        currentX = targetX;
        currentY = targetY;
        glow.classList.add("is-active");
      }

      if (frameId === null) {
        frameId = requestAnimationFrame(draw);
      }

      // If the mouse is over a glass panel, tell the panel where it is
      // (relative to the panel) so CSS can place a faint highlight there.
      if (event.target instanceof Element) {
        const panel = event.target.closest(".panel");
        if (panel) {
          const box = panel.getBoundingClientRect();
          panel.style.setProperty("--mx", event.clientX - box.left + "px");
          panel.style.setProperty("--my", event.clientY - box.top + "px");
        }
      }
    }

    function handlePointerLeave() {
      glow.classList.remove("is-active");
    }

    function handlePointerEnter() {
      if (hasMoved) glow.classList.add("is-active");
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", handlePointerLeave);
    document.documentElement.addEventListener("pointerenter", handlePointerEnter);

    // Clean up when the component is removed.
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.documentElement.removeEventListener("pointerleave", handlePointerLeave);
      document.documentElement.removeEventListener("pointerenter", handlePointerEnter);
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div className="app">
      {/* Decorative glow that follows the mouse (hidden from screen readers) */}
      <div className="cursor-glow" ref={cursorGlowRef} aria-hidden="true"></div>

      <header className="site-header">
        <div className="container header-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true"></span>
            <span className="brand-name">Cyber Practice Lab</span>
          </div>
          <div className="header-actions">
            <span className="pill">Student preview</span>
            <button
              type="button"
              className="button button-ghost"
              onClick={() =>
                handleAction("You have 2 new notifications. (Mock action)")
              }
            >
              Notifications
            </button>
          </div>
        </div>
      </header>

      <main className="container main">
        {/* Welcome area and progress stats, side by side on desktop */}
        <div className="top-grid">
          <section className="panel hero" aria-labelledby="welcome-heading">
            <p className="eyebrow">Dashboard</p>
            <h1 id="welcome-heading" className="hero-title">
              Welcome back to Cyber Practice Lab
            </h1>
            <p className="hero-text">
              Build real cybersecurity skills through guided, hands-on labs.
              Pick up where you left off, or choose a new path below.
            </p>
            <p className="status" role="status" aria-live="polite">
              <span className="status-dot" aria-hidden="true"></span>
              {statusMessage}
            </p>
          </section>

          <section className="progress-section" aria-labelledby="stats-heading">
            <h2 id="stats-heading" className="section-title">
              Your progress
            </h2>
            <ul className="stat-grid">
              {stats.map((stat) => (
                <li key={stat.id} className="panel stat-card">
                  <span className="stat-label">{stat.label}</span>
                  <strong className="stat-value">{stat.value}</strong>
                  <span className="stat-note">{stat.note}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Role cards */}
        <section className="section" aria-labelledby="roles-heading">
          <h2 id="roles-heading" className="section-title">
            How would you like to start?
          </h2>
          <div className="role-grid">
            {roles.map((role) => (
              <article
                key={role.id}
                className={`panel role-card role-card-${role.id}`}
              >
                <p className="role-tag">{role.tag}</p>
                <h3 className="role-title">{role.title}</h3>
                <p className="card-text">{role.description}</p>
                <button
                  type="button"
                  className={`button ${role.buttonClass}`}
                  onClick={() => handleAction(role.message)}
                >
                  {role.buttonLabel}
                </button>
              </article>
            ))}
          </div>
        </section>

        <div className="layout">
          <div className="content">
            {/* Continue learning */}
            <section className="section" aria-labelledby="continue-heading">
              <h2 id="continue-heading" className="section-title">
                Continue learning
              </h2>
              <ul className="continue-list">
                {continueItems.map((item) => (
                  <li key={item.id} className="panel continue-card">
                    <div className="continue-info">
                      <h3 className="card-title">{item.title}</h3>
                      <p className="card-meta">{item.module}</p>
                      <div
                        className="progress"
                        role="progressbar"
                        aria-label={`${item.title} progress`}
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-valuenow={item.progress}
                      >
                        <span
                          className="progress-fill"
                          style={{ width: `${item.progress}%` }}
                        ></span>
                      </div>
                      <p className="progress-text">{item.progress}% complete</p>
                    </div>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() =>
                        handleAction(
                          `Resuming "${item.title}" soon. (Mock action)`
                        )
                      }
                    >
                      Resume
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* Sample labs */}
            <section className="section" aria-labelledby="labs-heading">
              <h2 id="labs-heading" className="section-title">
                Sample labs
              </h2>
              <ul className="lab-grid">
                {labs.map((lab) => (
                  <li key={lab.id} className="panel lab-card">
                    <div className="lab-top">
                      <h3 className="card-title">{lab.title}</h3>
                      <span className={`badge ${lab.badgeClass}`}>
                        {lab.difficulty}
                      </span>
                    </div>
                    <p className="card-text">{lab.description}</p>
                    <ul className="tag-list" aria-label="Topics">
                      {lab.tags.map((tag) => (
                        <li key={tag} className="tag">
                          {tag}
                        </li>
                      ))}
                    </ul>
                    <dl className="lab-meta">
                      <div className="meta-item">
                        <dt>Difficulty</dt>
                        <dd>{lab.difficulty}</dd>
                      </div>
                      <div className="meta-item">
                        <dt>Estimated time</dt>
                        <dd>{lab.time}</dd>
                      </div>
                    </dl>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() =>
                        handleAction(
                          `The "${lab.title}" lab will open here soon. (Mock action)`
                        )
                      }
                    >
                      Preview lab
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="sidebar">
            {/* Upcoming classes and recent activity */}
            <aside className="panel side-panel" aria-labelledby="schedule-heading">
              <h2 id="schedule-heading" className="side-title">
                Schedule and activity
              </h2>

              <h3 className="side-subtitle">Upcoming classes</h3>
              <ul className="timeline">
                {upcoming.map((item) => (
                  <li key={item.id} className="timeline-item">
                    <span className="timeline-title">{item.title}</span>
                    <span className="timeline-meta">{item.meta}</span>
                  </li>
                ))}
              </ul>

              <h3 className="side-subtitle">Recent activity</h3>
              <ul className="timeline">
                {recent.map((item) => (
                  <li key={item.id} className="timeline-item">
                    <span className="timeline-title">{item.title}</span>
                    <span className="timeline-meta">{item.meta}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className="button button-ghost"
                onClick={() =>
                  handleAction("The full calendar is coming soon. (Mock action)")
                }
              >
                View calendar
              </button>
            </aside>

            {/* Safety note */}
            <aside className="panel safety-note" aria-labelledby="safety-heading">
              <h2 id="safety-heading" className="safety-title">
                Safety note
              </h2>
              <p className="safety-text">
                Practice labs run in isolated, intentionally vulnerable
                environments built for learning. Only use these techniques
                inside the labs, never on systems you do not own or have
                permission to test.
              </p>
            </aside>
          </div>
        </div>
      </main>

      <footer className="site-footer">
        <div className="container">
          <p className="footer-text">
            Cyber Practice Lab &middot; Prototype with mock data
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;