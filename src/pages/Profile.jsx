import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import PageTransition from "../components/ui/PageTransition";
import Navbar from "../components/ui/Navbar";
import GlassCard from "../components/ui/GlassCard";

const BASE = import.meta.env.VITE_API_URL || "/api";
const DEFAULTS = {
  full_name: "",
  email: "",
  college: "",
  branch: "",
  graduation_year: "",
  linkedin_url: "",
  github_url: "",
  profile_picture_url: "",
  skills: [],
  target_companies: [],
  preferred_role: "",
  email_notifications: { resume_submission: true, interview_invite: true },
  notification_preferences: { email: true, push: false },
};
const INPUT =
  "w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-all focus:border-cyan-400/60 focus:bg-white/[0.06] focus:ring-2 focus:ring-cyan-400/10 disabled:opacity-50";
const NAV = [
  { id: "overview", label: "Overview", icon: "◈" },
  { id: "personal", label: "Personal details", icon: "◎" },
  { id: "career", label: "Career & skills", icon: "◇" },
  { id: "preferences", label: "Preferences", icon: "⚙" },
];

function flattenSkills(value) {
  if (Array.isArray(value))
    return value.filter((v) => typeof v === "string" && v.trim());
  if (value && typeof value === "object")
    return Object.values(value)
      .flatMap((v) => (Array.isArray(v) ? v : []))
      .filter((v) => typeof v === "string" && v.trim());
  return [];
}
function unique(values) {
  return [...new Set(values.map((v) => String(v).trim()).filter(Boolean))];
}
function normalize(raw = {}) {
  return {
    ...DEFAULTS,
    ...raw,
    full_name: raw.full_name || "",
    email: raw.email || "",
    skills: unique(flattenSkills(raw.skills)),
    target_companies: unique(
      Array.isArray(raw.target_companies) ? raw.target_companies : [],
    ),
    email_notifications: {
      ...DEFAULTS.email_notifications,
      ...(raw.email_notifications && typeof raw.email_notifications === "object"
        ? raw.email_notifications
        : {}),
    },
    notification_preferences: {
      ...DEFAULTS.notification_preferences,
      ...(raw.notification_preferences &&
      typeof raw.notification_preferences === "object"
        ? raw.notification_preferences
        : {}),
    },
  };
}
function parseError(text, fallback) {
  try {
    const data = JSON.parse(text);
    return data.error?.message || data.error || data.message || fallback;
  } catch {
    return text?.slice(0, 160) || fallback;
  }
}
function Field({ label, hint, children, required }) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[.15em] text-white/45">
        {label}
        {required && <span className="text-cyan-300">*</span>}
      </span>
      {children}
      {hint && (
        <span className="mt-1.5 block text-xs text-white/30">{hint}</span>
      )}
    </label>
  );
}
function Icon({ name, className = "h-5 w-5" }) {
  const paths = {
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9L12 3Z" />
        <path d="m19 18 .6 1.4L21 20l-1.4.6L19 22l-.6-1.4L17 20l1.4-.6L19 18Z" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14m-6-6 6 6-6 6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    upload: (
      <>
        <path d="M12 16V3m-5 5 5-5 5 5" />
        <path d="M4 16v4h16v-4" />
      </>
    ),
    external: (
      <>
        <path d="M13 5h6v6m0-6-9 9" />
        <path d="M19 13v6H5V5h6" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  };
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.spark}
    </svg>
  );
}
function Action({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button",
  className = "",
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-45";
  const style =
    variant === "primary"
      ? "bg-cyan-300 text-[#06131b] hover:bg-cyan-200 shadow-[0_6px_24px_rgba(0,242,255,.12)]"
      : variant === "danger"
        ? "border border-red-400/20 bg-red-400/10 text-red-300 hover:bg-red-400/20"
        : "border border-white/10 bg-white/[0.05] text-white/75 hover:border-white/20 hover:bg-white/10 hover:text-white";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${style} ${className}`}
    >
      {children}
    </button>
  );
}
function Tags({ items, onChange, placeholder, color = "cyan" }) {
  const [value, setValue] = useState("");
  const palette =
    color === "violet"
      ? "border-violet-400/20 bg-violet-400/10 text-violet-200"
      : "border-cyan-300/20 bg-cyan-300/10 text-cyan-200";
  function add() {
    if (!value.trim()) return;
    onChange(unique([...items, value]));
    setValue("");
  }
  return (
    <div className="space-y-3">
      <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] p-3">
        {items.length ? (
          items.map((item) => (
            <span
              key={item}
              className={`inline-flex max-w-full items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium ${palette}`}
            >
              <span className="truncate">{item}</span>
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={() => onChange(items.filter((v) => v !== item))}
                className="text-white/50 hover:text-white"
              >
                ×
              </button>
            </span>
          ))
        ) : (
          <span className="text-xs text-white/30">Nothing added yet</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className={INPUT}
          placeholder={placeholder}
          maxLength={80}
        />
        <Action onClick={add} variant="secondary" disabled={!value.trim()}>
          Add
        </Action>
      </div>
    </div>
  );
}
function Toggle({ title, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 sm:p-5">
      <div>
        <p className="text-sm font-semibold text-white/90">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-white/40">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-label={title}
        aria-checked={!!checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${checked ? "bg-cyan-300" : "bg-white/20"}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-[#07131b] shadow-sm transition-transform ${checked ? "translate-x-2" : "-translate-x-3"}`}
        />
      </button>
    </div>
  );
}
function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.22em] text-cyan-300/75">
        {eyebrow}
      </p>
      <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
        {title}
      </h2>
      {description && (
        <p className="mt-2 text-sm leading-relaxed text-white/45">
          {description}
        </p>
      )}
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => normalize());
  const [initial, setInitial] = useState(() => normalize());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [imageBroken, setImageBroken] = useState(false);
  const [hasAccount, setHasAccount] = useState(true);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("hr_token");
    if (!token) {
      setHasAccount(false);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${BASE}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      if (res.status === 401 || res.status === 403) {
        setHasAccount(false);
        return;
      }
      let raw = {};
      if (res.ok) {
        const json = await res.json();
        raw = json.data?.profile || json.data || json.profile || {};
      } else if (res.status !== 404) {
        throw new Error(
          parseError(await res.text(), "Unable to load your profile."),
        );
      }
      // Candidate resume data is supplemental. It must never overwrite account settings.
      try {
        const candidateRes = await fetch(`${BASE}/resume/profile/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });
        if (candidateRes.ok) {
          const candidate = (await candidateRes.json()).data?.profile;
          if (candidate) {
            raw = {
              ...raw,
              full_name: raw.full_name || candidate.full_name || "",
              linkedin_url: raw.linkedin_url || candidate.linkedin_url || "",
              github_url: raw.github_url || candidate.github_url || "",
              skills: unique([
                ...flattenSkills(raw.skills),
                ...flattenSkills(candidate.skills),
              ]),
            };
          }
        }
      } catch (e) {
        if (e.name === "AbortError") throw e;
      }
      const clean = normalize(raw);
      setForm(clean);
      setInitial(clean);
      setImageBroken(false);
    } catch (e) {
      if (e.name !== "AbortError")
        setError(e.message || "Could not load profile.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setNotice("");
  };
  const updateNested = (key, field, value) =>
    update(key, { ...form[key], [field]: value });
  const changed = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initial),
    [form, initial],
  );
  const completionFields = [
    form.full_name,
    form.email,
    form.college,
    form.branch,
    form.graduation_year,
    form.preferred_role,
    form.linkedin_url,
    form.github_url,
    form.skills.length,
  ];
  const completion = Math.round(
    (completionFields.filter(Boolean).length / completionFields.length) * 100,
  );
  const initials = (form.full_name || "Candidate")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((v) => v[0])
    .join("")
    .toUpperCase();
  const missing = [
    !form.full_name && "Add your full name",
    !form.college && "Add your college",
    !form.preferred_role && "Choose a preferred role",
    !form.skills.length && "Add your key skills",
    !form.linkedin_url && "Add your LinkedIn",
  ].filter(Boolean);

  async function save() {
    const token = localStorage.getItem("hr_token");
    if (!token) {
      navigate("/login");
      return;
    }
    if (!form.full_name.trim()) {
      setActiveTab("personal");
      setError("Please enter your full name before saving.");
      return;
    }
    if (form.graduation_year && !/^\d{4}$/.test(String(form.graduation_year))) {
      setActiveTab("personal");
      setError("Graduation year must be a four-digit year.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    const fields = [
      "full_name",
      "college",
      "branch",
      "graduation_year",
      "linkedin_url",
      "github_url",
      "profile_picture_url",
      "skills",
      "target_companies",
      "preferred_role",
      "email_notifications",
      "notification_preferences",
    ];
    const payload = Object.fromEntries(fields.map((key) => [key, form[key]]));
    payload.graduation_year = form.graduation_year
      ? Number(form.graduation_year)
      : null;
    payload.profile_picture_url = form.profile_picture_url || null;
    try {
      const res = await fetch(`${BASE}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok)
        throw new Error(
          parseError(await res.text(), "Could not save profile."),
        );
      const json = await res.json().catch(() => ({}));
      const updated = normalize({
        ...form,
        ...(json.data?.profile || json.data || {}),
      });
      setForm(updated);
      setInitial(updated);
      setNotice("Your profile changes were saved successfully.");
    } catch (e) {
      setError(e.message || "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Navbar />
      <PageTransition>
        <main
          id="main"
          className="relative min-h-screen overflow-hidden bg-bg pb-32 pt-28 text-white sm:pt-32"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div className="absolute -left-40 top-0 h-[450px] w-[450px] rounded-full bg-cyan-400/[0.055] blur-[110px]" />
            <div className="absolute right-[-150px] top-64 h-[500px] w-[500px] rounded-full bg-violet-500/[0.06] blur-[110px]" />
            <div
              className="absolute inset-0 opacity-[.13]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px)",
                backgroundSize: "48px 48px",
                maskImage: "linear-gradient(to bottom,black,transparent 65%)",
              }}
            />
          </div>
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-white/35">
                <Link to="/dashboard" className="hover:text-cyan-300">
                  Dashboard
                </Link>
                <span>/</span>
                <span className="text-white/75">My profile</span>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1.5 text-[11px] font-semibold tracking-wide text-cyan-200">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                HIREREADY ACCOUNT
              </span>
            </div>
            {loading ? (
              <div className="grid min-h-[60vh] place-items-center">
                <div className="text-center">
                  <div className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
                  <p className="mt-4 text-sm text-white/45">
                    Loading your profile...
                  </p>
                </div>
              </div>
            ) : !hasAccount ? (
              <GlassCard className="mx-auto max-w-xl p-10 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-300">
                  <Icon name="user" className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold">
                  Sign in to manage your profile
                </h1>
                <p className="mt-3 text-sm text-white/50">
                  Your career details, skills and notification preferences are
                  linked to your account.
                </p>
                <Link
                  to="/login"
                  className="mt-6 inline-flex rounded-xl bg-cyan-300 px-6 py-3 text-sm font-semibold text-[#06131b]"
                >
                  Go to login
                </Link>
              </GlassCard>
            ) : (
              <>
                <motion.section
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative mb-7 overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.085] via-white/[0.035] to-cyan-300/[0.025] p-6 sm:p-8"
                >
                  <div className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full bg-cyan-300/[0.08] blur-3xl" />
                  <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-center">
                    <div className="flex min-w-0 items-center gap-5">
                      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-cyan-300/30 bg-gradient-to-br from-cyan-300/25 via-sky-400/10 to-violet-400/20 text-2xl font-extrabold text-cyan-100 shadow-[0_0_40px_rgba(0,242,255,.08)] sm:h-24 sm:w-24">
                        {form.profile_picture_url && !imageBroken ? (
                          <img
                            src={form.profile_picture_url}
                            alt="Profile"
                            className="h-full w-full object-cover"
                            onError={() => setImageBroken(true)}
                          />
                        ) : (
                          initials
                        )}
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#101923] bg-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[.2em] text-cyan-300/75">
                          Your career identity
                        </p>
                        <h1 className="break-words text-2xl font-bold tracking-tight sm:text-4xl">
                          {form.full_name || "Your Profile"}
                        </h1>
                        <p className="mt-2 text-sm text-white/50">
                          {[form.preferred_role, form.college]
                            .filter(Boolean)
                            .join(" · ") ||
                            "Shape your interview-ready profile"}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {form.branch && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55">
                              {form.branch}
                            </span>
                          )}
                          {form.graduation_year && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55">
                              Class of {form.graduation_year}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="w-full rounded-2xl border border-white/10 bg-[#07121b]/60 p-4 md:w-56">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/50">
                          Profile strength
                        </span>
                        <span className="text-lg font-bold text-cyan-200">
                          {completion}%
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${completion}%` }}
                          transition={{ duration: 0.8 }}
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400"
                        />
                      </div>
                      <p className="mt-2 text-[11px] text-white/35">
                        Based on 9 profile details
                      </p>
                    </div>
                  </div>
                </motion.section>
                <div className="grid gap-6 lg:grid-cols-[245px_minmax(0,1fr)]">
                  <aside className="lg:sticky lg:top-28 lg:self-start">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-2">
                      <nav
                        aria-label="Profile sections"
                        className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1"
                      >
                        {NAV.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveTab(item.id);
                              setError("");
                            }}
                            aria-current={
                              activeTab === item.id ? "page" : undefined
                            }
                            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold transition-all sm:text-sm ${activeTab === item.id ? "border border-cyan-300/15 bg-cyan-300/10 text-cyan-200" : "border border-transparent text-white/50 hover:bg-white/5 hover:text-white"}`}
                          >
                            <span className="text-lg">{item.icon}</span>
                            {item.label}
                          </button>
                        ))}
                      </nav>
                    </div>
                    <div className="mt-4 hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 lg:block">
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-white/80">
                        <Icon
                          name="shield"
                          className="h-4 w-4 text-emerald-300"
                        />
                        Your information
                      </div>
                      <p className="text-xs leading-relaxed text-white/40">
                        Your changes are saved to your HireReady account. Review
                        your details before starting an interview.
                      </p>
                    </div>
                  </aside>
                  <div className="min-w-0">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                      >
                        {activeTab === "overview" && (
                          <div className="space-y-6">
                            <GlassCard className="p-6 sm:p-8">
                              <SectionHeading
                                eyebrow="At a glance"
                                title="Your interview-ready profile"
                                description="Keep your profile current so HireReady can understand your career goals."
                              />
                              <div className="grid gap-3 sm:grid-cols-3">
                                {[
                                  {
                                    label: "Skills added",
                                    value: form.skills.length,
                                    icon: "spark",
                                  },
                                  {
                                    label: "Target companies",
                                    value: form.target_companies.length,
                                    icon: "briefcase",
                                  },
                                  {
                                    label: "Profile completed",
                                    value: `${completion}%`,
                                    icon: "user",
                                  },
                                ].map((stat) => (
                                  <div
                                    key={stat.label}
                                    className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5"
                                  >
                                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-300">
                                      <Icon name={stat.icon} />
                                    </div>
                                    <p className="text-2xl font-bold">
                                      {stat.value}
                                    </p>
                                    <p className="mt-1 text-xs text-white/45">
                                      {stat.label}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </GlassCard>
                            <GlassCard className="p-6 sm:p-8">
                              <SectionHeading
                                eyebrow="Next steps"
                                title="Make your profile stand out"
                                description="Complete these details to help personalize your interview experience."
                              />
                              {missing.length ? (
                                <div className="space-y-2">
                                  {missing.map((item) => (
                                    <div
                                      key={item}
                                      className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3"
                                    >
                                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-300/25 bg-amber-300/10 text-xs text-amber-300">
                                        !
                                      </span>
                                      <span className="flex-1 text-sm text-white/65">
                                        {item}
                                      </span>
                                      <button
                                        onClick={() =>
                                          setActiveTab(
                                            item.includes("skill") ||
                                              item.includes("role")
                                              ? "career"
                                              : "personal",
                                          )
                                        }
                                        className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                                      >
                                        Update →
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/5 p-4 text-sm text-emerald-200">
                                  Great work! Your key profile details are
                                  complete.
                                </div>
                              )}
                            </GlassCard>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <Link
                                to="/resume"
                                className="group flex items-center justify-between rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-5 transition hover:bg-cyan-300/10"
                              >
                                <div>
                                  <p className="font-semibold">
                                    Analyze your resume
                                  </p>
                                  <p className="mt-1 text-xs text-white/45">
                                    Get resume-aware insights
                                  </p>
                                </div>
                                <Icon
                                  name="arrow"
                                  className="h-5 w-5 text-cyan-300 transition group-hover:translate-x-1"
                                />
                              </Link>
                              <Link
                                to="/interview"
                                className="group flex items-center justify-between rounded-2xl border border-violet-300/15 bg-violet-300/[0.06] p-5 transition hover:bg-violet-300/10"
                              >
                                <div>
                                  <p className="font-semibold">
                                    Practice an interview
                                  </p>
                                  <p className="mt-1 text-xs text-white/45">
                                    Build confidence with AI
                                  </p>
                                </div>
                                <Icon
                                  name="arrow"
                                  className="h-5 w-5 text-violet-300 transition group-hover:translate-x-1"
                                />
                              </Link>
                            </div>
                          </div>
                        )}
                        {activeTab === "personal" && (
                          <GlassCard className="p-6 sm:p-8">
                            <SectionHeading
                              eyebrow="About you"
                              title="Personal information"
                              description="Your basic details and professional links."
                            />
                            <div className="grid gap-5 sm:grid-cols-2">
                              <Field label="Full name" required>
                                <input
                                  className={INPUT}
                                  value={form.full_name}
                                  maxLength={120}
                                  onChange={(e) =>
                                    update("full_name", e.target.value)
                                  }
                                  placeholder="Your full name"
                                />
                              </Field>
                              <Field
                                label="Email address"
                                hint="Email is managed by your account and cannot be changed here."
                              >
                                <input
                                  className={`${INPUT} cursor-not-allowed`}
                                  value={form.email}
                                  readOnly
                                  placeholder="Your account email"
                                />
                              </Field>
                              <Field label="College / university">
                                <input
                                  className={INPUT}
                                  value={form.college || ""}
                                  onChange={(e) =>
                                    update("college", e.target.value)
                                  }
                                  placeholder="Your institution"
                                />
                              </Field>
                              <Field label="Branch / specialization">
                                <input
                                  className={INPUT}
                                  value={form.branch || ""}
                                  onChange={(e) =>
                                    update("branch", e.target.value)
                                  }
                                  placeholder="Computer Science & Engineering"
                                />
                              </Field>
                              <Field label="Graduation year">
                                <input
                                  className={INPUT}
                                  type="number"
                                  min="1950"
                                  max="2100"
                                  value={form.graduation_year ?? ""}
                                  onChange={(e) =>
                                    update("graduation_year", e.target.value)
                                  }
                                  placeholder="2028"
                                />
                              </Field>
                              <Field
                                label="Profile photo URL"
                                hint="Paste a publicly accessible image URL."
                              >
                                <input
                                  className={INPUT}
                                  type="url"
                                  value={form.profile_picture_url || ""}
                                  onChange={(e) => {
                                    update(
                                      "profile_picture_url",
                                      e.target.value,
                                    );
                                    setImageBroken(false);
                                  }}
                                  placeholder="https://..."
                                />
                              </Field>
                              <Field label="LinkedIn profile">
                                <input
                                  className={INPUT}
                                  type="url"
                                  value={form.linkedin_url || ""}
                                  onChange={(e) =>
                                    update("linkedin_url", e.target.value)
                                  }
                                  placeholder="https://www.linkedin.com/in/..."
                                />
                              </Field>
                              <Field label="GitHub profile">
                                <input
                                  className={INPUT}
                                  type="url"
                                  value={form.github_url || ""}
                                  onChange={(e) =>
                                    update("github_url", e.target.value)
                                  }
                                  placeholder="https://github.com/..."
                                />
                              </Field>
                            </div>
                            <div className="mt-6 flex flex-wrap gap-3">
                              {[
                                { name: "LinkedIn", url: form.linkedin_url },
                                { name: "GitHub", url: form.github_url },
                              ]
                                .filter((link) =>
                                  /^https?:\/\//i.test(link.url || ""),
                                )
                                .map((link) => (
                                  <a
                                    key={link.name}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/65 hover:border-cyan-300/30 hover:text-cyan-300"
                                  >
                                    View {link.name}
                                    <Icon
                                      name="external"
                                      className="h-3.5 w-3.5"
                                    />
                                  </a>
                                ))}
                            </div>
                          </GlassCard>
                        )}
                        {activeTab === "career" && (
                          <div className="space-y-6">
                            <GlassCard className="p-6 sm:p-8">
                              <SectionHeading
                                eyebrow="Your ambitions"
                                title="Career preferences"
                                description="Define the opportunities you are preparing for."
                              />
                              <Field label="Preferred role">
                                <input
                                  className={INPUT}
                                  value={form.preferred_role || ""}
                                  onChange={(e) =>
                                    update("preferred_role", e.target.value)
                                  }
                                  placeholder="e.g. Software Development Engineer"
                                />
                              </Field>
                              <div className="mt-7">
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.15em] text-white/45">
                                  Target companies{" "}
                                  <span className="ml-1 text-white/25">
                                    ({form.target_companies.length})
                                  </span>
                                </p>
                                <Tags
                                  items={form.target_companies}
                                  onChange={(v) =>
                                    update("target_companies", v)
                                  }
                                  placeholder="Add a company and press Enter"
                                  color="violet"
                                />
                              </div>
                            </GlassCard>
                            <GlassCard className="p-6 sm:p-8">
                              <SectionHeading
                                eyebrow="Your toolkit"
                                title="Skills & technologies"
                                description="Highlight the skills that reflect your current strengths."
                              />
                              <Tags
                                items={form.skills}
                                onChange={(v) => update("skills", v)}
                                placeholder="e.g. React, C++, PostgreSQL"
                              />
                              <p className="mt-4 text-xs text-white/35">
                                Tip: Add individual skills rather than a
                                comma-separated list.
                              </p>
                            </GlassCard>
                          </div>
                        )}
                        {activeTab === "preferences" && (
                          <GlassCard className="p-6 sm:p-8">
                            <SectionHeading
                              eyebrow="Stay informed"
                              title="Notification preferences"
                              description="Choose which updates you want to receive."
                            />
                            <div className="space-y-3">
                              <Toggle
                                title="Resume submission emails"
                                description="Email updates about resume submissions."
                                checked={
                                  form.email_notifications?.resume_submission
                                }
                                onChange={(v) =>
                                  updateNested(
                                    "email_notifications",
                                    "resume_submission",
                                    v,
                                  )
                                }
                              />
                              <Toggle
                                title="Interview invitation emails"
                                description="Get notified about interview invitations."
                                checked={
                                  form.email_notifications?.interview_invite
                                }
                                onChange={(v) =>
                                  updateNested(
                                    "email_notifications",
                                    "interview_invite",
                                    v,
                                  )
                                }
                              />
                              <Toggle
                                title="Email notifications"
                                description="Enable email as a notification channel."
                                checked={form.notification_preferences?.email}
                                onChange={(v) =>
                                  updateNested(
                                    "notification_preferences",
                                    "email",
                                    v,
                                  )
                                }
                              />
                              <Toggle
                                title="Push notifications"
                                description="Allow browser push notifications where supported."
                                checked={form.notification_preferences?.push}
                                onChange={(v) =>
                                  updateNested(
                                    "notification_preferences",
                                    "push",
                                    v,
                                  )
                                }
                              />
                            </div>
                            <p className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 text-xs leading-relaxed text-white/40">
                              These preferences are saved to your account.
                              Actual delivery depends on your application's
                              notification services and browser permissions.
                            </p>
                          </GlassCard>
                        )}
                      </motion.div>
                    </AnimatePresence>
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          role="alert"
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="mt-5 rounded-xl border border-red-400/25 bg-red-400/[0.08] px-4 py-3 text-sm text-red-200"
                        >
                          {error}
                        </motion.div>
                      )}
                      {notice && (
                        <motion.div
                          role="status"
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-3 text-sm text-emerald-200"
                        >
                          <Icon name="check" className="h-4 w-4" />
                          {notice}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:flex-row sm:items-center sm:p-5">
                      <div>
                        <p className="text-sm font-semibold text-white/80">
                          {changed
                            ? "You have unsaved changes"
                            : "Your profile is up to date"}
                        </p>
                        <p className="mt-1 text-xs text-white/35">
                          {changed
                            ? "Save to keep your latest details."
                            : "Make edits anytime to keep your profile current."}
                        </p>
                      </div>
                      <div className="flex w-full gap-2 sm:w-auto">
                        <Action
                          variant="secondary"
                          onClick={() => {
                            setForm(normalize(initial));
                            setError("");
                            setNotice("");
                            setImageBroken(false);
                          }}
                          disabled={!changed || saving}
                          className="flex-1 sm:flex-none"
                        >
                          Discard
                        </Action>
                        <Action
                          onClick={save}
                          disabled={!changed || saving}
                          className="flex-1 sm:flex-none"
                        >
                          {saving ? (
                            <>
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#06131b]/25 border-t-[#06131b]" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Icon name="check" className="h-4 w-4" />
                              Save changes
                            </>
                          )}
                        </Action>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </PageTransition>
    </>
  );
}
