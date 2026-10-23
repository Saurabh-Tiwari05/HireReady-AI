import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const BASE = import.meta.env.VITE_API_URL || "/api";
const CATEGORIES = [
  { key: "technical", label: "Technical skills", color: "#22d3ee" },
  { key: "frameworks", label: "Frameworks", color: "#60a5fa" },
  { key: "tools", label: "Tools & platforms", color: "#a78bfa" },
  { key: "languages", label: "Programming languages", color: "#f472b6" },
  { key: "soft", label: "Soft skills", color: "#34d399" },
];
const TABS = [
  { id: "personal", label: "Overview", icon: "◈" },
  { id: "experience", label: "Experience", icon: "▤" },
  { id: "education", label: "Education", icon: "▥" },
  { id: "skills", label: "Skills", icon: "✳" },
  { id: "projects", label: "Projects", icon: "◇" },
  { id: "analysis", label: "AI insights", icon: "✦" },
];
const cx = (...parts) => parts.filter(Boolean).join(" ");
const inputClass =
  "w-full min-w-0 rounded-xl border border-white/10 bg-[#111E2B] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60";
const blankProfile = () => ({
  personal: {
    fullName: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
    portfolio: "",
  },
  summary: "",
  experience: [],
  education: [],
  skills: Object.fromEntries(CATEGORIES.map((c) => [c.key, []])),
  projects: [],
  certifications: [],
  languages: [],
  analysis: {},
});
const toForm = (profile) => ({
  ...blankProfile(),
  personal: {
    fullName: profile?.full_name || "",
    email: profile?.email || "",
    phone: profile?.phone || "",
    location: profile?.location || "",
    linkedin: profile?.linkedin_url || "",
    github: profile?.github_url || "",
    portfolio: profile?.portfolio_url || "",
  },
  summary: profile?.summary || "",
  experience: Array.isArray(profile?.experience) ? profile.experience : [],
  education: Array.isArray(profile?.education) ? profile.education : [],
  skills: {
    ...blankProfile().skills,
    ...(profile?.skills &&
    typeof profile.skills === "object" &&
    !Array.isArray(profile.skills)
      ? profile.skills
      : {}),
  },
  projects: Array.isArray(profile?.projects) ? profile.projects : [],
  certifications: Array.isArray(profile?.certifications)
    ? profile.certifications
    : [],
  languages: Array.isArray(profile?.languages) ? profile.languages : [],
  analysis: profile?.analysis || {},
});

