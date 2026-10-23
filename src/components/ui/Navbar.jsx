import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const publicLinks = [
  { name: "Home", path: "/" },
  { name: "Work", path: "/work" },
  { name: "About", path: "/about" },
  { name: "Contact", path: "/contact" },
];
const protectedLinks = [
  { name: "Resume", path: "/resume" },
  { name: "Profile", path: "/profile" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() =>
    Boolean(localStorage.getItem("hr_token")),
  );
  const navbarRef = useRef(null);
  const glowRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = isLoggedIn
    ? [...publicLinks, ...protectedLinks]
    : publicLinks;
  // Interviews require a session created by the resume setup wizard.
  // Never navigate directly to /interview without a sessionId.
  const interviewDestination = isLoggedIn ? "/resume" : "/login";

  useEffect(() => {
    const checkAuth = () =>
      setIsLoggedIn(Boolean(localStorage.getItem("hr_token")));
    checkAuth();
    window.addEventListener("storage", checkAuth);
    window.addEventListener("focus", checkAuth);
    window.addEventListener("auth-change", checkAuth);
    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("focus", checkAuth);
      window.removeEventListener("auth-change", checkAuth);
    };
  }, [location.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    const onMouseMove = (event) => {
      if (!glowRef.current || !navbarRef.current) return;
      const rect = navbarRef.current.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      glowRef.current.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(0,242,255,0.12), transparent 55%)`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  useEffect(() => {
    if (!navbarRef.current) return;
    const ctx = gsap.context(() => {
      gsap.to(navbarRef.current, {
        backgroundColor: "rgba(5,5,8,0.72)",
        boxShadow:
          "0 8px 40px -12px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.05)",
        backdropFilter: "blur(22px) saturate(160%)",
        scrollTrigger: {
          trigger: document.body,
          start: "top -60px",
          toggleActions: "play reverse",
        },
      });
    }, navbarRef);
    return () => ctx.revert();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("hr_token");
    setIsLoggedIn(false);
    setMobileOpen(false);
    window.dispatchEvent(new Event("auth-change"));
    navigate("/login", { replace: true });
  };

  return (
    <nav
      ref={navbarRef}
      className="fixed left-0 top-0 z-[100] w-full border-b border-transparent transition-[border-color] duration-500"
      aria-label="Main navigation"
    >
      <div
        ref={glowRef}
        className="pointer-events-none absolute inset-0 opacity-80"
      />
      <div
        className={`relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 transition-all duration-500 md:px-10 ${scrolled ? "h-16" : "h-20"}`}
      >
        <Link to="/" className="relative z-10" aria-label="HireReady AI — home">
          <motion.div
            className="flex items-center gap-3"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <div className="relative flex h-9 w-9 items-center justify-center">
              <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent to-cyan-400 opacity-80" />
              <span className="absolute inset-[2px] rounded-[10px] bg-bg" />
              <span className="relative z-10 font-display text-sm font-bold text-white">
                H<span className="text-accent">R</span>
              </span>
            </div>
            <span className="font-display text-lg font-semibold tracking-tight text-white">
              HireReady <span className="text-gradient-cyan">AI</span>
            </span>
          </motion.div>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className="group relative px-3 py-2"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`relative z-10 text-sm font-medium transition-colors duration-300 ${isActive ? "text-white" : "text-[var(--text-2)] group-hover:text-white"}`}
                  >
                    {link.name}
                  </span>
                  <span
                    className={`absolute inset-x-3 -bottom-0.5 h-px origin-left bg-gradient-to-r from-accent to-cyan-400 transition-transform duration-300 ${isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`}
                  />
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {!isLoggedIn ? (
            <Link
              to="/login"
              className="rounded-xl border border-accent/40 px-5 py-2 text-sm font-semibold text-accent transition-all duration-300 hover:border-accent hover:bg-accent/10"
            >
              Login
            </Link>
          ) : (
            <>
              <Link
                to="/dashboard"
                className="rounded-xl border border-accent/40 px-5 py-2 text-sm font-semibold text-accent transition-all duration-300 hover:border-accent hover:bg-accent/10"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-300 transition-all hover:border-red-500 hover:bg-red-500/10"
              >
                Logout
              </button>
            </>
          )}
          <Link
            to={interviewDestination}
            className="btn-neon px-5 py-2 text-sm"
          >
            Start Interview
          </Link>
        </div>

        <div className="md:hidden">
          <motion.button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="relative z-10 flex h-10 w-10 items-center justify-center text-white"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            <span className="flex flex-col gap-1.5">
              <motion.span
                className="block h-[2px] w-6 rounded-full bg-white"
                animate={{
                  rotate: mobileOpen ? 45 : 0,
                  y: mobileOpen ? 3.5 : 0,
                }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.span
                className="block h-[2px] w-6 rounded-full bg-white"
                animate={{
                  rotate: mobileOpen ? -45 : 0,
                  y: mobileOpen ? -3.5 : 0,
                }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-navigation"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong mx-4 mt-2 overflow-hidden rounded-3xl md:hidden"
          >
            <div className="flex flex-col p-2">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.path}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + index * 0.05 }}
                >
                  <NavLink
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `block rounded-2xl px-4 py-3.5 text-sm font-medium transition-colors ${isActive ? "bg-accent/10 text-white" : "text-[var(--text-2)] hover:bg-white/5"}`
                    }
                  >
                    {link.name}
                  </NavLink>
                </motion.div>
              ))}
              <div className="flex flex-col gap-3 p-2 pt-3">
                {!isLoggedIn ? (
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-xl border border-accent/40 px-5 py-3 text-center text-sm font-semibold text-accent transition-all hover:bg-accent/10"
                  >
                    Login
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-xl border border-accent/40 px-5 py-3 text-center text-sm font-semibold text-accent transition-all hover:bg-accent/10"
                    >
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="rounded-xl border border-red-500/30 px-5 py-3 text-sm font-medium text-red-300 transition-all hover:bg-red-500/10"
                    >
                      Logout
                    </button>
                  </>
                )}
                <Link
                  to={interviewDestination}
                  onClick={() => setMobileOpen(false)}
                  className="btn-neon block w-full py-3 text-center text-sm"
                >
                  Start Interview
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
