import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/ui/Navbar";
import GlassCard from "../components/ui/GlassCard";
import Button from "../components/ui/Button";
import SpeechRecorder from "../components/Interview/SpeechRecorder";

const BASE = import.meta.env.VITE_API_URL || "/api";

const ScoreBar = ({ label, value }) => {
  const score = Math.min(100, Math.max(0, value ?? 0));

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-white/60">{label}</span>

        <span className="text-xs font-semibold text-white">{score}</span>
      </div>

      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5 }}
          className="h-full bg-accent rounded-full"
        />
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, suffix = "%", description }) => {
  const numericValue = typeof value === "number" ? Math.round(value) : null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="text-xs uppercase tracking-wider text-white/40">
        {label}
      </div>

      <div className="mt-2 flex items-end gap-1">
        <span className="text-3xl font-bold text-white">
          {numericValue !== null ? numericValue : "—"}
        </span>

        {numericValue !== null && (
          <span className="mb-1 text-sm text-white/40">{suffix}</span>
        )}
      </div>

      {description && (
        <p className="mt-2 text-xs leading-relaxed text-white/45">
          {description}
        </p>
      )}
    </div>
  );
};

const ReportSection = ({ title, subtitle, children }) => {
  return (
    <GlassCard className="p-6 md:p-7">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">{title}</h2>

        {subtitle && <p className="mt-1 text-sm text-white/45">{subtitle}</p>}
      </div>

      {children}
    </GlassCard>
  );
};

const ScoreBadge = ({ score }) => {
  const value = Math.round(score ?? 0);

  let label = "Needs Improvement";

  if (value >= 85) label = "Excellent";
  else if (value >= 75) label = "Strong";
  else if (value >= 60) label = "Developing";

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5">
      <span className="text-sm font-semibold text-white">{value}%</span>

      <span className="text-xs text-white/50">{label}</span>
    </div>
  );
};

const BulletList = ({
  items,
  emptyText = "No specific points were identified.",
}) => {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="text-sm text-white/40">{emptyText}</p>;
  }

  const renderItem = (item) => {
    if (typeof item === "string" || typeof item === "number") {
      return String(item);
    }

    if (!item || typeof item !== "object") {
      return String(item ?? "");
    }

    // Skill-gap / technical-area object
    if (item.skill) {
      return (
        <div className="space-y-1">
          <div className="font-medium text-white/80">
            {item.skill}
            {item.level && (
              <span className="ml-2 text-xs text-white/40">({item.level})</span>
            )}
          </div>

          {item.evidence && (
            <div className="text-white/55">
              <span className="text-white/40">Evidence: </span>
              {item.evidence}
            </div>
          )}

          {item.recommendation && (
            <div className="text-white/55">
              <span className="text-white/40">Recommendation: </span>
              {item.recommendation}
            </div>
          )}
        </div>
      );
    }

    // Generic recommendation / learning-plan object
    if (item.recommendation) {
      return item.recommendation;
    }

    if (item.description) {
      return item.description;
    }

    if (item.topic) {
      return item.topic;
    }

    if (item.text) {
      return item.text;
    }

    if (item.feedback) {
      return item.feedback;
    }

    // Last-resort fallback so React never receives an object
    return JSON.stringify(item);
  };

  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li
          key={`${index}-${typeof item === "string" ? item : "object"}`}
          className="flex gap-3 text-sm leading-relaxed text-white/70"
        >
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />

          <span className="min-w-0">{renderItem(item)}</span>
        </li>
      ))}
    </ul>
  );
};

