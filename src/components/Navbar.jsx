import React, { useState, useEffect } from "react";

export function Navbar({
  page,
  onNav,
  mood,
  chatOpen,
  setChatOpen,
  setShowGroup,
  setShowSwipe,
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { id: "home", label: "Home", icon: "🏠" },
    { id: "recommendations", label: "Picks", icon: "✨" },
    { id: "trending", label: "Trending", icon: "🔥" },
    { id: "favorites", label: "Saved", icon: "❤️" },
  ];

  return (
    <nav
      className={`navbar${scrolled ? " scrolled" : ""}`}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className="nav-brand">
        <span className="brand-logo">🎬</span>
        <div>
          <span className="brand-name gradient-text">MoodFlix</span>
          <span className="brand-ai">AI</span>
        </div>
      </div>

      {/* Desktop Nav links */}
      <div className="nav-center">
        <div className="nav-links">
          {links.map((l) => (
            <button
              key={l.id}
              id={`nav-${l.id}`}
              className={`nav-link${page === l.id ? " active" : ""}`}
              onClick={() => {
                onNav(l.id);
                setMobileOpen(false);
              }}
              aria-current={page === l.id ? "page" : undefined}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right side */}
      <div className="nav-right">
        {/* <button
          id="nav-group-btn"
          className="btn-icon"
          onClick={() => setShowGroup(true)}
          title="Group Watch"
          aria-label="Group Watch mode"
        >
          👥
        </button>
        <button
          id="nav-swipe-btn"
          className="btn-icon"
          onClick={() => setShowSwipe(true)}
          title="Swipe Mode"
          aria-label="Swipe to pick"
        >
          🃏
        </button> */}
        <button
          id="nav-chat-btn"
          className="nav-chat-btn"
          onClick={() => setChatOpen((o) => !o)}
          aria-label="Open AI chat"
        >
          <span>🤖</span>
          <span>MoodBot</span>
        </button>
        {/* Mobile hamburger */}
        <div
          className="nav-hamburger"
          onClick={() => setMobileOpen((o) => !o)}
          role="button"
          aria-label="Toggle mobile menu"
          tabIndex={0}
        >
          <span
            style={{
              transform: mobileOpen
                ? "rotate(45deg) translate(5px, 5px)"
                : "none",
            }}
          />
          <span style={{ opacity: mobileOpen ? 0 : 1 }} />
          <span
            style={{
              transform: mobileOpen
                ? "rotate(-45deg) translate(5px, -5px)"
                : "none",
            }}
          />
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed",
            top: "var(--nav-h)",
            left: 0,
            right: 0,
            background: "rgba(8,8,16,0.97)",
            backdropFilter: "blur(20px)",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            zIndex: 99,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            animation: "slideDown 0.3s ease",
          }}
        >
          {links.map((l) => (
            <button
              key={l.id}
              className={`nav-link${page === l.id ? " active" : ""}`}
              onClick={() => {
                onNav(l.id);
                setMobileOpen(false);
              }}
              style={{
                textAlign: "left",
                padding: "14px 20px",
                borderRadius: "10px",
                fontSize: "1rem",
              }}
            >
              {l.icon} {l.label}
            </button>
          ))}
          <button
            className="nav-link"
            onClick={() => {
              setShowGroup(true);
              setMobileOpen(false);
            }}
            style={{
              textAlign: "left",
              padding: "14px 20px",
              borderRadius: "10px",
              fontSize: "1rem",
            }}
          >
            👥 Group Watch
          </button>
          <button
            className="nav-link"
            onClick={() => {
              setShowSwipe(true);
              setMobileOpen(false);
            }}
            style={{
              textAlign: "left",
              padding: "14px 20px",
              borderRadius: "10px",
              fontSize: "1rem",
            }}
          >
            🃏 Swipe Mode
          </button>
        </div>
      )}
    </nav>
  );
}
