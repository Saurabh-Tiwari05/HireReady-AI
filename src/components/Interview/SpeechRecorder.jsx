// SpeechRecorder Component - main speech recognition interface

import { useRef, useEffect, useState } from "react";

import useSpeechRecognition from "../../hooks/useSpeechRecognition";
import TranscriptBox from "./TranscriptBox";
import MicStatus from "./MicStatus";
import SpeechService from "../../services/speech.service";

const SILENCE_LIMIT_MS = 7000;
const FINAL_RESULT_SETTLE_MS = 1200;

const SpeechRecorder = ({
  interviewId,
  contextId,
  questionId,
  onStatusChange,
  isQuestionActive,
}) => {
  // ==================================================
  // REFS
  // ==================================================

  const autoSaveRef = useRef(null);

  const submittedRef = useRef(false);

  const finalizingRef = useRef(false);

  const latestTranscriptRef = useRef("");

  const lastSpeechAtRef = useRef(null);

  const silenceMonitorRef = useRef(null);

  const finalizationTimeoutRef = useRef(null);

  const previousQuestionIdRef = useRef(questionId);

  // Tracks the question associated with an API submission.
  const activeSubmissionQuestionRef = useRef(null);

  // Tracks whether the component is still mounted.
  const mountedRef = useRef(true);

  // Prevent stale asynchronous work from affecting
  // a newly generated question.
  const questionGenerationRef = useRef(0);

  // Keep the latest parent callback available.
  const onStatusChangeRef = useRef(onStatusChange);

  onStatusChangeRef.current = onStatusChange;

  // ==================================================
  // STATE
  // ==================================================

  const [isProcessing, setIsProcessing] = useState(false);

  const [silenceSeconds, setSilenceSeconds] = useState(null);

  const [submissionError, setSubmissionError] = useState(null);

  const [hasSubmitted, setHasSubmitted] = useState(false);

  const [isFinalizing, setIsFinalizing] = useState(false);

  const [retryTranscript, setRetryTranscript] = useState("");

  const [retryAlternatives, setRetryAlternatives] = useState([]);

  // ==================================================
  // HELPERS
  // ==================================================

  const notifyParent = (data) => {
    onStatusChangeRef.current?.(data);
  };

  const stopSilenceMonitoring = () => {
    clearInterval(silenceMonitorRef.current);

    silenceMonitorRef.current = null;

    setSilenceSeconds(null);
  };

  const clearAutoSave = () => {
    clearTimeout(autoSaveRef.current);

    autoSaveRef.current = null;
  };

  const clearFinalizationTimeout = () => {
    clearTimeout(finalizationTimeoutRef.current);

    finalizationTimeoutRef.current = null;
  };

  // ==================================================
  // SPEECH RECOGNITION
  // ==================================================

  const {
    isSupported,
    isListening,
    isRecording,
    isPaused,
    transcript,
    interimTranscript,
    error,
    wordCount,
    elapsedTime,
    start,
    stop,
    pause,
    resume,
    clear,
    getLatestTranscript,
    getLatestAlternatives,
  } = useSpeechRecognition({
    continuous: true,

    interimResults: true,

    language: "en-US",

    autoSaveInterval: 3000,

    // Silence detection is handled by this component.
    maxSilenceTimeout: 0,

    // ----------------------------------------------
    // LIVE TRANSCRIPT
    // ----------------------------------------------

    onTranscriptUpdate: (fullTranscript) => {
      if (finalizingRef.current || submittedRef.current) {
        return;
      }

      const latest = fullTranscript || "";

      const previousTranscript = latestTranscriptRef.current;

      latestTranscriptRef.current = latest;

      if (latest.trim() && latest !== previousTranscript) {
        lastSpeechAtRef.current = Date.now();
      }

      setSilenceSeconds(null);

      notifyParent({
        type: "transcript",
        transcript: latest,
      });
    },

    // ----------------------------------------------
    // RECOGNITION STATUS
    // ----------------------------------------------

    onStatusChange: (status) => {
      if (!status) {
        return;
      }

      if (status.type === "speechstart") {
        if (!finalizingRef.current && !submittedRef.current) {
          lastSpeechAtRef.current = Date.now();

          setSilenceSeconds(null);
        }
      }

      notifyParent(status);
    },

    // ----------------------------------------------
    // FINAL TRANSCRIPT SEGMENT
    // ----------------------------------------------

    onFinalTranscript: (finalTranscript) => {
      if (!finalizingRef.current && !submittedRef.current) {
        lastSpeechAtRef.current = Date.now();

        setSilenceSeconds(null);
      }

      notifyParent({
        type: "final_transcript",
        transcript: finalTranscript,
      });
    },

    // ----------------------------------------------
    // RECOGNITION ERROR
    // ----------------------------------------------

    onError: (err) => {
      console.error("[SPEECH] Recognition error:", err);

      notifyParent({
        type: "error",
        error: err,
      });
    },
  });

  // ==================================================
  // QUESTION CHANGE RESET
  // ==================================================

  useEffect(() => {
    if (previousQuestionIdRef.current === questionId) {
      return;
    }

    console.log("[SPEECH] New question detected:", questionId);

    previousQuestionIdRef.current = questionId;

    // Invalidate any pending finalization.
    questionGenerationRef.current += 1;

    submittedRef.current = false;

    finalizingRef.current = false;

    activeSubmissionQuestionRef.current = null;

    latestTranscriptRef.current = "";

    lastSpeechAtRef.current = null;

    stopSilenceMonitoring();

    clearAutoSave();

    clearFinalizationTimeout();

    setIsProcessing(false);

    setIsFinalizing(false);

    setHasSubmitted(false);

    setSubmissionError(null);

    setRetryTranscript("");

    setRetryAlternatives([]);

    stop();

    clear();
  }, [questionId, stop, clear]);

  // ==================================================
  // WAIT FOR FINAL BROWSER RECOGNITION RESULT
  // ==================================================

  const waitForFinalRecognitionResult = () => {
    return new Promise((resolve) => {
      clearTimeout(finalizationTimeoutRef.current);

      finalizationTimeoutRef.current = setTimeout(() => {
        finalizationTimeoutRef.current = null;

        resolve();
      }, FINAL_RESULT_SETTLE_MS);
    });
  };

  // ==================================================
  // SUBMIT ANSWER
  // ==================================================

  const submitAnswer = async (finalTranscript, { alternatives = [] } = {}) => {
    const cleanedTranscript = finalTranscript?.trim() || "";

    if (!cleanedTranscript) {
      console.warn("[SPEECH] Empty answer cannot be submitted.");

      return;
    }

    if (!interviewId || !contextId || !questionId) {
      console.error("[SPEECH] Missing interview identifiers.");

      setSubmissionError(
        "Interview information is missing. Unable to submit answer.",
      );

      return;
    }

    if (submittedRef.current) {
      console.warn("[SPEECH] Duplicate submission prevented.");

      return;
    }

    const submissionQuestionId = questionId;

    const submissionGeneration = questionGenerationRef.current;

    submittedRef.current = true;

    activeSubmissionQuestionRef.current = submissionQuestionId;

    setIsProcessing(true);

    setSubmissionError(null);

    setRetryTranscript(cleanedTranscript);

    setRetryAlternatives(alternatives);

    stopSilenceMonitoring();

    clearAutoSave();

    notifyParent({
      type: "evaluation_start",
    });

    console.log("[SPEECH] Submitting answer:", {
      interviewId,
      contextId,
      questionId,
      transcript: cleanedTranscript,
    });

    try {
      const endTime = Date.now();

      const responseDuration = Math.max(0, elapsedTime);

      const startTime = endTime - responseDuration;

      const result = await SpeechService.submitTranscript({
        interviewId,

        contextId,

        questionId: submissionQuestionId,

        transcript: cleanedTranscript,

        alternatives,

        startTime,

        endTime,

        responseDuration,

        wordCount: cleanedTranscript.split(/\s+/).filter(Boolean).length,

        topic: "general",

        difficulty: "medium",
      });

      // Ignore a response belonging to an older question.
      if (
        !mountedRef.current ||
        questionGenerationRef.current !== submissionGeneration
      ) {
        return;
      }

      console.log("[SPEECH] Answer submitted successfully:", result);

      const evaluation = result?.data?.evaluation ?? null;

      setHasSubmitted(true);

      setSubmissionError(null);

      setRetryTranscript("");

      setRetryAlternatives([]);

      notifyParent({
        type: "evaluation",

        evaluation,

        transcript: cleanedTranscript,
      });
    } catch (err) {
      console.error("[SPEECH] Submission failed:", err);

      if (
        !mountedRef.current ||
        questionGenerationRef.current !== submissionGeneration
      ) {
        return;
      }

      submittedRef.current = false;

      setHasSubmitted(false);

      setSubmissionError(
        err?.message || "Answer evaluation failed. Please try again.",
      );

      // Preserve the answer for retry.
      latestTranscriptRef.current = cleanedTranscript;

      setRetryTranscript(cleanedTranscript);

      setRetryAlternatives(alternatives);

      notifyParent({
        type: "evaluation_end",
      });

      notifyParent({
        type: "error",

        error: err,
      });
    } finally {
      if (
        mountedRef.current &&
        questionGenerationRef.current === submissionGeneration
      ) {
        setIsProcessing(false);
      }
    }
  };

  // ==================================================
  // FINALIZE RECORDING
  // ==================================================

  const finalizeRecording = async (reason = "manual") => {
    if (
      finalizingRef.current ||
      submittedRef.current ||
      isProcessing ||
      !isQuestionActive
    ) {
      return;
    }

    finalizingRef.current = true;

    setIsFinalizing(true);

    const currentGeneration = questionGenerationRef.current;

    console.log(`[SPEECH] Finalizing recording: ${reason}`);

    stopSilenceMonitoring();

    clearAutoSave();

    try {
      // Stop recognition first.
      stop();

      // Wait for late browser final results.
      await waitForFinalRecognitionResult();

      // Ignore finalization from an older question.
      if (
        !mountedRef.current ||
        questionGenerationRef.current !== currentGeneration
      ) {
        return;
      }

      const finalAnswer = getLatestTranscript();

      const alternatives = getLatestAlternatives();

      latestTranscriptRef.current = finalAnswer || "";

      lastSpeechAtRef.current = null;

      console.log("[SPEECH] Final transcript:", finalAnswer);

      if (!finalAnswer?.trim()) {
        console.warn("[SPEECH] No answer detected.");

        setSubmissionError(
          "No speech was detected. Please record your answer again.",
        );

        return;
      }

      await submitAnswer(finalAnswer, {
        alternatives,
      });
    } catch (err) {
      console.error("[SPEECH] Finalization error:", err);

      if (
        mountedRef.current &&
        questionGenerationRef.current === currentGeneration
      ) {
        setSubmissionError(err?.message || "Unable to finalize recording.");
      }
    } finally {
      if (
        mountedRef.current &&
        questionGenerationRef.current === currentGeneration
      ) {
        finalizingRef.current = false;

        setIsFinalizing(false);
      }
    }
  };

  // ==================================================
  // MANUAL STOP
  // ==================================================

  const handleStop = () => {
    console.log("[SPEECH] Manual stop requested.");

    finalizeRecording("manual");
  };

  // ==================================================
  // AUTOMATIC SILENCE SUBMISSION
  // ==================================================

  const handleSilenceTimeout = () => {
    console.log("[SPEECH] Seven seconds of silence detected.");

    finalizeRecording("silence");
  };

  // ==================================================
  // START RECORDING
  // ==================================================

  const handleStart = () => {
    if (
      isProcessing ||
      isFinalizing ||
      finalizingRef.current ||
      submittedRef.current ||
      !isQuestionActive
    ) {
      return;
    }

    if (!questionId) {
      console.warn("[SPEECH] Question ID missing.");

      return;
    }

    console.log("[SPEECH] Starting answer recording.");

    setSubmissionError(null);

    setRetryTranscript("");

    setRetryAlternatives([]);

    latestTranscriptRef.current = "";

    lastSpeechAtRef.current = Date.now();

    stopSilenceMonitoring();

    clearAutoSave();

    clearFinalizationTimeout();

    start();
  };

  // ==================================================
  // START / STOP BUTTON
  // ==================================================

  const handleToggleRecording = () => {
    if (
      isProcessing ||
      isFinalizing ||
      finalizingRef.current ||
      !isQuestionActive
    ) {
      return;
    }

    if (isRecording) {
      handleStop();

      return;
    }

    handleStart();
  };

  // ==================================================
  // RETRY FAILED SUBMISSION
  // ==================================================

  const handleRetrySubmission = async () => {
    if (
      !isQuestionActive ||
      isProcessing ||
      isFinalizing ||
      submittedRef.current ||
      !retryTranscript.trim()
    ) {
      return;
    }

    console.log("[SPEECH] Retrying previous answer submission.");

    await submitAnswer(retryTranscript, {
      alternatives: retryAlternatives,
    });
  };

  // ==================================================
  // SEVEN-SECOND SILENCE MONITOR
  // ==================================================

  useEffect(() => {
    if (
      !isRecording ||
      isPaused ||
      isProcessing ||
      isFinalizing ||
      !isQuestionActive
    ) {
      clearInterval(silenceMonitorRef.current);

      silenceMonitorRef.current = null;

      setSilenceSeconds(null);

      return;
    }

    if (!lastSpeechAtRef.current) {
      lastSpeechAtRef.current = Date.now();
    }

    clearInterval(silenceMonitorRef.current);

    silenceMonitorRef.current = setInterval(() => {
      if (
        !isRecording ||
        isPaused ||
        isProcessing ||
        finalizingRef.current ||
        submittedRef.current
      ) {
        return;
      }

      const now = Date.now();

      const silenceDuration = now - lastSpeechAtRef.current;

      const remainingMs = SILENCE_LIMIT_MS - silenceDuration;

      if (remainingMs > 0) {
        const remainingSeconds = Math.ceil(remainingMs / 1000);

        if (remainingSeconds <= 3) {
          setSilenceSeconds(remainingSeconds);
        } else {
          setSilenceSeconds(null);
        }

        return;
      }

      clearInterval(silenceMonitorRef.current);

      silenceMonitorRef.current = null;

      setSilenceSeconds(0);

      handleSilenceTimeout();
    }, 250);

    return () => {
      clearInterval(silenceMonitorRef.current);

      silenceMonitorRef.current = null;
    };
  }, [isRecording, isPaused, isProcessing, isFinalizing, isQuestionActive]);

  // ==================================================
  // RESET SILENCE WARNING WHEN TRANSCRIPT CHANGES
  // ==================================================

  useEffect(() => {
    if (transcript?.trim()) {
      setSilenceSeconds(null);
    }
  }, [transcript]);

  // ==================================================
  // AUTO-SAVE INTERIM TRANSCRIPT
  // ==================================================

  useEffect(() => {
    if (
      !interimTranscript ||
      error ||
      !isRecording ||
      isPaused ||
      isProcessing ||
      isFinalizing ||
      !isQuestionActive
    ) {
      clearTimeout(autoSaveRef.current);

      return;
    }

    clearTimeout(autoSaveRef.current);

    const saveStartTime = Date.now() - elapsedTime;

    autoSaveRef.current = setTimeout(() => {
      SpeechService.autoSaveTranscript({
        interviewId,

        contextId,

        questionId,

        transcript: interimTranscript,

        isFinal: false,

        startTime: saveStartTime,
      }).catch((saveErr) => {
        console.error("[SPEECH] Auto-save error:", saveErr);
      });
    }, 3000);

    return () => {
      clearTimeout(autoSaveRef.current);
    };
  }, [
    interimTranscript,
    interviewId,
    contextId,
    questionId,
    isRecording,
    isPaused,
    isProcessing,
    isFinalizing,
    isQuestionActive,
    error,
  ]);

  // ==================================================
  // STOP RECORDING WHEN QUESTION BECOMES INACTIVE
  // ==================================================

  useEffect(() => {
    if (!isQuestionActive && isRecording && !isProcessing) {
      console.log("[SPEECH] Question inactive. Stopping microphone.");

      stopSilenceMonitoring();

      clearAutoSave();

      lastSpeechAtRef.current = null;

      stop();
    }
  }, [isQuestionActive, isRecording, isProcessing, stop]);

  // ==================================================
  // CLEANUP
  // ==================================================

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      questionGenerationRef.current += 1;

      clearTimeout(autoSaveRef.current);

      clearTimeout(finalizationTimeoutRef.current);

      clearInterval(silenceMonitorRef.current);

      lastSpeechAtRef.current = null;
    };
  }, []);

  // ==================================================
  // RESET CURRENT RECORDING
  // ==================================================

  const handleReset = () => {
    if (
      isProcessing ||
      isFinalizing ||
      finalizingRef.current ||
      submittedRef.current ||
      !isQuestionActive
    ) {
      return;
    }

    console.log("[SPEECH] Resetting current answer.");

    // Stop silence countdown and pending timers.
    stopSilenceMonitoring();
    clearAutoSave();
    clearFinalizationTimeout();

    // Discard current recording without submitting.
    clear();

    // Reset local transcript tracking.
    latestTranscriptRef.current = "";
    lastSpeechAtRef.current = null;

    // Clear errors and retry data.
    setSubmissionError(null);
    setRetryTranscript("");
    setRetryAlternatives([]);

    console.log("[SPEECH] Answer discarded. Ready to record again.");
  };

  // ==================================================
  // UI
  // ==================================================

  const controlsLocked =
    !isSupported ||
    isProcessing ||
    isFinalizing ||
    !isQuestionActive ||
    hasSubmitted;

  return (
    <div className="flex flex-col h-full space-y-5 bg-gray-900 text-white p-4 overflow-hidden">
      {/* ==============================================
          MICROPHONE STATUS
      ============================================== */}

      <div className="w-full max-w-md mx-auto text-center">
        <MicStatus
          isListening={isListening}
          isRecording={isRecording}
          isPaused={isPaused}
          isSupported={isSupported}
          error={error}
        />
      </div>

      {/* ==============================================
          LIVE TRANSCRIPT
      ============================================== */}

      <TranscriptBox
        transcript={transcript}
        interimTranscript={interimTranscript}
        isFinal={!isRecording || !!error}
        isRecording={isRecording}
        error={error}
      />

      {/* ==============================================
          SILENCE WARNING
      ============================================== */}

      {silenceSeconds !== null &&
        isRecording &&
        !isPaused &&
        !isProcessing &&
        !isFinalizing && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-900/70 border border-yellow-600 text-yellow-200 text-sm">
              <span>⚠️</span>

              <span>
                No speech detected. Auto-submit in{" "}
                <strong>{silenceSeconds}s</strong>
              </span>
            </div>
          </div>
        )}

      {/* ==============================================
          SUBMISSION ERROR
      ============================================== */}

      {submissionError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-300">{submissionError}</p>
        </div>
      )}

      {/* ==============================================
          CONTROLS
      ============================================== */}

      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-800 rounded-lg px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* START / STOP */}

          <button
            onClick={handleToggleRecording}
            disabled={controlsLocked}
            className={`px-4 py-2 text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed ${
              isProcessing
                ? "bg-gray-600"
                : isRecording
                  ? "bg-red-700 hover:bg-red-800"
                  : "bg-green-700 hover:bg-green-800"
            }`}
          >
            {isProcessing
              ? "Evaluating..."
              : isFinalizing
                ? "Finalizing..."
                : hasSubmitted
                  ? "Answer Submitted"
                  : !isQuestionActive
                    ? "Waiting for Question"
                    : isRecording
                      ? "Stop"
                      : "Start"}
          </button>

          {/* PAUSE / RESUME */}

          {isRecording && !isProcessing && !isFinalizing && (
            <button
              onClick={() => {
                if (isPaused) {
                  lastSpeechAtRef.current = Date.now();

                  resume();
                } else {
                  pause();
                }
              }}
              disabled={!isQuestionActive}
              className="px-4 py-2 bg-yellow-700 text-sm font-medium rounded hover:bg-yellow-800 disabled:opacity-50"
            >
              {isPaused ? "Resume" : "Pause"}
            </button>
          )}

          {/* RESET */}

          {/* RESET */}

          {!isProcessing &&
            !isFinalizing &&
            !hasSubmitted &&
            isQuestionActive && (
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 bg-gray-600 text-sm font-medium rounded hover:bg-gray-700 transition-colors"
              >
                Reset
              </button>
            )}

          {/* RETRY FAILED SUBMISSION */}

          {submissionError &&
            retryTranscript.trim() &&
            !isProcessing &&
            !isFinalizing &&
            !hasSubmitted &&
            isQuestionActive && (
              <button
                onClick={handleRetrySubmission}
                className="px-4 py-2 bg-accent text-black text-sm font-semibold rounded hover:opacity-90"
              >
                Retry Submission
              </button>
            )}
        </div>

        {/* PROCESSING INDICATOR */}

        {isProcessing && (
          <div className="text-sm text-yellow-300">⏳ Evaluating answer...</div>
        )}

        {isFinalizing && !isProcessing && (
          <div className="text-sm text-yellow-300">
            ⏳ Finalizing transcript...
          </div>
        )}

        {hasSubmitted && !isProcessing && (
          <div className="text-sm text-green-300">✓ Answer submitted</div>
        )}
      </div>

      {/* ==============================================
          STATUS / STATS
      ============================================== */}

      <div className="text-xs opacity-70 flex items-center space-x-2 justify-end">
        {error && (
          <span className="text-red-300 font-medium bg-red-900 px-2 py-1 rounded">
            {typeof error === "string"
              ? error
              : error?.message || "Speech recognition error"}
          </span>
        )}

        <span>Duration: {Math.floor(elapsedTime / 1000)}s</span>

        <span>Words: {wordCount}</span>
      </div>
    </div>
  );
};

export default SpeechRecorder;
