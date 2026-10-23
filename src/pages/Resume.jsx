import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/ui/Navbar";
import GlassCard from "../components/ui/GlassCard";
import Button from "../components/ui/Button";
import ResumeUpload from "../components/resume/ResumeUpload";
import CandidateProfileReview from "../components/resume/CandidateProfileReview";

const BASE = import.meta.env.VITE_API_URL || "/api";
const PARSE_TIMEOUT_MS = 45_000;
const ANALYSIS_TIMEOUT_MS = 90_000;
const STEPS = [
  { id: "upload", label: "Upload", detail: "Your resume", icon: "01" },
  { id: "parse", label: "Analyze", detail: "AI insights", icon: "02" },
  { id: "review", label: "Review", detail: "Your profile", icon: "03" },
  { id: "setup", label: "Configure", detail: "Interview setup", icon: "04" },
];
const DEFAULT_DIFFICULTIES = [
  {
    value: "easy",
    label: "Easy",
    description: "Foundations and entry-level concepts",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Balanced conceptual and practical questions",
  },
  {
    value: "hard",
    label: "Hard",
    description: "Advanced reasoning and challenging problems",
  },
];
const DEFAULT_TYPES = [
  { value: "mixed", label: "Mixed", description: "Technical and behavioral" },
  {
    value: "technical",
    label: "Technical",
    description: "Concepts and problem solving",
  },
  {
    value: "behavioral",
    label: "Behavioral",
    description: "Communication and experience",
  },
];
const DEFAULT_DURATIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
];