function Section({ title, subtitle, right, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0C1623]/90 shadow-[0_16px_50px_rgba(0,0,0,.12)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-5 sm:px-7">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          )}
        </div>
        {right}
      </div>
      <div className="p-5 sm:p-7">{children}</div>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  type = "text",
  span,
  multiline,
  rows = 3,
}) {
  return (
    <label className={cx("block min-w-0", span && "md:col-span-2")}>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-slate-400">
        {label}
      </span>
      {multiline ? (
        <textarea
          rows={rows}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className={cx(inputClass, "resize-y")}
        />
      ) : (
        <input
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className={inputClass}
        />
      )}
    </label>
  );
}
function Action({
  children,
  onClick,
  primary = false,
  disabled = false,
  danger = false,
  className = "",
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        primary
          ? "border-cyan-400 bg-cyan-400 text-[#06151C] hover:bg-cyan-300"
          : danger
            ? "border-rose-400/20 bg-rose-400/[0.06] text-rose-300 hover:bg-rose-400/10"
            : "border-white/10 bg-white/[0.05] text-slate-200 hover:bg-white/10",
        className,
      )}
    >
      {children}
    </button>
  );
}
function TagInput({ onAdd, disabled, placeholder = "Add item..." }) {
  const [text, setText] = useState("");
  const add = () => {
    const value = text.trim();
    if (!value) return;
    onAdd(value);
    setText("");
  };
  return (
    <div className="flex min-w-[165px] flex-1 gap-2 sm:flex-none">
      <input
        aria-label={placeholder}
        className={cx(inputClass, "min-w-0 flex-1 py-2 sm:w-40")}
        placeholder={placeholder}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
      />
      <Action disabled={disabled || !text.trim()} onClick={add}>
        +
      </Action>
    </div>
  );
}
function Tags({
  items = [],
  onChange,
  editable,
  color = "#22d3ee",
  placeholder,
}) {
  const values = Array.isArray(items) ? items : [];
  const add = (value) => {
    if (
      values.some((item) => String(item).toLowerCase() === value.toLowerCase())
    )
      return;
    onChange([...values, value]);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {values.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className="inline-flex max-w-full items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium"
          style={{
            color,
            borderColor: `${color}40`,
            backgroundColor: `${color}10`,
          }}
        >
          <span className="break-words">{String(item)}</span>
          {editable && (
            <button
              type="button"
              aria-label={`Remove ${item}`}
              onClick={() => onChange(values.filter((_, i) => i !== index))}
              className="text-base leading-none opacity-70 hover:opacity-100"
            >
              ×
            </button>
          )}
        </span>
      ))}
      {editable && <TagInput placeholder={placeholder} onAdd={add} />}
      {!editable && !values.length && (
        <span className="text-sm text-slate-500">Nothing added yet</span>
      )}
    </div>
  );
}
function Repeater({
  title,
  subtitle,
  data,
  editable,
  limit,
  empty,
  addLabel,
  onAdd,
  onRemove,
  render,
}) {
  return (
    <Section
      title={title}
      subtitle={subtitle}
      right={
        <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
          {data.length} entries
        </span>
      }
    >
      <div className="space-y-4">
        {!data.length && (
          <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-10 text-center">
            <p className="text-sm font-medium text-slate-200">{empty}</p>
            <p className="mt-1 text-xs text-slate-500">
              You can add or edit entries here.
            </p>
          </div>
        )}
        {data.map((item, index) => (
          <motion.div
            key={item.id || index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.09] bg-white/[0.025] p-4 sm:p-5"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-sm font-semibold text-cyan-300">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-sm font-medium text-slate-200">
                  {item.title ||
                    item.name ||
                    item.degree ||
                    `Entry ${index + 1}`}
                </span>
              </div>
              {editable && (
                <Action danger onClick={() => onRemove(index)}>
                  Remove
                </Action>
              )}
            </div>
            {render(item, index)}
          </motion.div>
        ))}
        {editable && data.length < limit && (
          <button
            type="button"
            onClick={onAdd}
            className="w-full rounded-xl border border-dashed border-cyan-400/30 bg-cyan-400/[0.035] px-5 py-4 text-sm font-semibold text-cyan-300 transition hover:border-cyan-400/60 hover:bg-cyan-400/[0.08]"
          >
            ＋ {addLabel}
          </button>
        )}
      </div>
    </Section>
  );
}
function InsightList({ title, items, color, symbol }) {
  const values = Array.isArray(items) ? items : [];
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
      <div className="mb-4 flex items-center gap-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ color, backgroundColor: `${color}15` }}
        >
          {symbol}
        </span>
        <h4 className="font-semibold text-white">{title}</h4>
        <span className="ml-auto text-xs text-slate-500">{values.length}</span>
      </div>
      {values.length ? (
        <div className="flex flex-wrap gap-2">
          {values.map((item, i) => (
            <span
              key={i}
              className="rounded-lg border px-3 py-2 text-xs leading-5"
              style={{
                color,
                borderColor: `${color}35`,
                backgroundColor: `${color}0D`,
              }}
            >
              {String(item)}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No insights available</p>
      )}
    </div>
  );
}

export default function CandidateProfileReview({
  profile,
  onSave,
  onCancel,
  editable = true,
}) {
  const [formData, setFormData] = useState(() =>
    profile ? toForm(profile) : null,
  );
  const [activeTab, setActiveTab] = useState("personal");
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(Boolean(profile?.is_verified));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData(toForm(profile));
      setVerified(Boolean(profile.is_verified));
      setDirty(false);
    }
  }, [profile]);

  const change = (updater) => {
    setFormData((prev) => updater(prev));
    setDirty(true);
    setError("");
    setSuccess("");
  };
  const setPersonal = (key, value) =>
    change((prev) => ({
      ...prev,
      personal: { ...prev.personal, [key]: value },
    }));
  const setSummary = (value) => change((prev) => ({ ...prev, summary: value }));
  const update = (section, index, key, value) =>
    change((prev) => ({
      ...prev,
      [section]: prev[section].map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    }));
  const add = (section, item) =>
    change((prev) => ({ ...prev, [section]: [...prev[section], item] }));
  const remove = (section, index) =>
    change((prev) => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index),
    }));
  const updateSkills = (key, values) =>
    change((prev) => ({ ...prev, skills: { ...prev.skills, [key]: values } }));

  const request = async (path, method, body) => {
    const token = localStorage.getItem("hr_token");
    const response = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    let result;
    try {
      result = await response.json();
    } catch {
      result = {};
    }
    if (!response.ok)
      throw new Error(
        result.error || result.message || `Request failed (${response.status})`,
      );
    if (!result?.data?.profile)
      throw new Error("Server did not return an updated profile.");
    return result.data.profile;
  };

  const handleSave = async () => {
    if (!editable || saving || verifying) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await request("/resume/profile/me", "PUT", formData);
      setFormData(toForm(updated));
      setVerified(Boolean(updated.is_verified));
      setDirty(false);
      setSuccess("Your profile changes were saved.");
      onSave?.(updated);
    } catch (err) {
      setError(`Could not save profile: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    if (!editable || saving || verifying) return;
    setVerifying(true);
    setError("");
    setSuccess("");
    try {
      // Save edits first so verification applies to the reviewed version.
      if (dirty) {
        const updated = await request("/resume/profile/me", "PUT", formData);
        setFormData(toForm(updated));
        setDirty(false);
      }
      const updated = await request("/resume/profile/me/verify", "PUT");
      setFormData(toForm(updated));
      setVerified(Boolean(updated.is_verified));
      setDirty(false);
      setSuccess("Profile verified successfully.");
      onSave?.(updated);
    } catch (err) {
      setError(`Could not verify profile: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const totalSkills = useMemo(
    () =>
      formData
        ? CATEGORIES.reduce(
            (sum, cat) =>
              sum +
              (Array.isArray(formData.skills?.[cat.key])
                ? formData.skills[cat.key].length
                : 0),
            0,
          )
        : 0,
    [formData],
  );

  if (!formData)
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-slate-300">
        <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        Loading candidate profile...
      </div>
    );

  const field = (section, index, key, label, opts = {}) => (
    <Field
      key={key}
      label={label}
      value={formData[section][index][key]}
      onChange={(v) => update(section, index, key, v)}
      disabled={!editable}
      {...opts}
    />
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">
      <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[#0C1623] px-6 py-7 sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full bg-cyan-400/[0.08] blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.16em] text-cyan-300">
              ✦ Step 03 · Profile review
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Make your profile interview-ready
              <span className="text-cyan-400">.</span>
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Review the details extracted from your resume. Correct anything
              missing before starting your AI interview.
            </p>
          </div>
          <div
            className={cx(
              "rounded-xl border px-4 py-2 text-xs font-semibold",
              verified
                ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                : "border-amber-400/25 bg-amber-400/10 text-amber-300",
            )}
          >
            {verified ? "✓ Verified" : "◷ Review required"}
          </div>
        </div>
        <div className="relative mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Experience", formData.experience.length],
            ["Education", formData.education.length],
            ["Skills", totalSkills],
            ["Projects", formData.projects.length],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-4"
            >
              <p className="text-2xl font-semibold text-white">{value}</p>
              <p className="mt-1 text-xs text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {(error || success) && (
        <div
          role={error ? "alert" : "status"}
          className={cx(
            "rounded-xl border px-4 py-3 text-sm",
            error
              ? "border-rose-400/25 bg-rose-400/[0.08] text-rose-300"
              : "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300",
          )}
        >
          {error || success}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#0C1623]/90 p-2">
        {TABS.map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cx(
              "inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition",
              activeTab === tab.id
                ? "bg-cyan-400 text-[#06151C] shadow-[0_5px_22px_rgba(34,211,238,.16)]"
                : "text-slate-400 hover:bg-white/5 hover:text-white",
            )}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === "personal" && (
            <div className="space-y-5">
              <Section
                title="Personal information"
                subtitle="Basic details and professional links"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ["fullName", "Full name"],
                    ["email", "Email", "email"],
                    ["phone", "Phone", "tel"],
                    ["location", "Location"],
                    ["linkedin", "LinkedIn profile", "url"],
                    ["github", "GitHub profile", "url"],
                    ["portfolio", "Portfolio website", "url"],
                  ].map(([key, label, type]) => (
                    <Field
                      key={key}
                      label={label}
                      type={type || "text"}
                      span={key === "fullName"}
                      value={formData.personal[key]}
                      disabled={!editable}
                      onChange={(value) => setPersonal(key, value)}
                      placeholder={`Enter ${label.toLowerCase()}`}
                    />
                  ))}
                </div>
              </Section>
              <Section
                title="Professional summary"
                subtitle="A quick introduction to your background"
              >
                <Field
                  label="About you"
                  multiline
                  rows={5}
                  value={formData.summary}
                  disabled={!editable}
                  onChange={setSummary}
                  placeholder="Write a short summary of your background, strengths, and goals..."
                />
              </Section>
            </div>
          )}

          {activeTab === "experience" && (
            <Repeater
              title="Work experience"
              subtitle="Internships, jobs, and relevant experience"
              data={formData.experience}
              editable={editable}
              limit={10}
              empty="No work experience added"
              addLabel="Add experience"
              onAdd={() =>
                add("experience", {
                  title: "",
                  company: "",
                  location: "",
                  startDate: "",
                  endDate: "",
                  description: "",
                  technologies: [],
                  achievements: [],
                })
              }
              onRemove={(i) => remove("experience", i)}
              render={(exp, i) => (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {field("experience", i, "title", "Job title", {
                      placeholder: "e.g. Software Developer Intern",
                    })}
                    {field("experience", i, "company", "Company", {
                      placeholder: "Company name",
                    })}
                    {field("experience", i, "location", "Location")}
                    {field("experience", i, "startDate", "Start date", {
                      placeholder: "YYYY-MM",
                    })}
                    {field("experience", i, "endDate", "End date", {
                      placeholder: "YYYY-MM or Present",
                    })}
                  </div>
                  {field("experience", i, "description", "Description", {
                    multiline: true,
                  })}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Technologies
                    </p>
                    <Tags
                      items={exp.technologies}
                      editable={editable}
                      onChange={(v) =>
                        update("experience", i, "technologies", v)
                      }
                      placeholder="Add technology"
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Achievements
                    </p>
                    {(exp.achievements || []).map((a, j) => (
                      <div key={j} className="mb-2 flex gap-2">
                        <input
                          className={inputClass}
                          value={a}
                          disabled={!editable}
                          onChange={(e) =>
                            update(
                              "experience",
                              i,
                              "achievements",
                              exp.achievements.map((v, k) =>
                                j === k ? e.target.value : v,
                              ),
                            )
                          }
                        />
                        {editable && (
                          <Action
                            danger
                            onClick={() =>
                              update(
                                "experience",
                                i,
                                "achievements",
                                exp.achievements.filter((_, k) => k !== j),
                              )
                            }
                          >
                            ×
                          </Action>
                        )}
                      </div>
                    ))}
                    {editable && (
                      <Action
                        onClick={() =>
                          update("experience", i, "achievements", [
                            ...(exp.achievements || []),
                            "",
                          ])
                        }
                      >
                        ＋ Add achievement
                      </Action>
                    )}
                  </div>
                </div>
              )}
            />
          )}

          {activeTab === "education" && (
            <Repeater
              title="Education"
              subtitle="Degrees, qualifications, and academic achievements"
              data={formData.education}
              editable={editable}
              limit={5}
              empty="No education added"
              addLabel="Add education"
              onAdd={() =>
                add("education", {
                  degree: "",
                  field: "",
                  institution: "",
                  location: "",
                  graduationYear: "",
                  gpa: "",
                  honors: [],
                })
              }
              onRemove={(i) => remove("education", i)}
              render={(edu, i) => (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {field("education", i, "degree", "Degree")}
                    {field("education", i, "field", "Field of study")}
                    {field("education", i, "institution", "Institution", {
                      span: true,
                    })}
                    {field("education", i, "location", "Location")}
                    {field("education", i, "graduationYear", "Graduation year")}
                    {field("education", i, "gpa", "GPA / CGPA")}
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Honors & awards
                    </p>
                    <Tags
                      items={edu.honors}
                      editable={editable}
                      onChange={(v) => update("education", i, "honors", v)}
                      color="#a78bfa"
                      placeholder="Add honor"
                    />
                  </div>
                </div>
              )}
            />
          )}

          {activeTab === "skills" && (
            <Section
              title="Skills inventory"
              subtitle="Organized by category for a clearer interview profile"
            >
              <div className="grid gap-4 lg:grid-cols-2">
                {CATEGORIES.map((cat) => (
                  <div
                    key={cat.key}
                    className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <h4 className="font-semibold text-white">
                          {cat.label}
                        </h4>
                      </div>
                      <span className="rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-400">
                        {Array.isArray(formData.skills[cat.key])
                          ? formData.skills[cat.key].length
                          : 0}
                      </span>
                    </div>
                    <Tags
                      items={formData.skills[cat.key]}
                      onChange={(v) => updateSkills(cat.key, v)}
                      editable={editable}
                      color={cat.color}
                      placeholder="Add skill"
                    />
                  </div>
                ))}
              </div>
            </Section>
          )}

          {activeTab === "projects" && (
            <Repeater
              title="Projects"
              subtitle="Showcase the work you want to discuss in interviews"
              data={formData.projects}
              editable={editable}
              limit={10}
              empty="No projects added"
              addLabel="Add project"
              onAdd={() =>
                add("projects", {
                  name: "",
                  description: "",
                  technologies: [],
                  url: "",
                  role: "",
                })
              }
              onRemove={(i) => remove("projects", i)}
              render={(proj, i) => (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {field("projects", i, "name", "Project name")}
                    {field("projects", i, "url", "Project URL", {
                      type: "url",
                    })}
                    {field("projects", i, "role", "Your role", { span: true })}
                  </div>
                  {field("projects", i, "description", "Project description", {
                    multiline: true,
                    rows: 4,
                  })}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Tech stack
                    </p>
                    <Tags
                      items={proj.technologies}
                      editable={editable}
                      onChange={(v) => update("projects", i, "technologies", v)}
                      placeholder="Add technology"
                    />
                  </div>
                </div>
              )}
            />
          )}

          {activeTab === "analysis" && (
            <div className="space-y-5">
              <Section
                title="AI resume insights"
                subtitle="Insights generated from your resume — not an interview score"
              >
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    [
                      "Seniority level",
                      formData.analysis.seniorityLevel ?? "Not available",
                      "#60a5fa",
                    ],
                    [
                      "Primary role",
                      formData.analysis.primaryRole ?? "Not available",
                      "#a78bfa",
                    ],
                    [
                      "Total experience",
                      `${formData.analysis.totalYearsExperience ?? 0} years`,
                      "#34d399",
                    ],
                  ].map(([label, value, color]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-5"
                    >
                      <span
                        className="mb-3 block h-1 w-8 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <p className="text-xs uppercase tracking-wider text-slate-400">
                        {label}
                      </p>
                      <p className="mt-2 break-words text-lg font-semibold text-white">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>
              <div className="grid gap-4 md:grid-cols-2">
                <InsightList
                  title="Strong areas"
                  items={formData.analysis.strongAreas}
                  color="#34d399"
                  symbol="✓"
                />
                <InsightList
                  title="Weak areas"
                  items={formData.analysis.weakAreas}
                  color="#fb7185"
                  symbol="!"
                />
                <InsightList
                  title="Skill gaps"
                  items={formData.analysis.skillGaps}
                  color="#fbbf24"
                  symbol="↗"
                />
                <InsightList
                  title="Interview focus"
                  items={formData.analysis.interviewFocusAreas}
                  color="#22d3ee"
                  symbol="✳"
                />
                <InsightList
                  title="Recommended roles"
                  items={formData.analysis.recommendedRoles}
                  color="#a78bfa"
                  symbol="◇"
                />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-[#0B1521]/95 px-4 py-4 shadow-[0_16px_60px_rgba(0,0,0,.45)] backdrop-blur-xl sm:px-6">
        <div>
          <p className="text-sm font-semibold text-white">
            {dirty
              ? "Unsaved changes"
              : verified
                ? "Profile verified"
                : "Ready for review?"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {dirty
              ? "Save or verify to keep your edits."
              : "Check your details before continuing."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onCancel && (
            <Action onClick={onCancel} disabled={saving || verifying}>
              Cancel
            </Action>
          )}
          {editable && (
            <>
              <Action onClick={handleSave} disabled={saving || verifying}>
                {saving ? "Saving..." : "Save changes"}
              </Action>
              {!verified && (
                <Action
                  primary
                  onClick={handleVerify}
                  disabled={saving || verifying}
                >
                  {verifying ? "Verifying..." : "✓ Verify profile"}
                </Action>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