const QuestionReportCard = ({ item, index }) => {
  const score = item?.score ?? item?.finalScore ?? 0;

  const attempts = Array.isArray(item?.attempts) ? item.attempts : [];

  const candidateAnswer =
    item?.candidateAnswer ||
    attempts[item?.finalAttemptNumber - 1]?.candidateAnswer ||
    attempts[attempts.length - 1]?.candidateAnswer ||
    "";

  const idealAnswer =
    item?.idealAnswer ||
    item?.betterAnswer ||
    attempts[attempts.length - 1]?.betterAnswer ||
    "";

  const communication =
    item?.communicationAnalysis ||
    attempts[attempts.length - 1]?.communication ||
    {};

  const sentenceAnalysis =
    item?.sentenceAnalysis ||
    attempts[attempts.length - 1]?.sentenceAnalysis ||
    [];

  return (
    <details
      className="group rounded-2xl border border-white/10 bg-white/[0.025] overflow-hidden"
      open={index === 0}
    >
      <summary className="cursor-pointer list-none px-5 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-semibold text-white">
              {index + 1}
            </div>

            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-white/35">
                  Question {index + 1}
                </span>

                {item?.difficulty && (
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase text-white/40">
                    {item.difficulty}
                  </span>
                )}
              </div>

              <h3 className="max-w-3xl text-sm font-medium leading-relaxed text-white">
                {item?.question || "Interview question"}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ScoreBadge score={score} />

            <span className="text-white/30 transition-transform group-open:rotate-180">
              ↓
            </span>
          </div>
        </div>
      </summary>

      <div className="border-t border-white/10 px-5 py-6 space-y-7">
        {/* Candidate answer */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
            Your Answer
          </div>

          <div className="rounded-xl border border-white/10 bg-black/10 p-4">
            <p className="whitespace-pre-wrap text-sm leading-7 text-white/70">
              {candidateAnswer || "No answer recorded."}
            </p>
          </div>
        </div>

        {/* Score breakdown */}
        <div>
          <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
            Answer Evaluation
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <ScoreBar
              label="Technical Accuracy"
              value={item?.technicalAccuracy}
            />

            <ScoreBar label="Completeness" value={item?.completeness} />

            <ScoreBar label="Relevance" value={item?.relevance} />
          </div>
        </div>

        {/* Correct */}
        <div>
          <div className="mb-3 text-sm font-semibold text-white">
            What You Got Right
          </div>

          <BulletList
            items={item?.whatWasCorrect}
            emptyText="No specific strengths were recorded for this answer."
          />
        </div>

        {/* Mistakes */}
        <div>
          <div className="mb-3 text-sm font-semibold text-white">Mistakes</div>

          <BulletList
            items={item?.mistakes}
            emptyText="No major technical mistakes were identified."
          />
        </div>

        {/* Missing concepts */}
        <div>
          <div className="mb-3 text-sm font-semibold text-white">
            Missing Concepts
          </div>

          <BulletList
            items={item?.missingConcepts}
            emptyText="No important missing concepts were identified."
          />
        </div>

        {/* Communication */}
        <div>
          <div className="mb-4 text-sm font-semibold text-white">
            Communication Analysis
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ScoreBar label="Clarity" value={communication?.clarity} />

            <ScoreBar
              label="Articulation"
              value={communication?.articulation}
            />

            <ScoreBar label="Grammar" value={communication?.grammar} />

            <ScoreBar label="Structure" value={communication?.structure} />
          </div>
        </div>

        {/* Sentence analysis */}
        {Array.isArray(sentenceAnalysis) && sentenceAnalysis.length > 0 && (
          <div>
            <div className="mb-4 text-sm font-semibold text-white">
              Sentence-Level Corrections
            </div>

            <div className="space-y-3">
              {sentenceAnalysis.map((sentence, sentenceIndex) => (
                <div
                  key={sentenceIndex}
                  className="rounded-xl border border-white/10 bg-white/[0.025] p-4"
                >
                  <div className="mb-2 text-xs uppercase tracking-wider text-white/35">
                    Original
                  </div>

                  <p className="text-sm leading-6 text-white/55">
                    {sentence?.original}
                  </p>

                  <div className="my-4 h-px bg-white/10" />

                  <div className="mb-2 text-xs uppercase tracking-wider text-white/35">
                    Improved
                  </div>

                  <p className="text-sm leading-6 text-white/80">
                    {sentence?.corrected}
                  </p>

                  {sentence?.issue && (
                    <p className="mt-3 text-xs leading-5 text-white/40">
                      <span className="font-medium text-white/60">Issue:</span>{" "}
                      {sentence.issue}
                    </p>
                  )}

                  {sentence?.explanation && (
                    <p className="mt-2 text-xs leading-5 text-white/40">
                      {sentence.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Better answer */}
        {idealAnswer && (
          <div>
            <div className="mb-3 text-sm font-semibold text-white">
              Better Answer
            </div>

            <div className="rounded-xl border border-accent/20 bg-accent/[0.05] p-5">
              <p className="text-sm leading-7 text-white/75">{idealAnswer}</p>
            </div>
          </div>
        )}

        {/* Feedback */}
        {item?.feedback && (
          <div>
            <div className="mb-2 text-sm font-semibold text-white">
              Interviewer Feedback
            </div>

            <p className="text-sm leading-7 text-white/55">{item.feedback}</p>
          </div>
        )}

        {/* Attempts */}
        {attempts.length > 1 && (
          <div>
            <div className="mb-3 text-sm font-semibold text-white">
              Attempt History
            </div>

            <div className="space-y-2">
              {attempts.map((attempt, attemptIndex) => (
                <div
                  key={attemptIndex}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3"
                >
                  <span className="text-sm text-white/60">
                    Attempt {attemptIndex + 1}
                  </span>

                  <ScoreBadge
                    score={attempt?.score ?? attempt?.evaluation?.score}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Improvement */}
        {Array.isArray(item?.improvementAreas) &&
          item.improvementAreas.length > 0 && (
            <div>
              <div className="mb-3 text-sm font-semibold text-white">
                Focus for Improvement
              </div>

              <BulletList items={item.improvementAreas} />
            </div>
          )}
      </div>
    </details>
  );
};

const VALID_STATUS = [
  "loading",
  "ready",
  "question",
  "listening",
  "ended",
  "error",
];

export default function InterviewPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("loading");
  const [interview, setInterview] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [remainingTime, setRemainingTime] = useState(0);
  const [error, setError] = useState(null);
  const [messageId, setMessageId] = useState(null);
  const [report, setReport] = useState(null);
  const [evaluationReady, setEvaluationReady] = useState(false);
  const [isNextQuestionLoading, setIsNextQuestionLoading] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [nextQuestionCountdown, setNextQuestionCountdown] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const [isEndingInterview, setIsEndingInterview] = useState(false);
  const [questionLoadError, setQuestionLoadError] = useState(false);
  // Interview config from query params (passed from Resume wizard)
  const sessionId = params.get("sessionId");
  const company = params.get("company") || "HireReady";
  const role = params.get("role") || "Software Engineer";
  const difficulty = params.get("difficulty") || "medium";
  const type = params.get("type") || "mixed";
  const duration = parseInt(params.get("duration") || "30", 10);
  const resumeId = params.get("resumeId") || null;
  useEffect(() => {
    console.log("Interview page loaded");
    console.log("Session ID:", sessionId);
    console.log("Company:", company);
    console.log("Role:", role);
  }, [sessionId, company, role]);
  const timerRef = useRef(null);
  const nextQuestionRequestRef = useRef(false);
  const interviewEndedRef = useRef(false);
  const conversationEndRef = useRef(null);
  const interviewStarted = useRef(false);
  const mediaStreamRef = useRef(null);
  const videoRef = useRef(null);

  const stopMedia = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, []);

  /**
   * Start the real AI interview by calling POST /api/interview/start
   */
  const startInterview = useCallback(async () => {
    try {
      if (!sessionId) {
        throw new Error("Interview session ID is missing.");
      }

      const token = localStorage.getItem("hr_token");

      console.log("[INTERVIEW] Loading existing session:", sessionId);

      const res = await fetch(`${BASE}/interview-setup/sessions/${sessionId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const responseText = await res.text();

      console.log("[INTERVIEW] Session response:", res.status, responseText);

      if (!res.ok) {
        throw new Error(
          responseText.includes("{")
            ? JSON.parse(responseText).error || responseText
            : responseText,
        );
      }

      const data = JSON.parse(responseText);
      const session = data.data;

      console.log("[INTERVIEW] Existing session loaded:", session);

      const interviewData = session.interview || session;

      const context = session.interviewContext || session.context || null;

      const contextId =
        context?.id || interviewData.metadata?.contextId || null;

      if (!contextId) {
        throw new Error("Interview context not found for this session.");
      }

      const normalizedInterview = {
        ...interviewData,
        interviewId: interviewData.id,
        contextId,
      };

      setInterview(normalizedInterview);

      // Use the duration stored in the interview session
      const interviewDuration = interviewData.duration_minutes || duration;

      setRemainingTime(interviewDuration * 60);

      console.log("[INTERVIEW] Context ID:", contextId);
      console.log("[INTERVIEW] Interview ready");

      setStatus("ready");
    } catch (err) {
      console.error("[INTERVIEW] Failed to load session:", err);
      setError(err.message || "Failed to load interview session");
      setStatus("error");
    }
  }, [sessionId, duration]);

  useEffect(() => {
    if (!sessionId) {
      setError("Interview session ID is missing.");
      setStatus("error");
      return;
    }

    if (interviewStarted.current) return;

    interviewStarted.current = true;

    startInterview();
  }, [sessionId, startInterview]);

  const requestPermissionsAndStart = useCallback(async () => {
    setError(null);
    setPermissions({
      camera: "checking",
      microphone: "checking",
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setPermissions({
        camera: "ready",
        microphone: "ready",
      });

      setStatus("ready");
    } catch (err) {
      stopMedia();

      setPermissions({
        camera: "denied",
        microphone: "denied",
      });

      setError(
        "Camera and microphone access is required. Enable both permissions in your browser settings, then try again.",
      );

      setStatus("error");
    }
  }, [stopMedia]);

  /**
   * Fetch the next question from the AI interviewer
   */
  const fetchNextQuestion = useCallback(async () => {
    if (
      !interview?.contextId ||
      nextQuestionRequestRef.current ||
      interviewEndedRef.current
    ) {
      return;
    }

    nextQuestionRequestRef.current = true;

    try {
      setError(null);
      setQuestionLoadError(false);
      setIsNextQuestionLoading(true);

      const token = localStorage.getItem("hr_token");

      const res = await fetch(`${BASE}/interview/question`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contextId: interview.contextId,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      const question = data.data;

      if (interviewEndedRef.current) return;

      setCurrentQuestion(question);
      setMessageId(question.messageId || null);
      setQuestionNumber((prev) => prev + 1);

      setIsEvaluating(false);
      
      setEvaluationReady(false);
      setNextQuestionCountdown(null);

      setStatus("question");
    } catch (err) {
      console.error("Failed to get next question:", err);

      if (!interviewEndedRef.current) {
        setError(err.message || "Failed to get next question");
        setQuestionLoadError(true);
        setStatus("question");
        setEvaluationReady(true);
        setNextQuestionCountdown(null);
      }
    } finally {
      nextQuestionRequestRef.current = false;
      setIsNextQuestionLoading(false);
    }
  }, [interview?.contextId]);

  const handleNextQuestion = useCallback(async () => {
    if (nextQuestionRequestRef.current || interviewEndedRef.current) {
      return;
    }

    setNextQuestionCountdown(null);
    setEvaluationReady(false);

    await fetchNextQuestion();
  }, [fetchNextQuestion]);

  useEffect(() => {
    if (
      !evaluationReady ||
      status !== "question" ||
      isNextQuestionLoading ||
      questionLoadError ||
      interviewEndedRef.current
    ) {
      setNextQuestionCountdown(null);
      return;
    }

    setNextQuestionCountdown(10);

    const interval = setInterval(() => {
      setNextQuestionCountdown((prev) => {
        if (prev === null) return null;

        return Math.max(0, prev - 1);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [evaluationReady, status, isNextQuestionLoading, questionLoadError]);

  useEffect(() => {
    if (
      nextQuestionCountdown === 0 &&
      evaluationReady &&
      status === "question" &&
      !isNextQuestionLoading &&
      !questionLoadError &&
      !interviewEndedRef.current
    ) {
      handleNextQuestion();
    }
  }, [
    nextQuestionCountdown,
    evaluationReady,
    status,
    isNextQuestionLoading,
    questionLoadError,
    handleNextQuestion,
  ]);
  /**
   * End the interview and generate the final report
   */
  const handleEndInterview = useCallback(async () => {
    if (interviewEndedRef.current || !interview?.contextId) {
      return;
    }

    console.log("[INTERVIEW] handleEndInterview CALLED");

    interviewEndedRef.current = true;

    try {
      setIsEndingInterview(true);
      setStatus("loading");

      // Stop timer immediately
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const token = localStorage.getItem("hr_token");
      console.log("[INTERVIEW] Sending end request:", {
        contextId: interview.contextId,
      });

      const res = await fetch(`${BASE}/interview/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contextId: interview.contextId,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      console.log("[INTERVIEW] End response:", data);

      setReport(data.data);
      setStatus("ended");
    } catch (err) {
      console.error("Failed to end interview:", err);
      setError(err.message || "Failed to end interview");
      setStatus("error");
    }
  }, [interview]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopMedia();
    };
  }, [stopMedia]);

  /**
   * Countdown timer
   *
   * Runs only while the candidate is answering.
   * Pauses during AI evaluation and question generation.
   */
  useEffect(() => {
    const shouldRun =
      (status === "question" || status === "listening") &&
      !!currentQuestion &&
      !evaluationReady &&
      !isEvaluating &&
      !isNextQuestionLoading &&
      !interviewEndedRef.current;

    if (!shouldRun) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    timerRef.current = setInterval(() => {
      setRemainingTime((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [
    status,
    currentQuestion,
    evaluationReady,
    isEvaluating,
    isNextQuestionLoading,
  ]);

  useEffect(() => {
    if (remainingTime === 0 && currentQuestion && !interviewEndedRef.current) {
      handleEndInterview();
    }
  }, [remainingTime, currentQuestion, handleEndInterview]);

  /**
   * Handle transcript from SpeechRecorder
   */
  const handleStatusChange = (data) => {
    // -----------------------------------------
    // AI evaluation has started
    // Pause interview timer
    // -----------------------------------------
    if (data.type === "evaluation_start") {
      console.log("[INTERVIEW] AI evaluation started");

      setIsEvaluating(true);
      return;
    }

    // -----------------------------------------
    // AI evaluation has ended due to an error
    // Resume interview timer
    // -----------------------------------------
    if (data.type === "evaluation_end") {
      console.log("[INTERVIEW] AI evaluation ended");

      setIsEvaluating(false);
      return;
    }

    // -----------------------------------------
    // Live speech transcript
    // -----------------------------------------
    if (data.type === "transcript") {
      setConversation((prev) => {
        const updated = [...prev];

        const lastIndex = updated.length - 1;

        if (
          lastIndex >= 0 &&
          updated[lastIndex].role === "user" &&
          updated[lastIndex].questionId === messageId
        ) {
          updated[lastIndex] = {
            ...updated[lastIndex],
            content: data.transcript,
          };

          return updated;
        }

        updated.push({
          role: "user",
          questionId: messageId,
          content: data.transcript,
        });

        return updated;
      });

      return;
    }

    // -----------------------------------------
    // AI evaluation completed successfully
    // -----------------------------------------
    if (data.type === "evaluation") {
      console.log("[INTERVIEW] Evaluation received:", data.evaluation);

      // Stop evaluation processing state
      setIsEvaluating(false);

      // Add evaluation to conversation
      setConversation((prev) => [
        ...prev,
        {
          role: "evaluation",
          content: data.evaluation,
        },
      ]);

      // Start the 10-second next-question countdown
      setEvaluationReady(true);

      return;
    }
  };

  /**
   * Submit the answer to the current question and fetch the next one
   */

  // Format remaining time as mm:ss
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Render
  return (
    <div className="min-h-screen bg-bg pt-20">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <AnimatePresence mode="wait">
          {status === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32"
            >
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <p className="mt-4 text-white/60">
                {isEndingInterview
                  ? "Analyzing your performance and generating your interview report..."
                  : "Starting your AI interview..."}
              </p>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-20 text-center"
            >
              <GlassCard className="p-8" glow="#ef4444">
                <div className="text-4xl mb-4">⚠️</div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Interview failed to start
                </h2>
                <p className="text-white/60 mb-6">{error}</p>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    onClick={() => {
                      setError(null);
                      setStatus("loading");
                      startInterview();
                    }}
                  >
                    Retry
                  </Button>
                  <Button variant="ghost" onClick={() => navigate("/resume")}>
                    Back to Resume
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {(status === "ready" ||
            status === "question" ||
            status === "listening") &&
            interview && (
              <motion.div
                key="active"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      {interview.company} · {interview.role}
                    </h1>
                    <p className="text-sm text-white/50">
                      Difficulty: {interview.difficulty || difficulty} · Type:{" "}
                      {(interview.interviewType || type).replace("_", " ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        remainingTime < 60
                          ? "bg-red-500/20 text-red-400"
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      ⏱ {formatTime(remainingTime)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEndInterview}
                    >
                      End Interview
                    </Button>
                  </div>
                </div>
                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                    <p className="text-sm text-red-300">{error}</p>

                    {questionLoadError && (
                      <button
                        type="button"
                        onClick={fetchNextQuestion}
                        disabled={isNextQuestionLoading}
                        className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                      >
                        {isNextQuestionLoading
                          ? "Retrying..."
                          : "Retry Question"}
                      </button>
                    )}
                  </div>
                )}
                {/* Question */}
                {currentQuestion ? (
                  <GlassCard className="relative p-6" glow="#00F2FF">
                    <AnimatePresence mode="wait">
                      {isNextQuestionLoading ? (
                        <motion.div
                          key="next-question-loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex min-h-[110px] items-center justify-center"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />

                            <span className="text-sm text-white/60">
                              Generating next question...
                            </span>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key={currentQuestion.messageId || questionNumber}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25 }}
                        >
                          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent">
                            <span>Question {questionNumber}</span>

                            {currentQuestion.type === "follow-up" &&
                              questionNumber > 1 && (
                                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px]">
                                  Follow-up
                                </span>
                              )}
                          </div>

                          <p className="text-lg leading-relaxed text-white">
                            {currentQuestion.question}
                          </p>

                          {currentQuestion.topic && (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
                                #{currentQuestion.topic}
                              </span>

                              {currentQuestion.difficulty && (
                                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
                                  Difficulty: {currentQuestion.difficulty}
                                </span>
                              )}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlassCard>
                ) : (
                  <GlassCard className="p-6 text-center">
                    <p className="text-white/70">
                      Click below to get your first question.
                    </p>
                    <Button
                      className="mt-4"
                      onClick={fetchNextQuestion}
                      disabled={isNextQuestionLoading}
                    >
                      {isNextQuestionLoading
                        ? "Generating First Question..."
                        : "Get First Question"}
                    </Button>
                  </GlassCard>
                )}

                {/* Speech Recorder */}
                <GlassCard className="p-0 overflow-hidden">
                  <SpeechRecorder
                    interviewId={interview.interviewId}
                    contextId={interview.contextId}
                    questionId={messageId}
                    onStatusChange={handleStatusChange}
                    isQuestionActive={
                      (status === "question" || status === "listening") &&
                      !evaluationReady &&
                      !isEvaluating &&
                      !isNextQuestionLoading &&
                      !!messageId
                    }
                  />
                </GlassCard>

                {/* Conversation Log */}
                {conversation.length > 0 && (
                  <div className="space-y-3 rounded-xl bg-white/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
                      Interview Activity
                    </p>

                    {conversation.map((msg, i) => {
                      // Normal user transcript
                      if (msg.role === "user") {
                        return (
                          <p key={i} className="text-sm text-accent">
                            <strong>You:</strong> {msg.content}
                          </p>
                        );
                      }

                      // AI evaluation object
                      // AI evaluation object
                      if (msg.role === "evaluation") {
                        const evaluation = msg.content;

                        const getScoreLabel = (score) => {
                          if (score >= 85) return "Excellent";
                          if (score >= 70) return "Strong";
                          if (score >= 55) return "Average";
                          if (score >= 40) return "Needs Improvement";
                          return "Weak";
                        };

                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="rounded-2xl border border-accent/30 bg-accent/5 p-6 shadow-lg"
                          >
                            {/* ================= HEADER ================= */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                              <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">
                                  AI Answer Analysis
                                </p>

                                <h3 className="text-xl font-bold text-white mt-1">
                                  {getScoreLabel(evaluation?.score ?? 0)} Answer
                                </h3>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="text-4xl font-bold text-accent leading-none">
                                    {evaluation?.score ?? 0}
                                  </div>

                                  <div className="text-xs text-white/40 mt-1">
                                    / 100
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* ================= OVERALL SCORE ================= */}
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-6">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(0, evaluation?.score ?? 0),
                                  )}%`,
                                }}
                                transition={{ duration: 0.7 }}
                                className="h-full bg-accent rounded-full"
                              />
                            </div>

                            {/* ================= CORE SCORES ================= */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                                <ScoreBar
                                  label="Technical Accuracy"
                                  value={evaluation?.technicalAccuracy}
                                />
                              </div>

                              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                                <ScoreBar
                                  label="Completeness"
                                  value={evaluation?.completeness}
                                />
                              </div>

                              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                                <ScoreBar
                                  label="Relevance"
                                  value={evaluation?.relevance}
                                />
                              </div>
                            </div>

                            {/* ================= FEEDBACK ================= */}
                            {evaluation?.feedback && (
                              <div className="mb-6 rounded-xl bg-white/5 border border-white/10 p-4">
                                <p className="text-sm font-semibold text-white mb-2">
                                  Overall Feedback
                                </p>

                                <p className="text-sm text-white/70 leading-relaxed">
                                  {evaluation.feedback}
                                </p>
                              </div>
                            )}

                            {/* ================= WHAT YOU DID WELL ================= */}
                            {evaluation?.strengths?.length > 0 && (
                              <div className="mb-6">
                                <p className="text-sm font-semibold text-emerald-400 mb-3">
                                  ✓ What You Did Well
                                </p>

                                <div className="space-y-2">
                                  {evaluation.strengths.map((item, index) => (
                                    <div
                                      key={index}
                                      className="flex gap-2 text-sm text-white/70"
                                    >
                                      <span className="text-emerald-400 shrink-0">
                                        ✓
                                      </span>

                                      <span>
                                        {typeof item === "string" ||
                                        typeof item === "number"
                                          ? String(item)
                                          : item?.recommendation ||
                                            item?.description ||
                                            item?.text ||
                                            JSON.stringify(item)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* ================= WHAT YOU MISSED ================= */}
                            {(evaluation?.mistakes?.length > 0 ||
                              evaluation?.missingConcepts?.length > 0) && (
                              <div className="mb-6">
                                <p className="text-sm font-semibold text-red-400 mb-3">
                                  ⚠ What You Missed
                                </p>

                                {evaluation?.mistakes?.length > 0 && (
                                  <div className="space-y-2 mb-3">
                                    {evaluation.mistakes.map((item, index) => (
                                      <div
                                        key={`mistake-${index}`}
                                        className="flex gap-2 text-sm text-white/70"
                                      >
                                        <span className="text-red-400 shrink-0">
                                          •
                                        </span>

                                        {typeof item === "string" ||
                                        typeof item === "number"
                                          ? String(item)
                                          : item?.concept ||
                                            item?.topic ||
                                            item?.description ||
                                            JSON.stringify(item)}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {evaluation?.missingConcepts?.length > 0 && (
                                  <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3">
                                    <p className="text-xs uppercase tracking-wider text-red-300/70 mb-2">
                                      Missing Concepts
                                    </p>

                                    <div className="flex flex-wrap gap-2">
                                      {evaluation.missingConcepts.map(
                                        (item, index) => (
                                          <span
                                            key={index}
                                            className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-300 text-xs"
                                          >
                                            {typeof item === "string" ||
                                            typeof item === "number"
                                              ? String(item)
                                              : item?.concept ||
                                                item?.topic ||
                                                item?.description ||
                                                JSON.stringify(item)}
                                          </span>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* ================= COMMUNICATION ================= */}
                            {evaluation?.communication && (
                              <div className="mb-6">
                                <p className="text-sm font-semibold text-white mb-3">
                                  Communication
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <ScoreBar
                                    label="Clarity"
                                    value={evaluation.communication.clarity}
                                  />

                                  <ScoreBar
                                    label="Articulation"
                                    value={
                                      evaluation.communication.articulation
                                    }
                                  />

                                  <ScoreBar
                                    label="Grammar"
                                    value={evaluation.communication.grammar}
                                  />

                                  <ScoreBar
                                    label="Structure"
                                    value={evaluation.communication.structure}
                                  />
                                </div>
                              </div>
                            )}

                            {/* ================= SENTENCE ANALYSIS ================= */}
                            {evaluation?.sentenceAnalysis?.length > 0 && (
                              <div className="mb-6">
                                <p className="text-sm font-semibold text-white mb-3">
                                  Sentence Analysis
                                </p>

                                <div className="space-y-3">
                                  {evaluation.sentenceAnalysis.map(
                                    (item, index) => (
                                      <div
                                        key={index}
                                        className="rounded-xl bg-white/5 border border-white/10 p-4"
                                      >
                                        <div className="mb-3">
                                          <p className="text-xs uppercase tracking-wider text-white/40 mb-1">
                                            Original
                                          </p>

                                          <p className="text-sm text-white/70">
                                            {item.original}
                                          </p>
                                        </div>

                                        <div className="mb-3">
                                          <p className="text-xs uppercase tracking-wider text-emerald-400/70 mb-1">
                                            Improved
                                          </p>

                                          <p className="text-sm text-emerald-300/90">
                                            {item.corrected}
                                          </p>
                                        </div>

                                        {item.issue && (
                                          <div>
                                            <p className="text-xs uppercase tracking-wider text-white/40 mb-1">
                                              Why
                                            </p>

                                            <p className="text-xs text-white/50 leading-relaxed">
                                              {item.explanation || item.issue}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                            {/* ================= BETTER ANSWER ================= */}
                            {evaluation?.betterAnswer && (
                              <div className="mb-6 rounded-xl border border-accent/20 bg-accent/5 p-4">
                                <p className="text-sm font-semibold text-accent mb-2">
                                  Better Answer
                                </p>

                                <p className="text-sm text-white/75 leading-relaxed">
                                  {evaluation.betterAnswer}
                                </p>
                              </div>
                            )}

                            {/* ================= SUGGESTIONS ================= */}
                            {evaluation?.suggestions?.length > 0 && (
                              <div className="mb-2">
                                <p className="text-sm font-semibold text-yellow-400 mb-3">
                                  → Focus for Improvement
                                </p>

                                <div className="space-y-2">
                                  {evaluation.suggestions.map((item, index) => (
                                    <div
                                      key={index}
                                      className="flex gap-2 text-sm text-white/70"
                                    >
                                      <span className="text-yellow-400 shrink-0">
                                        →
                                      </span>

                                      <span>
                                        {typeof item === "string" ||
                                        typeof item === "number"
                                          ? String(item)
                                          : item?.recommendation ||
                                            item?.description ||
                                            item?.text ||
                                            JSON.stringify(item)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* ================= NEXT QUESTION ================= */}
                            {evaluationReady &&
                              i === conversation.length - 1 && (
                                <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                                  <span className="text-sm text-white/60">
                                    Next question in{" "}
                                    <strong className="text-accent">
                                      {nextQuestionCountdown ?? 10}s
                                    </strong>
                                  </span>

                                  <button
                                    onClick={handleNextQuestion}
                                    disabled={isNextQuestionLoading}
                                    className="px-6 py-2.5 rounded-lg bg-accent text-black font-semibold hover:opacity-90 transition disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Next Question Now →
                                  </button>
                                </div>
                              )}
                          </motion.div>
                        );
                      }

                      // Fallback for any other message type
                      return (
                        <p key={i} className="text-sm text-white/60">
                          <strong>AI:</strong>{" "}
                          {typeof msg.content === "string"
                            ? msg.content
                            : JSON.stringify(msg.content)}
                        </p>
                      );
                    })}
                    <div ref={conversationEndRef} />
                  </div>
                )}
              </motion.div>
            )}

          {status === "ended" && report && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mx-auto w-full max-w-6xl space-y-6 pb-16"
            >
              {/* =========================================================
        REPORT HEADER
    ========================================================= */}
              <GlassCard className="relative overflow-hidden p-6 md:p-8">
                <div className="absolute inset-0 bg-accent/[0.03] pointer-events-none" />

                <div className="relative">
                  <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                    <div>
                      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-green-400/20 bg-green-400/[0.06] px-3 py-1.5">
                        <span className="h-2 w-2 rounded-full bg-green-400" />
                        <span className="text-xs font-medium text-green-300">
                          Interview Completed
                        </span>
                      </div>

                      <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                        Interview Report
                      </h1>

                      <p className="mt-2 text-sm text-white/45">
                        {interview?.company || company} ·{" "}
                        {interview?.role || role}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {(interview?.metadata?.difficulty ||
                          interview?.difficulty ||
                          difficulty) && (
                          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/50">
                            Difficulty:{" "}
                            {interview?.metadata?.difficulty ||
                              interview?.difficulty ||
                              difficulty}
                          </span>
                        )}

                        {(interview?.metadata?.type || type) && (
                          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/50">
                            Type: {interview?.metadata?.type || type}
                          </span>
                        )}

                        {(interview?.duration_minutes || duration) && (
                          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/50">
                            Duration: {interview?.duration_minutes || duration}{" "}
                            min
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs uppercase tracking-wider text-white/35">
                          Overall Score
                        </div>

                        <div className="mt-1 text-5xl font-bold text-white">
                          {Math.round(report.overallScore ?? 0)}
                          <span className="text-2xl text-white/35">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* =========================================================
        OVERALL ASSESSMENT
    ========================================================= */}
              <ReportSection
                title="Overall Assessment"
                subtitle="Your performance across the complete interview."
              >
                <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                  <div>
                    <p className="text-sm leading-7 text-white/65">
                      {report.candidateSummary?.overallAssessment ||
                        report.summary ||
                        "The interview has been evaluated based on your technical responses, communication, and overall performance."}
                    </p>

                    {report.candidateSummary?.hiringRecommendation && (
                      <div className="mt-6 rounded-xl border border-accent/20 bg-accent/[0.04] p-5">
                        <div className="mb-2 text-sm font-semibold text-white">
                          Hiring Recommendation
                        </div>

                        <p className="text-sm leading-6 text-white/60 capitalize">
                          {String(
                            report.candidateSummary.hiringRecommendation,
                          ).replaceAll("_", " ")}
                        </p>
                      </div>
                    )}

                    {report.candidateSummary?.resumeConsistencyScore !=
                      null && (
                      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-5">
                        <div className="mb-2 text-sm font-semibold text-white">
                          Resume Consistency
                        </div>

                        <p className="text-sm leading-6 text-white/60">
                          {report.candidateSummary.resumeConsistencyScore}%
                        </p>
                      </div>
                    )}

                    {Array.isArray(report.finalRecommendations) &&
                      report.finalRecommendations.length > 0 && (
                        <div className="mt-6 rounded-xl border border-accent/20 bg-accent/[0.04] p-5">
                          <div className="mb-3 text-sm font-semibold text-white">
                            Final Recommendations
                          </div>

                          <BulletList items={report.finalRecommendations} />
                        </div>
                      )}
                  </div>

                  <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                    <div className="text-center">
                      <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border-8 border-accent/20">
                        <div>
                          <div className="text-3xl font-bold text-white">
                            {Math.round(report.overallScore ?? 0)}
                          </div>

                          <div className="text-xs text-white/40">
                            out of 100
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <ScoreBadge score={report.overallScore} />
                      </div>
                    </div>
                  </div>
                </div>
              </ReportSection>

              {/* =========================================================
        PERFORMANCE BREAKDOWN
    ========================================================= */}
              <ReportSection
                title="Performance Breakdown"
                subtitle="How you performed across the major evaluation dimensions."
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <MetricCard
                    label="Technical"
                    value={report.metrics?.technicalAccuracy ?? 0}
                    description="Technical correctness and depth."
                  />

                  <MetricCard
                    label="Communication"
                    value={report.metrics?.communication ?? 0}
                    description="Clarity and effectiveness."
                  />

                  <MetricCard
                    label="Completeness"
                    value={report.metrics?.completeness ?? 0}
                    description="Coverage of important concepts."
                  />

                  <MetricCard
                    label="Relevance"
                    value={report.metrics?.relevance ?? 0}
                    description="How directly answers addressed the questions."
                  />

                  <MetricCard
                    label="Confidence"
                    value={report.metrics?.confidence ?? null}
                    description="AI-observed confidence indicators."
                  />
                </div>

                <div className="mt-7 space-y-5">
                  <ScoreBar
                    label="Technical Knowledge"
                    value={report.metrics?.technicalAccuracy ?? 0}
                  />

                  <ScoreBar
                    label="Communication"
                    value={report.metrics?.communication ?? 0}
                  />

                  <ScoreBar
                    label="Completeness"
                    value={report.metrics?.completeness ?? 0}
                  />

                  <ScoreBar
                    label="Relevance"
                    value={report.metrics?.relevance ?? 0}
                  />
                </div>
              </ReportSection>

              {/* =========================================================
        INTERVIEW STATISTICS
    ========================================================= */}
              {Array.isArray(report.questionAnalysis) &&
                report.questionAnalysis.length > 0 && (
                  <ReportSection
                    title="Interview Statistics"
                    subtitle="A summary calculated from the questions and evaluations recorded during the interview."
                  >
                    {(() => {
                      const questions = report.questionAnalysis;

                      const answered = questions.filter(
                        (q) =>
                          q?.candidateAnswer ||
                          (Array.isArray(q?.attempts) && q.attempts.length > 0),
                      ).length;

                      const totalAttempts = questions.reduce(
                        (total, q) =>
                          total +
                          (Array.isArray(q?.attempts) ? q.attempts.length : 1),
                        0,
                      );

                      const averageScore =
                        questions.length > 0
                          ? Math.round(
                              questions.reduce(
                                (total, q) =>
                                  total +
                                  Number(q?.score ?? q?.finalScore ?? 0),
                                0,
                              ) / questions.length,
                            )
                          : 0;

                      const totalWords = questions.reduce((total, q) => {
                        const attempts = Array.isArray(q?.attempts)
                          ? q.attempts
                          : [];

                        const answer =
                          q?.candidateAnswer ||
                          attempts[attempts.length - 1]?.candidateAnswer ||
                          "";

                        return (
                          total +
                          String(answer).trim().split(/\s+/).filter(Boolean)
                            .length
                        );
                      }, 0);

                      return (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                          <MetricCard
                            label="Questions"
                            value={questions.length}
                            suffix=""
                            description="Questions evaluated."
                          />

                          <MetricCard
                            label="Answered"
                            value={answered}
                            suffix=""
                            description="Questions with a recorded response."
                          />

                          <MetricCard
                            label="Attempts"
                            value={totalAttempts}
                            suffix=""
                            description="Total answer attempts."
                          />

                          <MetricCard
                            label="Average Score"
                            value={averageScore}
                            description="Average question score."
                          />

                          <MetricCard
                            label="Words"
                            value={totalWords}
                            suffix=""
                            description="Approximate words spoken."
                          />
                        </div>
                      );
                    })()}
                  </ReportSection>
                )}

              {/* =========================================================
        STRENGTHS / WEAKNESSES
    ========================================================= */}
              <div className="grid gap-6 lg:grid-cols-2">
                <ReportSection
                  title="What You Did Well"
                  subtitle="The strongest areas identified during the interview."
                >
                  <BulletList items={report.strengths || []} />
                </ReportSection>

                <ReportSection
                  title="Areas to Improve"
                  subtitle="The most important weaknesses identified."
                >
                  <BulletList items={report.weaknesses || []} />
                </ReportSection>
              </div>

              {/* =========================================================
        TECHNICAL ANALYSIS
    ========================================================= */}
              {report.technicalAnalysis && (
                <ReportSection
                  title="Technical Analysis"
                  subtitle="Your technical strengths, gaps, and areas that need deeper preparation."
                >
                  <div className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Strong Areas */}
                      <div>
                        <div className="mb-3 text-sm font-semibold text-white">
                          Strong Technical Areas
                        </div>

                        <BulletList
                          items={
                            report.technicalAnalysis.strongAreas ||
                            report.technicalAnalysis.strengths ||
                            []
                          }
                        />
                      </div>

                      {/* Weak Areas */}
                      <div>
                        <div className="mb-3 text-sm font-semibold text-white">
                          Areas to Improve
                        </div>

                        <BulletList
                          items={report.technicalAnalysis.weakAreas || []}
                        />
                      </div>
                    </div>

                    {/* Skill Gaps */}
                    {Array.isArray(report.technicalAnalysis.skillGaps) &&
                      report.technicalAnalysis.skillGaps.length > 0 && (
                        <div>
                          <div className="mb-3 text-sm font-semibold text-white">
                            Skill Gaps
                          </div>

                          <div className="space-y-3">
                            {report.technicalAnalysis.skillGaps.map(
                              (gap, index) => (
                                <div
                                  key={index}
                                  className="rounded-xl border border-white/10 bg-white/[0.025] p-4"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="font-medium text-white">
                                      {gap?.skill || "Technical Skill"}
                                    </div>

                                    {gap?.level && (
                                      <span className="rounded-full bg-accent/10 px-3 py-1 text-xs capitalize text-white/70">
                                        {gap.level}
                                      </span>
                                    )}
                                  </div>

                                  {gap?.evidence && (
                                    <p className="mt-3 text-sm leading-6 text-white/55">
                                      <span className="font-medium text-white/70">
                                        Evidence:{" "}
                                      </span>
                                      {gap.evidence}
                                    </p>
                                  )}

                                  {gap?.recommendation && (
                                    <p className="mt-2 text-sm leading-6 text-white/55">
                                      <span className="font-medium text-white/70">
                                        Recommendation:{" "}
                                      </span>
                                      {gap.recommendation}
                                    </p>
                                  )}
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </ReportSection>
              )}

              {/* =========================================================
        COMMUNICATION
    ========================================================= */}
              {report.communicationAnalysis && (
                <ReportSection
                  title="Communication Analysis"
                  subtitle="How effectively you communicated your technical knowledge."
                >
                  <div className="grid gap-5 md:grid-cols-2">
                    <ScoreBar
                      label="Overall"
                      value={report.communicationAnalysis.overallScore ?? 0}
                    />

                    <ScoreBar
                      label="Clarity"
                      value={report.communicationAnalysis.clarity ?? 0}
                    />

                    <ScoreBar
                      label="Articulation"
                      value={report.communicationAnalysis.articulation ?? 0}
                    />

                    <ScoreBar
                      label="Grammar"
                      value={report.communicationAnalysis.grammar ?? 0}
                    />

                    <ScoreBar
                      label="Structure"
                      value={report.communicationAnalysis.structure ?? 0}
                    />

                    <ScoreBar
                      label="Vocabulary"
                      value={report.communicationAnalysis.vocabulary ?? 0}
                    />
                  </div>

                  {Array.isArray(report.communicationAnalysis.observations) &&
                    report.communicationAnalysis.observations.length > 0 && (
                      <div className="mt-6">
                        <div className="mb-3 text-sm font-semibold text-white">
                          Observations
                        </div>

                        <BulletList
                          items={report.communicationAnalysis.observations}
                        />
                      </div>
                    )}
                </ReportSection>
              )}

              {/* =========================================================
        RESUME CONSISTENCY
    ========================================================= */}
              {(report.resumeAnalysis ||
                report.candidateSummary?.resumeConsistencyScore != null) && (
                <ReportSection
                  title="Resume Consistency"
                  subtitle="Whether your interview responses were consistent with the skills and experience represented in your resume."
                >
                  <div className="grid gap-6 md:grid-cols-[220px_1fr]">
                    {/* Score */}
                    <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-white">
                          {report.resumeAnalysis?.consistencyScore ??
                            report.candidateSummary?.resumeConsistencyScore ??
                            "—"}
                          {(report.resumeAnalysis?.consistencyScore ??
                            report.candidateSummary?.resumeConsistencyScore) !=
                            null && "%"}
                        </div>

                        <div className="mt-1 text-xs text-white/40">
                          Consistency Score
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {/* Supported Skills */}
                      {Array.isArray(report.resumeAnalysis?.supportedSkills) &&
                        report.resumeAnalysis.supportedSkills.length > 0 && (
                          <div>
                            <div className="mb-3 text-sm font-semibold text-white">
                              Supported Skills
                            </div>

                            <BulletList
                              items={report.resumeAnalysis.supportedSkills}
                            />
                          </div>
                        )}

                      {/* Weakly Supported Skills */}
                      {Array.isArray(
                        report.resumeAnalysis?.weaklySupportedSkills,
                      ) &&
                        report.resumeAnalysis.weaklySupportedSkills.length >
                          0 && (
                          <div>
                            <div className="mb-3 text-sm font-semibold text-white">
                              Weakly Supported Skills
                            </div>

                            <BulletList
                              items={
                                report.resumeAnalysis.weaklySupportedSkills
                              }
                            />
                          </div>
                        )}

                      {/* Unverified Skills */}
                      {Array.isArray(report.resumeAnalysis?.unverifiedSkills) &&
                        report.resumeAnalysis.unverifiedSkills.length > 0 && (
                          <div>
                            <div className="mb-3 text-sm font-semibold text-white">
                              Unverified Skills
                            </div>

                            <BulletList
                              items={report.resumeAnalysis.unverifiedSkills}
                            />
                          </div>
                        )}

                      {/* Contradictions */}
                      {Array.isArray(report.resumeAnalysis?.contradictions) &&
                        report.resumeAnalysis.contradictions.length > 0 && (
                          <div>
                            <div className="mb-3 text-sm font-semibold text-white">
                              Contradictions
                            </div>

                            <BulletList
                              items={report.resumeAnalysis.contradictions}
                            />
                          </div>
                        )}
                    </div>
                  </div>
                </ReportSection>
              )}

              {/* =========================================================
        QUESTION-BY-QUESTION REVIEW
    ========================================================= */}
              {Array.isArray(report.questionAnalysis) &&
                report.questionAnalysis.length > 0 && (
                  <ReportSection
                    title="Question-by-Question Review"
                    subtitle="Open any question to see your exact response, evaluation, mistakes, corrections, and better answer."
                  >
                    <div className="space-y-3">
                      {report.questionAnalysis.map((item, index) => (
                        <QuestionReportCard
                          key={
                            item?.questionId || item?.questionNumber || index
                          }
                          item={item}
                          index={index}
                        />
                      ))}
                    </div>
                  </ReportSection>
                )}

              {/* =========================================================
        LEARNING PLAN
    ========================================================= */}
              {report.learningPlan && (
                <ReportSection
                  title="Personalized Learning Plan"
                  subtitle="What you should work on after this interview."
                >
                  {Array.isArray(report.learningPlan) ? (
                    <div className="space-y-3">
                      {report.learningPlan.map((item, index) => (
                        <div
                          key={index}
                          className="rounded-xl border border-white/10 bg-white/[0.025] p-5"
                        >
                          <div className="flex gap-4">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-sm font-semibold text-white">
                              {index + 1}
                            </div>

                            <div className="flex-1">
                              {typeof item === "string" ? (
                                <p className="text-sm leading-7 text-white/65">
                                  {item}
                                </p>
                              ) : (
                                <>
                                  <div className="font-medium text-white">
                                    {item?.area || "Learning Area"}
                                  </div>

                                  {item?.whyItMatters && (
                                    <p className="mt-2 text-sm leading-6 text-white/55">
                                      <span className="font-medium text-white/70">
                                        Why it matters:{" "}
                                      </span>
                                      {item.whyItMatters}
                                    </p>
                                  )}

                                  {item?.whatToStudy && (
                                    <p className="mt-2 text-sm leading-6 text-white/55">
                                      <span className="font-medium text-white/70">
                                        What to study:{" "}
                                      </span>
                                      {item.whatToStudy}
                                    </p>
                                  )}

                                  {item?.priority && (
                                    <span className="mt-3 inline-block rounded-full bg-accent/10 px-3 py-1 text-xs capitalize text-white/70">
                                      Priority: {item.priority}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-sm leading-7 text-white/60">
                      {typeof report.learningPlan === "string"
                        ? report.learningPlan
                        : JSON.stringify(report.learningPlan, null, 2)}
                    </div>
                  )}
                </ReportSection>
              )}

              {/* =========================================================
        FINAL RECOMMENDATIONS
    ========================================================= */}
              <ReportSection
                title="What to Do Next"
                subtitle="Your highest-value actions after this interview."
              >
                <BulletList
                  items={
                    report.recommendations || report.finalRecommendations || []
                  }
                  emptyText="Continue practicing the concepts identified in the question analysis."
                />
              </ReportSection>

              {/* =========================================================
        ACTIONS
    ========================================================= */}
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
                <Button onClick={() => navigate("/dashboard")}>
                  Go to Dashboard
                </Button>

                <Button variant="ghost" onClick={() => navigate("/resume")}>
                  Start Another Interview
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