async function fetchApi(url, options = {}, timeoutMs = 30_000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        payload.error ||
          payload.message ||
          `Request failed (${response.status})`,
      );
    return payload;
  } catch (error) {
    if (error.name === "AbortError")
      throw new Error("The request timed out. Please try again.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

const fieldClass =
  "w-full rounded-2xl border border-white/10 bg-[#10141e] px-4 py-3.5 text-sm text-white outline-none transition-all placeholder:text-white/25 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10";
const cardClass = "rounded-2xl border border-white/10 bg-white/[0.035]";
const pillClass =
  "rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/65";
const toList = (value) => (Array.isArray(value) ? value : []);
const readable = (value) =>
  String(value ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

function WizardHeading({ eyebrow, title, description }) {
  return (
    <div className="mb-7">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
        {eyebrow}
      </p>
      <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">
        {description}
      </p>
    </div>
  );
}

function StepIndicator({ currentStep }) {
  return (
    <div className="mb-9 rounded-2xl border border-white/10 bg-[#0b1019]/90 p-3 backdrop-blur-xl sm:p-4">
      <div className="grid grid-cols-4 gap-2">
        {STEPS.map((step, index) => {
          const active = index === currentStep;
          const complete = index < currentStep;
          return (
            <div
              key={step.id}
              className={`flex items-center gap-2 rounded-xl px-2 py-2 sm:px-3 ${active ? "bg-accent/10" : ""}`}
              aria-current={active ? "step" : undefined}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold sm:h-9 sm:w-9 ${complete ? "bg-emerald-400/15 text-emerald-300" : active ? "bg-accent text-black" : "bg-white/5 text-white/35"}`}
              >
                {complete ? "✓" : step.icon}
              </div>
              <div className="min-w-0">
                <p
                  className={`truncate text-xs font-semibold sm:text-sm ${active ? "text-white" : complete ? "text-emerald-300" : "text-white/40"}`}
                >
                  {step.label}
                </p>
                <p className="hidden truncate text-[11px] text-white/35 lg:block">
                  {step.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400"
          animate={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
          transition={{ duration: 0.35 }}
        />
      </div>
    </div>
  );
}

export default function ResumePage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [resume, setResume] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [interviewConfig, setInterviewConfig] = useState({
    company: "",
    role: "",
    difficulty: "medium",
    type: "mixed",
    durationMinutes: 60,
  });
  const [wizardOptions, setWizardOptions] = useState(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [error, setError] = useState(null);
  const uploadGenerationRef = useRef(0);
  const creatingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem("hr_token");
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const load = async () => {
      const [optionsResult, profileResult, resumeResult] =
        await Promise.allSettled([
          fetch(`${BASE}/interview-setup/wizard/options`, { headers }).then(
            async (r) => (r.ok ? (await r.json()).data : null),
          ),
          fetch(`${BASE}/resume/profile/me/status`, { headers }).then(
            async (r) => (r.ok ? (await r.json()).data : null),
          ),
          fetch(`${BASE}/resume/current`, { headers }).then(async (r) =>
            r.ok ? (await r.json()).data?.resume : null,
          ),
        ]);
      if (cancelled || uploadGenerationRef.current !== 0) return;
      if (optionsResult.status === "fulfilled")
        setWizardOptions(optionsResult.value);
      if (resumeResult.status === "fulfilled" && resumeResult.value) {
        const existing = resumeResult.value;
        setResume(existing);
        if (existing.parsed_data?.cleanedText) {
          setParsedData({
            textLength: existing.parsed_data.cleanedText.length,
            sections: existing.parsed_data.sections || {},
            preview: existing.parsed_data.cleanedText.substring(0, 500),
          });
          setCurrentStep(1);
        }
      }
      if (
        profileResult.status === "fulfilled" &&
        profileResult.value?.exists &&
        profileResult.value.profile
      ) {
        setProfile(profileResult.value.profile);
        setCurrentStep(3);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConfigChange = (field, value) =>
    setInterviewConfig((prev) => ({ ...prev, [field]: value }));

  const handleAnalyze = async (
    resumeToAnalyze = resume,
    generation = uploadGenerationRef.current,
  ) => {
    if (!resumeToAnalyze?.id) {
      setError("No resume selected. Upload a resume and try again.");
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const token = localStorage.getItem("hr_token");
      const data = await fetchApi(
        `${BASE}/resume/${resumeToAnalyze.id}/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            targetRole: interviewConfig.role,
            targetCompany: interviewConfig.company,
          }),
        },
        ANALYSIS_TIMEOUT_MS,
      );
      if (!data?.data?.profile)
        throw new Error(
          "Analysis finished without a candidate profile. Please retry.",
        );
      if (generation !== uploadGenerationRef.current) return;
      setProfile(data.data.profile);
      setCurrentStep(2);
    } catch (err) {
      if (generation === uploadGenerationRef.current)
        setError(err.message || "Analysis failed");
    } finally {
      if (generation === uploadGenerationRef.current) setAnalyzing(false);
    }
  };

  const parseAndAnalyze = async (
    resumeToProcess,
    generation = uploadGenerationRef.current,
  ) => {
    if (!resumeToProcess?.id) {
      setError("Uploaded resume is missing an ID. Please upload again.");
      return;
    }
    setParsing(true);
    setAnalyzing(false);
    setError(null);
    try {
      const token = localStorage.getItem("hr_token");
      const data = await fetchApi(
        `${BASE}/resume/${resumeToProcess.id}/parse`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
        PARSE_TIMEOUT_MS,
      );
      const parsed = data?.data?.parsedData;
      if (!parsed || !parsed.textLength)
        throw new Error("No readable text found. Upload a text-based PDF.");
      if (generation !== uploadGenerationRef.current) return;
      setParsedData(parsed);
      setParsing(false);
      await handleAnalyze(resumeToProcess, generation);
    } catch (err) {
      if (generation === uploadGenerationRef.current)
        setError(err.message || "Unable to parse resume");
    } finally {
      if (generation === uploadGenerationRef.current) setParsing(false);
    }
  };

  const handleUploadComplete = async (uploadedResume) => {
    const generation = ++uploadGenerationRef.current;
    setProfile(null);
    setParsedData(null);
    setError(null);
    setParsing(false);
    setAnalyzing(false);
    setResume(uploadedResume);
    setCurrentStep(1);
    await parseAndAnalyze(uploadedResume, generation);
  };

  const handleCreateSession = async () => {
    if (creatingRef.current) return;
    if (!interviewConfig.company.trim() || !interviewConfig.role.trim()) {
      setError("Please enter both a target company and a target role.");
      return;
    }
    creatingRef.current = true;
    setCreatingSession(true);
    setError(null);
    try {
      const token = localStorage.getItem("hr_token");
      if (!token)
        throw new Error("Your session has expired. Please log in again.");
      const response = await fetchApi(
        `${BASE}/interview-setup/sessions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...interviewConfig,
            company: interviewConfig.company.trim(),
            role: interviewConfig.role.trim(),
          }),
        },
        60_000,
      );
      const id = response?.data?.interview?.id;
      if (!id)
        throw new Error("Session was created but its interview ID is missing.");
      const qs = new URLSearchParams({
        sessionId: String(id),
        company: interviewConfig.company.trim(),
        role: interviewConfig.role.trim(),
        difficulty: interviewConfig.difficulty,
        type: interviewConfig.type,
        duration: String(interviewConfig.durationMinutes),
      });
      navigate(`/interview?${qs.toString()}`);
    } catch (err) {
      setError(err.message || "Failed to create interview session");
    } finally {
      creatingRef.current = false;
      setCreatingSession(false);
    }
  };

  const goBack = () => {
    setError(null);
    setCurrentStep((step) => Math.max(0, step - 1));
  };
  const canContinue =
    currentStep === 0
      ? !!resume
      : currentStep === 1 || currentStep === 2
        ? !!profile
        : false;

  return (
    <div className="min-h-screen bg-bg pt-24">
      <Navbar />
      <main
        id="main"
        className="relative mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6"
      >
        <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/5 blur-3xl" />
        <div className="relative">
          <StepIndicator currentStep={currentStep} />
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="mb-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200"
            >
              {error}
            </motion.div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.23 }}
            >
              {currentStep === 0 && (
                <div>
                  <WizardHeading
                    eyebrow="Step 01 / 04"
                    title="Start with your resume"
                    description="Upload a text-based resume to personalize your AI interview."
                  />
                  <ResumeUpload onUploadComplete={handleUploadComplete} />
                  <p className="mt-4 text-center text-xs text-white/40">
                    Upload a supported text-based document. File limits depend
                    on your upload service.
                  </p>
                </div>
              )}
              {currentStep === 1 && (
                <div>
                  <WizardHeading
                    eyebrow="Step 02 / 04"
                    title="AI resume analysis"
                    description="We extract your skills, experience and projects to tailor your interview questions."
                  />
                  <GlassCard
                    className="mx-auto max-w-3xl p-7 text-center sm:p-10"
                    glow="#00F2FF"
                  >
                    {parsing || analyzing ? (
                      <>
                        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-3xl">
                          {parsing ? "📄" : "✦"}
                        </div>
                        <div className="mx-auto mb-4 h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                        <h2 className="text-xl font-semibold text-white">
                          {parsing
                            ? "Reading your resume"
                            : "Building your candidate profile"}
                        </h2>
                        <p className="mt-2 text-sm text-white/50">
                          {parsing
                            ? "Extracting text and identifying sections..."
                            : "Analyzing skills, strengths and areas to improve..."}
                        </p>
                        <div className="mx-auto mt-6 h-1.5 max-w-sm overflow-hidden rounded-full bg-white/10">
                          <motion.div
                            className="h-full w-1/3 rounded-full bg-accent"
                            animate={{ x: ["-100%", "300%"] }}
                            transition={{
                              repeat: Infinity,
                              duration: 1.8,
                              ease: "easeInOut",
                            }}
                          />
                        </div>
                      </>
                    ) : profile ? (
                      <>
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/15 text-3xl text-emerald-300">
                          ✓
                        </div>
                        <h2 className="text-xl font-semibold text-white">
                          Analysis complete
                        </h2>
                        <p className="mt-2 text-sm text-white/50">
                          Your profile is ready to review.
                        </p>
                        <Button
                          className="mt-6"
                          onClick={() => setCurrentStep(2)}
                        >
                          Review Profile →
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-3xl">
                          ✦
                        </div>
                        <h2 className="text-xl font-semibold text-white">
                          Ready to analyze
                        </h2>
                        <p className="mt-2 text-sm text-white/50">
                          {resume?.title ||
                            resume?.original_filename ||
                            "Your resume"}
                        </p>
                        <div className="mx-auto mt-6 grid max-w-xl gap-3 sm:grid-cols-2">
                          <input
                            aria-label="Target role for analysis (optional)"
                            placeholder="Target role (optional)"
                            value={interviewConfig.role}
                            onChange={(e) =>
                              handleConfigChange("role", e.target.value)
                            }
                            className={fieldClass}
                          />
                          <input
                            aria-label="Target company for analysis (optional)"
                            placeholder="Target company (optional)"
                            value={interviewConfig.company}
                            onChange={(e) =>
                              handleConfigChange("company", e.target.value)
                            }
                            className={fieldClass}
                          />
                        </div>
                        <Button
                          className="mt-5"
                          onClick={() =>
                            parsedData
                              ? handleAnalyze(resume)
                              : parseAndAnalyze(resume)
                          }
                          disabled={!resume?.id}
                        >
                          {parsedData
                            ? "Start AI Analysis"
                            : "Parse & Analyze Resume"}
                        </Button>
                      </>
                    )}
                  </GlassCard>
                </div>
              )}
              {currentStep === 2 && profile && (
                <CandidateProfileReview
                  profile={profile}
                  onSave={(saved) => {
                    setProfile(saved);
                    setCurrentStep(3);
                    setError(null);
                  }}
                  onCancel={() => setCurrentStep(1)}
                  editable
                />
              )}
              {currentStep === 3 && (
                <InterviewSetupWizard
                  profile={profile}
                  config={interviewConfig}
                  onConfigChange={handleConfigChange}
                  onCreateSession={handleCreateSession}
                  creatingSession={creatingSession}
                  wizardOptions={wizardOptions}
                  onBack={goBack}
                />
              )}
            </motion.div>
          </AnimatePresence>
          {currentStep < 3 && (
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-white/10 pt-6">
              <Button
                variant="ghost"
                onClick={goBack}
                disabled={currentStep === 0 || parsing || analyzing}
              >
                ← Back
              </Button>
              <Button
                onClick={() => {
                  setError(null);
                  setCurrentStep((step) => Math.min(3, step + 1));
                }}
                disabled={!canContinue || parsing || analyzing}
              >
                Continue →
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function InterviewSetupWizard({
  profile,
  config,
  onConfigChange,
  onCreateSession,
  creatingSession,
  wizardOptions,
  onBack,
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const analysis = profile?.analysis || {};
  const name = profile?.full_name || profile?.name || "Candidate";
  const experience = Number(analysis.totalYearsExperience);
  const experienceLabel = Number.isFinite(experience)
    ? experience === 0
      ? "Fresher / Student"
      : `${experience} ${experience === 1 ? "year" : "years"} experience`
    : "Experience not specified";
  const skills = toList(profile?.skills?.technical);
  const strengths = toList(analysis.strongAreas);
  const weaknesses = toList(analysis.weakAreas);
  const focusAreas = toList(analysis.interviewFocusAreas);
  const difficulties = toList(wizardOptions?.difficulties).length
    ? wizardOptions.difficulties
    : DEFAULT_DIFFICULTIES;
  const types = toList(wizardOptions?.types).length
    ? wizardOptions.types
    : DEFAULT_TYPES;
  const durations = toList(wizardOptions?.durations).length
    ? wizardOptions.durations
    : DEFAULT_DURATIONS;
  const selectedDifficulty = difficulties.find(
    (d) => String(d.value) === String(config.difficulty),
  );
  const selectedType = types.find(
    (t) => String(t.value) === String(config.type),
  );
  const ready = Boolean(config.company.trim() && config.role.trim());
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "HR";

  return (
    <div className="space-y-6">
      <WizardHeading
        eyebrow="Step 04 / 04 · Final step"
        title="Design your mock interview"
        description="Set your target role and preferences. HireReady AI will use your saved candidate profile to tailor questions."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <GlassCard className="overflow-hidden p-0">
            <div className="border-b border-white/10 bg-gradient-to-r from-violet-400/10 via-accent/5 to-transparent px-5 py-5 sm:px-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-cyan-400 text-lg font-bold text-[#070b12]">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300">
                    AI-analyzed candidate
                  </p>
                  <h2 className="truncate text-lg font-semibold text-white">
                    {name}
                  </h2>
                  <p className="text-xs text-white/50">
                    {analysis.primaryRole ||
                      profile?.preferred_role ||
                      "Candidate"}{" "}
                    · {experienceLabel}
                  </p>
                </div>
                {analysis.seniorityLevel && (
                  <span className="hidden rounded-full border border-violet-400/25 bg-violet-400/10 px-3 py-1.5 text-xs font-medium text-violet-200 sm:inline-flex">
                    {readable(analysis.seniorityLevel)}
                  </span>
                )}
              </div>
            </div>
            <div className="px-5 py-5 sm:px-6">
              <div className="flex flex-wrap gap-2">
                {skills.slice(0, 5).map((skill, i) => (
                  <span key={`${skill}-${i}`} className={pillClass}>
                    {skill}
                  </span>
                ))}
                {skills.length > 5 && (
                  <span className={pillClass}>+{skills.length - 5} more</span>
                )}
                {!skills.length && (
                  <span className="text-xs text-white/40">
                    Skills will be based on your analyzed resume.
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowDetails((v) => !v)}
                className="mt-4 flex items-center gap-2 text-xs font-medium text-accent hover:text-white"
                aria-expanded={showDetails}
              >
                {showDetails
                  ? "Hide AI profile insights"
                  : "View AI profile insights"}{" "}
                <span>{showDetails ? "↑" : "↓"}</span>
              </button>
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2">
                      <InsightList
                        title="Strengths"
                        items={strengths}
                        color="emerald"
                      />
                      <InsightList
                        title="Areas to improve"
                        items={weaknesses}
                        color="amber"
                      />
                      <div className="sm:col-span-2">
                        <InsightList
                          title="Interview focus"
                          items={focusAreas}
                          color="cyan"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </GlassCard>

          <GlassCard className="p-5 sm:p-7">
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-xl">
                ◎
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Your target opportunity
                </h2>
                <p className="mt-1 text-xs text-white/45">
                  Questions will be aligned with the role you're preparing for.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-white/70">
                  Target company <span className="text-accent">*</span>
                </span>
                <input
                  type="text"
                  autoComplete="organization"
                  value={config.company}
                  onChange={(e) => onConfigChange("company", e.target.value)}
                  placeholder="e.g. Google, Microsoft"
                  maxLength={120}
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-white/70">
                  Target role <span className="text-accent">*</span>
                </span>
                <input
                  type="text"
                  value={config.role}
                  onChange={(e) => onConfigChange("role", e.target.value)}
                  placeholder="e.g. Software Engineer Intern"
                  maxLength={120}
                  className={fieldClass}
                />
              </label>
            </div>
            <p className="mt-4 text-xs text-white/35">
              Tip: Choose a role matching your current experience for more
              relevant practice.
            </p>
          </GlassCard>

          <GlassCard className="p-5 sm:p-7">
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-xl text-violet-300">
                ⚙
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Interview preferences
                </h2>
                <p className="mt-1 text-xs text-white/45">
                  Choose how challenging and focused your session should be.
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <p className="mb-3 text-xs font-semibold text-white/70">
                  Difficulty
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {difficulties.map((item) => {
                    const selected =
                      String(config.difficulty) === String(item.value);
                    return (
                      <button
                        type="button"
                        key={item.value}
                        onClick={() => onConfigChange("difficulty", item.value)}
                        aria-pressed={selected}
                        className={`rounded-xl border p-3 text-left transition-all ${selected ? "border-accent/70 bg-accent/10 shadow-[0_0_20px_rgba(0,242,255,0.06)]" : "border-white/10 bg-white/[0.025] hover:border-white/25"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-sm font-semibold ${selected ? "text-accent" : "text-white/75"}`}
                          >
                            {item.label}
                          </span>
                          <span
                            className={`h-3.5 w-3.5 rounded-full border ${selected ? "border-accent bg-accent" : "border-white/30"}`}
                          />
                        </div>
                        <p className="mt-2 text-[11px] leading-4 text-white/40">
                          {item.description || ""}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs font-semibold text-white/70">
                  Interview type
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {types.map((item) => {
                    const selected = String(config.type) === String(item.value);
                    return (
                      <button
                        type="button"
                        key={item.value}
                        onClick={() => onConfigChange("type", item.value)}
                        aria-pressed={selected}
                        className={`rounded-xl border p-3 text-left transition-all ${selected ? "border-violet-400/60 bg-violet-400/10" : "border-white/10 bg-white/[0.025] hover:border-white/25"}`}
                      >
                        <p
                          className={`text-sm font-semibold ${selected ? "text-violet-200" : "text-white/75"}`}
                        >
                          {item.label}
                        </p>
                        <p className="mt-2 text-[11px] leading-4 text-white/40">
                          {item.description || "Practice this interview format"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs font-semibold text-white/70">
                  Session duration
                </p>
                <div className="flex flex-wrap gap-2">
                  {durations.map((item) => {
                    const selected =
                      Number(config.durationMinutes) === Number(item.value);
                    return (
                      <button
                        type="button"
                        key={item.value}
                        onClick={() =>
                          onConfigChange("durationMinutes", Number(item.value))
                        }
                        aria-pressed={selected}
                        className={`min-w-[78px] rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${selected ? "border-accent/70 bg-accent/10 text-accent" : "border-white/10 bg-white/[0.025] text-white/60 hover:border-white/25"}`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <GlassCard className="overflow-hidden p-0" glow="#00F2FF">
            <div className="border-b border-white/10 bg-gradient-to-br from-accent/10 to-transparent px-5 py-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  Session preview
                </p>
                <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] text-emerald-300">
                  AI tailored
                </span>
              </div>
              <h3 className="mt-3 break-words text-xl font-bold text-white">
                {config.role.trim() || "Your target role"}
              </h3>
              <p className="mt-1 break-words text-sm text-white/50">
                {config.company.trim() || "Choose a company"}
              </p>
            </div>
            <div className="space-y-4 p-5">
              <SummaryRow
                label="Difficulty"
                value={selectedDifficulty?.label || readable(config.difficulty)}
              />
              <SummaryRow
                label="Interview type"
                value={selectedType?.label || readable(config.type)}
              />
              <SummaryRow
                label="Duration"
                value={`${config.durationMinutes} minutes`}
              />
              <SummaryRow label="Candidate" value={name} />
              <div className="rounded-xl border border-accent/15 bg-accent/[0.04] p-3">
                <p className="text-xs font-medium text-white/75">
                  Resume-aware questions
                </p>
                <p className="mt-1 text-xs leading-5 text-white/45">
                  Your saved skills, projects and profile insights help shape
                  the interview.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewOpen((v) => !v)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5 text-xs font-medium text-white/65 hover:border-accent/30"
                aria-expanded={reviewOpen}
              >
                {reviewOpen ? "Hide full context ↑" : "View full AI context ↓"}
              </button>
              {reviewOpen && (
                <div className="space-y-3 border-t border-white/10 pt-4">
                  <SummaryRow label="Experience" value={experienceLabel} />
                  <SummaryRow
                    label="Seniority"
                    value={readable(analysis.seniorityLevel || "Not specified")}
                  />
                  <div>
                    <p className="text-xs text-white/40">Focus areas</p>
                    <p className="mt-1 break-words text-xs leading-5 text-white/70">
                      {focusAreas.slice(0, 4).join(" · ") ||
                        "Based on your resume"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
          <div className="rounded-2xl border border-white/10 bg-[#10141e]/90 p-5">
            <p className="text-sm font-semibold text-white">
              Ready when you are
            </p>
            <p className="mt-2 text-xs leading-5 text-white/45">
              Your session will be created with these settings. You'll review
              the interview page before requesting your first question.
            </p>
            {!ready && (
              <p className="mt-3 text-xs text-amber-300">
                Enter a company and role to continue.
              </p>
            )}
            <Button
              className="mt-5 w-full"
              size="lg"
              onClick={onCreateSession}
              disabled={!ready || creatingSession}
            >
              {creatingSession
                ? "Creating session..."
                : "Create Interview Session →"}
            </Button>
            <button
              type="button"
              onClick={onBack}
              disabled={creatingSession}
              className="mt-3 w-full rounded-xl py-2.5 text-sm text-white/50 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
            >
              ← Back to profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0">
      <span className="shrink-0 text-xs text-white/40">{label}</span>
      <span className="min-w-0 break-words text-right text-xs font-medium text-white/80">
        {value}
      </span>
    </div>
  );
}
function InsightList({ title, items, color }) {
  const colorClass =
    color === "emerald"
      ? "text-emerald-300"
      : color === "amber"
        ? "text-amber-300"
        : "text-cyan-300";
  return (
    <div>
      <p className={`mb-2 text-xs font-semibold ${colorClass}`}>{title}</p>
      {items.length ? (
        <ul className="space-y-2">
          {items.slice(0, 4).map((item, index) => (
            <li
              key={index}
              className="flex gap-2 text-xs leading-5 text-white/55"
            >
              <span className={colorClass}>•</span>
              <span>
                {typeof item === "string"
                  ? item
                  : item?.description ||
                    item?.skill ||
                    item?.topic ||
                    JSON.stringify(item)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-white/35">No specific insights available.</p>
      )}
    </div>
  );
}
