import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/ui/Navbar";
import PageTransition from "../components/ui/PageTransition";
import GlassCard from "../components/ui/GlassCard";

const BASE = import.meta.env.VITE_API_URL || "/api";
const statusStyles = {
  scheduled: "text-amber-300 bg-amber-400/10 border-amber-400/20",
  in_progress: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20",
  completed: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
  cancelled: "text-red-300 bg-red-400/10 border-red-400/20",
  rescheduled: "text-violet-300 bg-violet-400/10 border-violet-400/20",
};
const statusNames = {
  in_progress: "In progress",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  rescheduled: "Rescheduled",
};
const stageNames = {
  screening: "Screening",
  technical: "Technical",
  system_design: "System design",
  behavioral: "Behavioral",
  final: "Final round",
  offer: "Offer",
  rejected: "Rejected",
};
const notificationIcons = {
  interview_scheduled: "📅",
  interview_reminder: "⏰",
  interview_completed: "✅",
  report_generated: "📊",
  resume_submitted: "📄",
  application_update: "🔄",
  system_announcement: "📢",
  achievement_unlocked: "🏆",
};
const panel = "rounded-2xl border border-white/10 bg-white/[0.035]";
const dateFmt = (
  value,
  options = { month: "short", day: "numeric", year: "numeric" },
) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, options);
};
const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const clamp = (value) => Math.min(100, Math.max(0, number(value)));
const displayScore = (value) =>
  value == null || value === "" ? "—" : `${Math.round(number(value))}`;
const list = (value) => (Array.isArray(value) ? value : []);
const label = (value) => String(value || "Unknown").replaceAll("_", " ");

async function api(path, options = {}, signal) {
  const token = localStorage.getItem("hr_token");
  if (!token) throw new Error("Please log in to view your dashboard.");
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    signal,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  });
  if (!response.ok) {
    if (response.status === 401)
      throw new Error("Your session has expired. Please log in again.");
    const text = await response.text();
    throw new Error(
      text.slice(0, 180) || `Request failed (${response.status})`,
    );
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("overview");
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [busyNotifications, setBusyNotifications] = useState([]);

  const loadDashboard = useCallback(async (signal, quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const result = await api("/dashboard", {}, signal);
      if (signal?.aborted) return;
      if (!result?.data) throw new Error("Dashboard data is unavailable.");
      setData(result.data);
    } catch (err) {
      if (err.name !== "AbortError" && !signal?.aborted) setError(err.message);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadDashboard(controller.signal);
    return () => controller.abort();
  }, [loadDashboard]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  const updateNotification = async (path, updater, ids = []) => {
    if (ids.some((id) => busyNotifications.includes(id))) return;
    setBusyNotifications((prev) => [...prev, ...ids]);
    try {
      await api(path, { method: "PUT" });
      setData((prev) => (prev ? updater(prev) : prev));
    } catch (err) {
      setNotice(`Couldn't update notifications: ${err.message}`);
    } finally {
      setBusyNotifications((prev) => prev.filter((id) => !ids.includes(id)));
    }
  };

  const markRead = (id) =>
    updateNotification(
      `/dashboard/notifications/${encodeURIComponent(id)}/read`,
      (prev) => {
        const notifications = list(prev.latestNotifications);
        const unread = notifications.some(
          (n) => String(n.id) === String(id) && !n.is_read,
        );
        return {
          ...prev,
          latestNotifications: notifications.map((n) =>
            String(n.id) === String(id) ? { ...n, is_read: true } : n,
          ),
          stats: {
            ...prev.stats,
            unreadNotifications: Math.max(
              0,
              number(prev.stats?.unreadNotifications) - (unread ? 1 : 0),
            ),
          },
        };
      },
      [id],
    );

  const archive = (id) =>
    updateNotification(
      `/dashboard/notifications/${encodeURIComponent(id)}/archive`,
      (prev) => {
        const notifications = list(prev.latestNotifications);
        const target = notifications.find((n) => String(n.id) === String(id));
        return {
          ...prev,
          latestNotifications: notifications.filter(
            (n) => String(n.id) !== String(id),
          ),
          stats: {
            ...prev.stats,
            unreadNotifications: Math.max(
              0,
              number(prev.stats?.unreadNotifications) -
                (target && !target.is_read ? 1 : 0),
            ),
          },
        };
      },
      [id],
    );

  const markAllRead = () =>
    updateNotification(
      "/dashboard/notifications/read-all",
      (prev) => ({
        ...prev,
        latestNotifications: list(prev.latestNotifications).map((n) => ({
          ...n,
          is_read: true,
        })),
        stats: { ...prev.stats, unreadNotifications: 0 },
      }),
      ["all"],
    );

  const user = data?.user || {};
  const stats = data?.stats || {};
  const resume = data?.currentResume || null;
  const reports = list(data?.recentReports);
  const notifications = list(data?.latestNotifications);
  const timeline = list(data?.timeline);
  const latest = data?.latestInterview || null;
  const skills =
    data?.skillBreakdown &&
    typeof data.skillBreakdown === "object" &&
    !Array.isArray(data.skillBreakdown)
      ? Object.entries(data.skillBreakdown).filter(([, value]) =>
          Number.isFinite(Number(value)),
        )
      : [];
  const profileItems = [
    user.full_name,
    user.college,
    user.branch,
    user.graduation_year,
    user.preferred_role,
    resume,
  ];
  const profilePercent = Math.round(
    (profileItems.filter(Boolean).length / profileItems.length) * 100,
  );
  const completed = number(stats.completedInterviews);
  const total = number(stats.totalInterviews);
  const avgScore =
    stats.averageScore == null ? null : number(stats.averageScore);
  const completedRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const firstName = user.full_name?.trim().split(/\s+/)[0] || "there";
  const greeting =
    new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 17
        ? "Good afternoon"
        : "Good evening";

  const filteredNotifications = useMemo(
    () =>
      notifications.filter((n) => {
        const matchesFilter =
          notificationFilter === "all" ||
          (notificationFilter === "unread" ? !n.is_read : !!n.is_read);
        const matchesSearch = `${n.title || ""} ${n.message || ""}`
          .toLowerCase()
          .includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
      }),
    [notifications, notificationFilter, search],
  );

  const filteredTimeline = useMemo(
    () =>
      timeline.filter((item) =>
        `${item.company || ""} ${item.role || ""} ${item.status || ""} ${item.stage || ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [timeline, search],
  );

  const openResume = () => {
    if (!resume?.file_url)
      return setNotice(
        "A viewable resume URL isn't available. Open Resume Management instead.",
      );
    try {
      const url = new URL(resume.file_url, window.location.origin);
      if (!["https:", "http:"].includes(url.protocol))
        throw new Error("Invalid file URL");
      window.open(url.href, "_blank", "noopener,noreferrer");
    } catch {
      setNotice("Unable to open this resume file.");
    }
  };

  return (
    <>
      <Navbar />
      <PageTransition>
        <main
          id="main"
          className="relative min-h-screen overflow-hidden bg-bg pb-24 pt-28 text-white"
        >
          <div className="pointer-events-none absolute -left-52 top-24 h-[500px] w-[500px] rounded-full bg-accent/[0.045] blur-[110px]" />
          <div className="pointer-events-none absolute -right-44 top-[500px] h-[500px] w-[500px] rounded-full bg-violet-500/[0.06] blur-[110px]" />
          <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            {notice && (
              <div
                role="status"
                className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"
              >
                <span>{notice}</span>
                <button
                  type="button"
                  onClick={() => setNotice("")}
                  aria-label="Dismiss notification"
                >
                  ✕
                </button>
              </div>
            )}
            {loading ? (
              <LoadingDashboard />
            ) : error && !data ? (
              <GlassCard className="p-10 text-center">
                <div className="text-4xl">⚠️</div>
                <h1 className="mt-3 text-xl font-semibold">
                  Couldn't load your dashboard
                </h1>
                <p className="mt-2 text-sm text-red-300">{error}</p>
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    className="btn-neon px-5 py-2 text-sm"
                    onClick={() => loadDashboard()}
                  >
                    Try again
                  </button>
                  <Link className="btn-ghost px-5 py-2 text-sm" to="/login">
                    Login
                  </Link>
                </div>
              </GlassCard>
            ) : data ? (
              <>
                <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                      Your preparation workspace
                    </div>
                    <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                      {greeting},{" "}
                      <span className="text-gradient-cyan">{firstName}</span> 👋
                    </h1>
                    <p className="mt-2 text-sm text-white/50">
                      Track progress, discover weak spots, and prepare for your
                      next interview.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => loadDashboard(undefined, true)}
                      disabled={refreshing}
                      className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/10 disabled:opacity-50"
                    >
                      {refreshing ? "Refreshing…" : "↻ Refresh"}
                    </button>
                    <Link
                      to="/interview"
                      className="btn-neon inline-flex items-center px-5 py-2.5 text-sm"
                    >
                      ✦ Start mock interview
                    </Link>
                  </div>
                </header>
                {error && (
                  <p
                    role="alert"
                    className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300"
                  >
                    Refresh failed: {error}. Showing previously loaded data.
                  </p>
                )}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric
                    icon="🎯"
                    title="Total interviews"
                    value={total}
                    detail="Practice sessions"
                    accent="cyan"
                  />
                  <Metric
                    icon="✅"
                    title="Completed"
                    value={completed}
                    detail={`${completedRate}% completion rate`}
                    accent="green"
                  />
                  <Metric
                    icon="📈"
                    title="Average score"
                    value={
                      avgScore == null ? "—" : `${Math.round(avgScore)}/100`
                    }
                    detail="Across scored interviews"
                    accent="purple"
                  />
                  <Metric
                    icon="🔔"
                    title="Unread alerts"
                    value={number(stats.unreadNotifications)}
                    detail="Notifications"
                    accent="pink"
                  />
                </div>

                <div className="mt-6 grid gap-5 lg:grid-cols-[1.7fr_1fr]">
                  <GlassCard
                    className="relative overflow-hidden p-6 sm:p-7"
                    strong
                    glow="#00F2FF"
                  >
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-accent/[0.07] via-transparent to-violet-400/[0.07]" />
                    <div className="relative flex flex-wrap items-center justify-between gap-5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                          Your next step
                        </p>
                        <h2 className="mt-2 text-xl font-semibold sm:text-2xl">
                          {!resume
                            ? "Add your resume to get started"
                            : completed === 0
                              ? "Your first interview starts here"
                              : "Keep your momentum going"}
                        </h2>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60">
                          {!resume
                            ? "Upload a resume so HireReady can tailor questions to your background."
                            : completed === 0
                              ? "Your resume is ready. Practice with resume-aware AI questions and get actionable feedback."
                              : "Practice regularly and use your reports to strengthen the skills that matter most."}
                        </p>
                        <Link
                          to={!resume ? "/resume" : "/interview"}
                          className="btn-neon mt-5 inline-flex px-5 py-2.5 text-sm"
                        >
                          {!resume ? "Manage resume →" : "Practice now →"}
                        </Link>
                      </div>
                      <div className="flex items-center gap-4">
                        <Ring
                          value={profilePercent}
                          size={108}
                          text={`${profilePercent}%`}
                        />
                        <div className="max-w-28 text-xs leading-relaxed text-white/50">
                          Profile & resume setup
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                  <GlassCard className="p-6">
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">
                      At a glance
                    </h2>
                    <div className="mt-5 space-y-4">
                      <MiniProgress
                        title="Profile readiness"
                        value={profilePercent}
                        color="bg-cyan-400"
                      />
                      <MiniProgress
                        title="Interview completion"
                        value={completedRate}
                        color="bg-emerald-400"
                      />
                      <MiniProgress
                        title="Average performance"
                        value={avgScore ?? 0}
                        color="bg-violet-400"
                        suffix={avgScore == null ? "No score" : undefined}
                      />
                    </div>
                  </GlassCard>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10">
                  <div
                    role="tablist"
                    aria-label="Dashboard sections"
                    className="flex flex-wrap gap-1"
                  >
                    {[
                      ["overview", "Overview"],
                      ["activity", "Activity"],
                      [
                        "notifications",
                        `Notifications${number(stats.unreadNotifications) ? ` (${number(stats.unreadNotifications)})` : ""}`,
                      ],
                    ].map(([key, title]) => (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={tab === key}
                        onClick={() => setTab(key)}
                        className={`relative px-4 py-3 text-sm font-medium transition ${tab === key ? "text-accent" : "text-white/50 hover:text-white"}`}
                      >
                        {title}
                        {tab === key && (
                          <motion.span
                            layoutId="dashboard-tab"
                            className="absolute inset-x-2 bottom-0 h-0.5 bg-accent"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                  {tab !== "overview" && (
                    <input
                      aria-label="Search dashboard items"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search activity or alerts…"
                      className="mb-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-accent/50 sm:w-64"
                    />
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {tab === "overview" && (
                    <motion.div
                      key="overview"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="mt-6 grid gap-6 lg:grid-cols-3"
                    >
                      <div className="space-y-6 lg:col-span-2">
                        <GlassCard className="p-6">
                          <SectionHeader
                            title="Skill performance"
                            subtitle="Based on your latest available assessment"
                          />
                          {skills.length ? (
                            <div className="mt-6 grid gap-5 sm:grid-cols-2">
                              {skills.map(([key, value], i) => (
                                <SkillRow
                                  key={key}
                                  name={label(key)}
                                  value={value}
                                  index={i}
                                />
                              ))}
                            </div>
                          ) : (
                            <Empty
                              icon="📊"
                              title="No skill analysis yet"
                              detail="Complete an interview to unlock your performance breakdown."
                              action="Start practicing"
                              to="/interview"
                            />
                          )}
                        </GlassCard>
                        <GlassCard className="p-6">
                          <SectionHeader
                            title="Latest interview"
                            subtitle="Your most recent interview session"
                          />
                          {latest ? (
                            <InterviewCard item={latest} />
                          ) : (
                            <Empty
                              icon="🎙️"
                              title="No interviews yet"
                              detail="Start your first mock interview to see activity here."
                              action="Start interview"
                              to="/interview"
                            />
                          )}
                        </GlassCard>
                        <GlassCard className="p-6">
                          <SectionHeader
                            title="Recent activity"
                            subtitle="Your interview journey"
                            action={
                              <button
                                type="button"
                                onClick={() => {
                                  setSearch("");
                                  setTab("activity");
                                }}
                                className="text-xs font-semibold text-accent hover:underline"
                              >
                                View all →
                              </button>
                            }
                          />
                          {timeline.length ? (
                            <div className="mt-5 space-y-3">
                              {timeline.slice(0, 4).map((item, index) => (
                                <ActivityRow
                                  key={item.id ?? index}
                                  item={item}
                                />
                              ))}
                            </div>
                          ) : (
                            <Empty
                              icon="🕒"
                              title="Nothing to show yet"
                              detail="Your interview activity will appear here."
                            />
                          )}
                        </GlassCard>
                      </div>
                      <div className="space-y-6">
                        <GlassCard className="p-6">
                          <SectionHeader
                            title="Your profile"
                            action={
                              <Link
                                to="/profile"
                                className="text-xs font-semibold text-accent hover:underline"
                              >
                                Edit →
                              </Link>
                            }
                          />
                          <div className="mt-5 flex items-center gap-3">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-accent to-blue-500 text-lg font-bold text-black">
                              {user.profile_picture_url ? (
                                <img
                                  src={user.profile_picture_url}
                                  alt="Profile"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                (user.full_name || "U")
                                  .split(/\s+/)
                                  .slice(0, 2)
                                  .map((part) => part[0])
                                  .join("")
                                  .toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold">
                                {user.full_name || "Candidate"}
                              </p>
                              <p className="truncate text-xs text-white/50">
                                {user.preferred_role ||
                                  "Add your preferred role"}
                              </p>
                            </div>
                          </div>
                          <div className="mt-5 space-y-3">
                            {[
                              ["Email", user.email],
                              ["College", user.college],
                              ["Branch", user.branch],
                              ["Graduation", user.graduation_year],
                            ].map(([key, value]) => (
                              <div
                                key={key}
                                className="flex items-start justify-between gap-3 border-b border-white/5 pb-2 text-xs"
                              >
                                <span className="shrink-0 text-white/45">
                                  {key}
                                </span>
                                <span className="break-all text-right text-white/80">
                                  {value || "Not set"}
                                </span>
                              </div>
                            ))}
                          </div>
                          {list(user.skills).length > 0 && (
                            <div className="mt-5 flex flex-wrap gap-1.5">
                              {user.skills.slice(0, 7).map((skill) => (
                                <span
                                  key={skill}
                                  className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-[11px] text-accent"
                                >
                                  {skill}
                                </span>
                              ))}
                              {user.skills.length > 7 && (
                                <span className="px-2 py-1 text-xs text-white/50">
                                  +{user.skills.length - 7}
                                </span>
                              )}
                            </div>
                          )}
                        </GlassCard>
                        <GlassCard className="p-6">
                          <SectionHeader
                            title="Current resume"
                            action={
                              <Link
                                to="/resume"
                                className="text-xs font-semibold text-accent hover:underline"
                              >
                                Manage →
                              </Link>
                            }
                          />
                          {resume ? (
                            <div className="mt-5">
                              <div className="flex items-center gap-3">
                                <span className="text-3xl">📄</span>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold">
                                    {resume.title ||
                                      resume.original_filename ||
                                      "My resume"}
                                  </p>
                                  <p className="mt-1 text-xs text-white/45">
                                    {resume.version
                                      ? `Version ${resume.version} · `
                                      : ""}
                                    {resume.file_size
                                      ? `${(number(resume.file_size) / 1024).toFixed(1)} KB`
                                      : "PDF resume"}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-5 flex gap-2">
                                <button
                                  type="button"
                                  onClick={openResume}
                                  className="rounded-lg border border-white/15 px-4 py-2 text-xs font-medium hover:bg-white/10"
                                >
                                  View resume
                                </button>
                                <Link
                                  to="/resume"
                                  className="rounded-lg bg-accent/10 px-4 py-2 text-xs font-medium text-accent hover:bg-accent/20"
                                >
                                  Replace
                                </Link>
                              </div>
                            </div>
                          ) : (
                            <Empty
                              icon="📄"
                              title="No resume uploaded"
                              detail="Upload a resume for personalized questions."
                              action="Upload resume"
                              to="/resume"
                            />
                          )}
                        </GlassCard>
                        <GlassCard className="p-6">
                          <SectionHeader title="Recent reports" />
                          {reports.length ? (
                            <div className="mt-4 space-y-3">
                              {reports.slice(0, 3).map((report, i) => (
                                <ReportRow
                                  key={report.id ?? i}
                                  report={report}
                                />
                              ))}
                            </div>
                          ) : (
                            <Empty
                              icon="📝"
                              title="No reports yet"
                              detail="Reports appear after completed interviews."
                            />
                          )}
                        </GlassCard>
                        <GlassCard className="p-6">
                          <SectionHeader title="Quick actions" />
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <QuickAction
                              to="/interview"
                              icon="🎤"
                              title="Mock interview"
                            />
                            <QuickAction
                              to="/resume"
                              icon="📄"
                              title="Manage resume"
                            />
                            <QuickAction
                              to="/profile"
                              icon="👤"
                              title="Edit profile"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setSearch("");
                                setTab("notifications");
                              }}
                              className={`${panel} p-4 text-left transition hover:border-accent/30 hover:bg-white/[0.07]`}
                            >
                              <span className="text-2xl">🔔</span>
                              <span className="mt-2 block text-xs font-medium">
                                Notifications
                              </span>
                            </button>
                          </div>
                        </GlassCard>
                      </div>
                    </motion.div>
                  )}
                  {tab === "activity" && (
                    <motion.div
                      key="activity"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]"
                    >
                      <GlassCard className="p-6">
                        <SectionHeader
                          title="Interview timeline"
                          subtitle={`${filteredTimeline.length} matching activities`}
                        />
                        {filteredTimeline.length ? (
                          <div className="mt-5 space-y-3">
                            {filteredTimeline.map((item, i) => (
                              <ActivityRow key={item.id ?? i} item={item} />
                            ))}
                          </div>
                        ) : (
                          <Empty
                            icon="🔎"
                            title="No matching activity"
                            detail="Try another search or start an interview."
                          />
                        )}
                      </GlassCard>
                      <GlassCard className="h-fit p-6">
                        <SectionHeader
                          title="Report history"
                          subtitle="Latest generated feedback"
                        />
                        {reports.length ? (
                          <div className="mt-5 space-y-3">
                            {reports.map((report, i) => (
                              <ReportRow key={report.id ?? i} report={report} />
                            ))}
                          </div>
                        ) : (
                          <Empty
                            icon="📑"
                            title="No reports yet"
                            detail="Finish a mock interview to generate feedback."
                          />
                        )}
                      </GlassCard>
                    </motion.div>
                  )}
                  {tab === "notifications" && (
                    <motion.div
                      key="notifications"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-6"
                    >
                      <GlassCard className="p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <SectionHeader
                            title="Notification center"
                            subtitle="Manage updates and reminders"
                          />
                          <button
                            type="button"
                            disabled={
                              !number(stats.unreadNotifications) ||
                              busyNotifications.includes("all")
                            }
                            onClick={markAllRead}
                            className="rounded-lg border border-accent/25 px-3 py-2 text-xs font-medium text-accent transition hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Mark all as read
                          </button>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-2">
                          {["all", "unread", "read"].map((key) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setNotificationFilter(key)}
                              className={`rounded-lg px-4 py-2 text-xs font-medium capitalize transition ${notificationFilter === key ? "bg-accent/15 text-accent" : "bg-white/5 text-white/50 hover:text-white"}`}
                            >
                              {key}
                            </button>
                          ))}
                        </div>
                        {filteredNotifications.length ? (
                          <div className="mt-5 space-y-3">
                            {filteredNotifications.map((n) => (
                              <NotificationRow
                                key={n.id}
                                item={n}
                                disabled={
                                  busyNotifications.includes(n.id) ||
                                  busyNotifications.includes("all")
                                }
                                onRead={() => markRead(n.id)}
                                onArchive={() => archive(n.id)}
                              />
                            ))}
                          </div>
                        ) : (
                          <Empty
                            icon="🔔"
                            title="You're all caught up"
                            detail="No notifications match your filters."
                          />
                        )}
                      </GlassCard>
                    </motion.div>
                  )}
                </AnimatePresence>
                <p className="mt-8 text-center text-xs text-white/30">
                  Metrics and reports reflect the data currently available in
                  your HireReady account.
                </p>
              </>
            ) : null}
          </div>
        </main>
      </PageTransition>
    </>
  );
}

function LoadingDashboard() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-20 w-2/3 rounded-2xl bg-white/10" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-white/5" />
        ))}
      </div>
      <div className="h-48 rounded-2xl bg-white/5" />
      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-72 rounded-2xl bg-white/5" />
        ))}
      </div>
    </div>
  );
}
function Metric({ icon, title, value, detail, accent }) {
  const accents = {
    cyan: "from-cyan-400/20 to-cyan-400/0",
    green: "from-emerald-400/20 to-emerald-400/0",
    purple: "from-violet-400/20 to-violet-400/0",
    pink: "from-pink-400/20 to-pink-400/0",
  };
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
      <GlassCard className="relative h-full overflow-hidden p-5">
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accents[accent]}`}
        />
        <div className="relative">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
              {title}
            </p>
            <span className="text-xl">{icon}</span>
          </div>
          <p className="mt-4 text-3xl font-bold tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-white/45">{detail}</p>
        </div>
      </GlassCard>
    </motion.div>
  );
}
function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-white/45">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
function Ring({ value, size = 108, text }) {
  const radius = 42,
    circumference = 2 * Math.PI * radius;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="rgba(255,255,255,.09)"
          strokeWidth="7"
          fill="none"
        />
        <motion.circle
          cx="50"
          cy="50"
          r={radius}
          stroke="#00F2FF"
          strokeLinecap="round"
          strokeWidth="7"
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset: circumference * (1 - clamp(value) / 100),
          }}
          transition={{ duration: 1.1 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xl font-bold">
        {text}
      </div>
    </div>
  );
}
function MiniProgress({ title, value, color, suffix }) {
  return (
    <div>
      <div className="mb-2 flex justify-between gap-3 text-xs">
        <span className="text-white/60">{title}</span>
        <span className="font-semibold text-white">
          {suffix || `${Math.round(clamp(value))}%`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clamp(value)}%` }}
          transition={{ duration: 0.8 }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}
function SkillRow({ name, value, index }) {
  const colors = [
    "bg-cyan-400",
    "bg-blue-400",
    "bg-violet-400",
    "bg-pink-400",
    "bg-emerald-400",
    "bg-amber-400",
  ];
  return (
    <MiniProgress
      title={name}
      value={value}
      color={colors[index % colors.length]}
    />
  );
}
function Empty({ icon, title, detail, action, to }) {
  return (
    <div className="flex flex-col items-center px-3 py-10 text-center">
      <span className="text-3xl">{icon}</span>
      <p className="mt-3 text-sm font-medium text-white/80">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-white/45">
        {detail}
      </p>
      {action && to && (
        <Link
          to={to}
          className="mt-4 rounded-lg border border-accent/30 px-4 py-2 text-xs font-semibold text-accent hover:bg-accent/10"
        >
          {action} →
        </Link>
      )}
    </div>
  );
}
function Badge({ status }) {
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusStyles[status] || "border-white/15 bg-white/5 text-white/60"}`}
    >
      {statusNames[status] || label(status)}
    </span>
  );
}
function InterviewCard({ item }) {
  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">
            {item.company || "Mock interview"}
          </p>
          <p className="mt-1 text-sm text-white/50">
            {item.role || "Interview practice"}
          </p>
        </div>
        <Badge status={item.status} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Stage", stageNames[item.stage] || label(item.stage)],
          [
            "Date",
            dateFmt(item.scheduled_at || item.completed_at || item.created_at),
          ],
          [
            "Score",
            item.score == null ? "—" : `${displayScore(item.score)}/100`,
          ],
          [
            "Duration",
            item.duration_minutes ? `${item.duration_minutes} min` : "—",
          ],
        ].map(([key, value]) => (
          <div key={key} className={`${panel} p-3`}>
            <p className="text-[11px] text-white/40">{key}</p>
            <p className="mt-1 break-words text-sm font-semibold">{value}</p>
          </div>
        ))}
      </div>
      {item.feedback && (
        <p className="mt-4 rounded-xl bg-white/5 p-4 text-sm leading-relaxed text-white/60">
          {item.feedback}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        {item.status === "in_progress" && (
          <Link
            to="/interview"
            className="rounded-lg bg-accent/15 px-4 py-2 text-xs font-semibold text-accent hover:bg-accent/25"
          >
            Continue interview →
          </Link>
        )}
        {item.meeting_link && (
          <a
            href={item.meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold hover:bg-white/10"
          >
            Open meeting ↗
          </a>
        )}
        <Link
          to="/interview"
          className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold hover:bg-white/10"
        >
          New practice session →
        </Link>
      </div>
    </div>
  );
}
function ActivityRow({ item }) {
  const date = item.scheduled_at || item.completed_at || item.created_at;
  return (
    <div className={`${panel} flex items-start gap-3 p-4`}>
      <span
        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.status === "completed" ? "bg-emerald-400" : "bg-cyan-400"}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm font-semibold">
            {item.company || "Mock interview"}
          </p>
          <Badge status={item.status} />
        </div>
        <p className="mt-1 text-xs text-white/50">
          {item.role || stageNames[item.stage] || "Interview"}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-white/40">
          <span>
            {dateFmt(date, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {item.score != null && (
            <span className="font-semibold text-accent">
              Score {displayScore(item.score)}/100
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
function ReportRow({ report }) {
  const values =
    report.scores && typeof report.scores === "object"
      ? Object.values(report.scores).map(Number).filter(Number.isFinite)
      : [];
  const average = values.length
    ? Math.round(values.reduce((sum, score) => sum + score, 0) / values.length)
    : null;
  return (
    <div className={`${panel} p-4`}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm font-semibold">
          {report.title || label(report.type) || "Interview report"}
        </p>
        {average != null && (
          <span className="shrink-0 text-xs font-semibold text-emerald-300">
            {average}/100
          </span>
        )}
      </div>
      <p className="mt-1 text-[11px] text-accent">{label(report.type)}</p>
      {report.summary && (
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-white/50">
          {report.summary}
        </p>
      )}
      <p className="mt-2 text-[11px] text-white/35">
        {dateFmt(report.created_at)}
      </p>
    </div>
  );
}
function NotificationRow({ item, onRead, onArchive, disabled }) {
  return (
    <div
      className={`rounded-xl border p-4 ${item.is_read ? "border-white/10 bg-white/[0.025]" : "border-accent/25 bg-accent/[0.055]"}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl">{notificationIcons[item.type] || "🔔"}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">
              {item.title || "Notification"}
            </p>
            {!item.is_read && (
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] text-accent">
                New
              </span>
            )}
            {item.priority === "urgent" && (
              <span className="text-[10px] font-semibold uppercase text-red-300">
                Urgent
              </span>
            )}
          </div>
          {item.message && (
            <p className="mt-1 text-xs leading-relaxed text-white/60">
              {item.message}
            </p>
          )}
          <p className="mt-2 text-[11px] text-white/35">
            {dateFmt(item.created_at, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {!item.is_read && (
            <button
              type="button"
              disabled={disabled}
              onClick={onRead}
              aria-label="Mark as read"
              title="Mark as read"
              className="rounded-lg border border-white/10 px-2 py-1 text-sm text-emerald-300 hover:bg-white/10 disabled:opacity-40"
            >
              ✓
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={onArchive}
            aria-label="Archive notification"
            title="Archive"
            className="rounded-lg border border-white/10 px-2 py-1 text-sm text-white/60 hover:bg-red-400/10 hover:text-red-300 disabled:opacity-40"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
function QuickAction({ to, icon, title }) {
  return (
    <Link
      to={to}
      className={`${panel} p-4 transition hover:border-accent/30 hover:bg-white/[0.07]`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="mt-2 block text-xs font-medium">{title}</span>
    </Link>
  );
}
