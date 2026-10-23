// SpeechRecorder Component - main speech recognition interface
import React, { useRef, useEffect, useState } from "react";
import useSpeechRecognition from "../../hooks/useSpeechRecognition";
import TranscriptBox from "./TranscriptBox";
import MicStatus from "./MicStatus";
import SpeechService from "../../services/speech.service";

const SpeechRecorder = ({
  interviewId,
  contextId,
  questionId,
  onStatusChange,
  isQuestionActive,
}) => {
  const autoSaveRef = useRef(null);
  const stopTimeoutRef = useRef(null);

  // Prevent duplicate answer submissions
  const submittedRef = useRef(false);

  // Always keeps the latest transcript available
  // even before React state finishes updating.
  const latestTranscriptRef = useRef("");

  // --------------------------------------------------
  // Silence monitoring
  // --------------------------------------------------

  // Timestamp of the most recent actual speech/transcript activity.
  const lastSpeechAtRef = useRef(null);

  // Interview-level silence monitor.
  const silenceMonitorRef = useRef(null);

  // UI countdown.
  const silenceTimerRef = useRef(null);

  // Used when waiting for late browser recognition results
  // after stop() has been called.
  const finalizationTimeoutRef = useRef(null);

  // Auto-submit after 7 seconds of genuine silence.
  const SILENCE_LIMIT_MS = 7000;

  /*
   * IMPORTANT:
   *
   * SpeechRecognition can sometimes deliver its final
   * result slightly AFTER stop() is called.
   *
   * Give the browser a short settling period before
   * reading the final transcript.
   */
  const FINAL_RESULT_SETTLE_MS = 1200;

  // API processing state
  const [isProcessing, setIsProcessing] = useState(false);

  // Silence countdown state
  const [silenceSeconds, setSilenceSeconds] = useState(null);

  // --------------------------------------------------
  // Speech recognition configuration
  // --------------------------------------------------

  const speechParams = {
    continuous: true,
    interimResults: true,
    language: "en-US",

    autoSaveInterval: 3000,

    /*
     * IMPORTANT:
     *
     * SpeechRecorder owns interview-level silence
     * detection.
     *
     * The speech hook should NOT stop recognition
     * because of silence.
     */
    maxSilenceTimeout: 0,
  };

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
    ...speechParams,

    // --------------------------------------------------
    // Live transcript
    // --------------------------------------------------

    onTranscriptUpdate: (fullTranscript) => {
      const latest = fullTranscript || "";

      /*
       * Keep the latest transcript outside React state.
       */
      latestTranscriptRef.current = latest;

      /*
       * Any transcript activity means the candidate
       * is still answering.
       */
      if (latest.trim()) {
        lastSpeechAtRef.current = Date.now();
      }

      // Candidate is active again.
      setSilenceSeconds(null);

      if (onStatusChange) {
        onStatusChange({
          type: "transcript",
          transcript: latest,
        });
      }
    },

    // --------------------------------------------------
    // Speech recognition status
    // --------------------------------------------------
    //
    // useSpeechRecognition now sends:
    //
    // { type: "speechstart" }
    //
    // whenever the browser detects actual speech.
    //
    // This is important because a speechstart can happen
    // before the final transcript arrives.
    // --------------------------------------------------

    onStatusChange: (status) => {
      if (!status) {
        return;
      }

      if (status.type === "speechstart") {
        console.log(
          "[SPEECH] Actual speech detected. Resetting silence clock.",
        );

        lastSpeechAtRef.current = Date.now();

        setSilenceSeconds(null);
      }

      /*
       * Forward the status to the parent component too.
       */
      if (onStatusChange) {
        onStatusChange(status);
      }
    },

    // --------------------------------------------------
    // Final speech segment
    //
    // Do NOT submit here.
    // --------------------------------------------------

    onFinalTranscript: (finalTranscript) => {
      console.log("[SPEECH] Final speech segment received:", finalTranscript);

      /*
       * A final result is definite evidence that the
       * candidate is still answering.
       */
      lastSpeechAtRef.current = Date.now();

      setSilenceSeconds(null);

      if (onStatusChange) {
        onStatusChange({
          type: "final_transcript",
          transcript: finalTranscript,
        });
      }
    },

    // --------------------------------------------------
    // Recognition error
    // --------------------------------------------------

    onError: (err) => {
      console.error("[SPEECH] Recognition error:", err);

      if (onStatusChange) {
        onStatusChange({
          type: "error",
          error: err,
        });
      }
    },
  });

  // --------------------------------------------------
  // Helper: wait for late browser final results
  // --------------------------------------------------

  const waitForFinalRecognitionResult = () => {
    return new Promise((resolve) => {
      clearTimeout(finalizationTimeoutRef.current);

      finalizationTimeoutRef.current = setTimeout(() => {
        finalizationTimeoutRef.current = null;
        resolve();
      }, FINAL_RESULT_SETTLE_MS);
    });
  };

  // --------------------------------------------------
  // Submit completed answer
  // --------------------------------------------------

  const submitAnswer = async (finalTranscript, { alternatives = [] } = {}) => {
    if (!finalTranscript?.trim()) {
      console.warn("[SPEECH] Cannot submit empty answer.");

      setIsProcessing(false);
      return;
    }

    if (!interviewId || !contextId || !questionId) {
      console.error("[SPEECH] Missing interview IDs:", {
        interviewId,
        contextId,
        questionId,
      });

      setIsProcessing(false);
      return;
    }

    // Prevent duplicate submissions
    if (submittedRef.current) {
      console.warn("[SPEECH] Answer already submitted.");
      return;
    }

    submittedRef.current = true;
    setIsProcessing(true);
    onStatusChange?.({
      type: "evaluation_start",
    });
    // Stop silence monitoring.
    clearInterval(silenceTimerRef.current);
    clearInterval(silenceMonitorRef.current);

    setSilenceSeconds(null);

    console.log("[SPEECH] Submitting completed answer...");

    console.log("[SPEECH] IDs:", {
      interviewId,
      contextId,
      questionId,
    });

    console.log("[SPEECH] Final authoritative transcript:", finalTranscript);

    console.log("[SPEECH] Recognition alternatives:", alternatives);

    try {
      const endTime = Date.now();

      const responseDuration = Math.max(0, elapsedTime);

      const calculatedStartTime = endTime - responseDuration;

      const result = await SpeechService.submitTranscript({
        interviewId,
        contextId,
        questionId,

        // Keep the raw browser transcript.
        transcript: finalTranscript.trim(),

        // Browser recognition alternatives.
        alternatives,

        startTime: calculatedStartTime,
        endTime,

        responseDuration,

        wordCount: finalTranscript.trim().split(/\s+/).filter(Boolean).length,

        topic: "general",
        difficulty: "medium",
      });

      console.log("[SPEECH] Answer submitted successfully:", result);

      const evaluation = result?.data?.evaluation || null;

      if (onStatusChange) {
        onStatusChange({
          type: "evaluation",
          evaluation,
          transcript: finalTranscript.trim(),
        });
      }
    } catch (err) {
      console.error("[SPEECH] Error submitting answer:", err);

      // Allow retry if API failed.
      submittedRef.current = false;

      // Tell Interview.jsx that evaluation has stopped.
      // This allows the interview timer to resume.
      onStatusChange?.({
        type: "evaluation_end",
      });

      // Forward the original error to Interview.jsx.
      onStatusChange?.({
        type: "error",
        error: err,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // --------------------------------------------------
  // Manual Stop
  // --------------------------------------------------

  const handleStop = async () => {
    if (isProcessing) {
      return;
    }

    if (submittedRef.current) {
      return;
    }

    console.log("[SPEECH] Manual Stop clicked.");

    clearInterval(silenceTimerRef.current);
    clearInterval(silenceMonitorRef.current);

    setSilenceSeconds(null);

    /*
     * IMPORTANT:
     *
     * Do NOT capture the final transcript and immediately
     * submit it.
     *
     * Chrome may send one last final result after stop().
     */

    console.log(
      "[SPEECH] Stopping recognition and waiting for final browser result...",
    );

    stop();

    /*
     * Give SpeechRecognition time to deliver any final
     * result generated immediately before stop().
     */
    await waitForFinalRecognitionResult();

    /*
     * NOW read the authoritative transcript.
     *
     * This can include a final result that arrived after
     * stop() was called.
     */
    const finalAnswer = getLatestTranscript();
    const alternatives = getLatestAlternatives();

    latestTranscriptRef.current = finalAnswer || "";

    console.log(
      "[SPEECH] Final answer after recognition settled:",
      finalAnswer,
    );

    console.log(
      "[SPEECH] Final alternatives after recognition settled:",
      alternatives,
    );

    lastSpeechAtRef.current = null;

    await submitAnswer(finalAnswer, {
      alternatives,
    });
  };

  // --------------------------------------------------
  // Automatic silence submission
  // --------------------------------------------------

  const handleSilenceTimeout = async () => {
    if (isProcessing || submittedRef.current || !isRecording) {
      return;
    }

    console.log("[SPEECH] 7 seconds of actual silence reached.");

    clearInterval(silenceTimerRef.current);
    clearInterval(silenceMonitorRef.current);

    setSilenceSeconds(null);

    /*
     * Stop recognition first.
     *
     * A final browser result may still arrive after this.
     */
    console.log("[SPEECH] Stopping recognition before automatic submission...");

    stop();

    /*
     * IMPORTANT:
     *
     * Do NOT read the transcript before stop().
     *
     * The browser may deliver one last final result after
     * stop() and update the hook's authoritative transcript.
     */
    await waitForFinalRecognitionResult();

    /*
     * Read the transcript AFTER the settling period.
     */
    const finalAnswer = getLatestTranscript();
    const alternatives = getLatestAlternatives();

    latestTranscriptRef.current = finalAnswer || "";

    /*
     * Never submit an empty answer.
     */
    if (!finalAnswer?.trim()) {
      console.warn("[SPEECH] Silence reached but no answer exists.");

      lastSpeechAtRef.current = null;

      return;
    }

    console.log("[SPEECH] Auto-submit final answer:", finalAnswer);

    console.log("[SPEECH] Auto-submit alternatives:", alternatives);

    lastSpeechAtRef.current = null;

    await submitAnswer(finalAnswer, {
      alternatives,
    });
  };

  // --------------------------------------------------
  // Start
  // --------------------------------------------------

  const handleStart = () => {
    if (isProcessing) {
      return;
    }

    if (!questionId) {
      console.warn("[SPEECH] Cannot start: question ID missing.");

      return;
    }

    console.log("[SPEECH] Starting new answer...");

    submittedRef.current = false;

    latestTranscriptRef.current = "";

    lastSpeechAtRef.current = Date.now();

    clearInterval(silenceTimerRef.current);
    clearInterval(silenceMonitorRef.current);

    clearTimeout(finalizationTimeoutRef.current);

    setSilenceSeconds(null);

    start();
  };

  // --------------------------------------------------
  // Toggle Start / Stop
  // --------------------------------------------------

  const handleToggleRecording = () => {
    if (isProcessing) {
      return;
    }

    if (isRecording) {
      handleStop();
      return;
    }

    handleStart();
  };

  // --------------------------------------------------
  // Interview-level silence detection
  // --------------------------------------------------
  //
  // IMPORTANT:
  //
  // We intentionally DO NOT use `isListening`.
  //
  // Chrome SpeechRecognition can temporarily produce
  // `onend` during normal recognition lifecycle events.
  //
  // `isListening === false` therefore does NOT mean
  // that the candidate has stopped answering.
  //
  // Instead we track the last actual speech/transcript
  // activity.
  //

  useEffect(() => {
    if (!isRecording || isPaused || isProcessing) {
      clearInterval(silenceMonitorRef.current);
      clearInterval(silenceTimerRef.current);

      setSilenceSeconds(null);

      return;
    }

    // Make sure the silence clock has a starting point.
    if (!lastSpeechAtRef.current) {
      lastSpeechAtRef.current = Date.now();
    }

    clearInterval(silenceMonitorRef.current);

    silenceMonitorRef.current = setInterval(() => {
      if (!isRecording || isPaused || isProcessing || submittedRef.current) {
        return;
      }

      const now = Date.now();

      const silenceDuration = now - lastSpeechAtRef.current;

      const remainingMs = SILENCE_LIMIT_MS - silenceDuration;

      // ------------------------------------------------
      // Candidate is still inside normal silence window
      // ------------------------------------------------

      if (remainingMs > 0) {
        const remainingSeconds = Math.ceil(remainingMs / 1000);

        /*
         * Only show the warning during the final
         * three seconds.
         */
        if (remainingSeconds <= 3) {
          setSilenceSeconds(remainingSeconds);
        } else {
          setSilenceSeconds(null);
        }

        return;
      }

      // ------------------------------------------------
      // Full 7 seconds of actual silence reached
      // ------------------------------------------------

      clearInterval(silenceMonitorRef.current);

      console.log("[SPEECH] 7 seconds of actual silence reached.");

      setSilenceSeconds(0);

      handleSilenceTimeout();
    }, 250);

    return () => {
      clearInterval(silenceMonitorRef.current);
    };
  }, [isRecording, isPaused, isProcessing]);

  // --------------------------------------------------
  // Cancel visible countdown when candidate speaks
  // --------------------------------------------------

  useEffect(() => {
    if (transcript?.trim()) {
      setSilenceSeconds(null);
    }
  }, [transcript]);

  // --------------------------------------------------
  // Auto-save interim transcript
  // --------------------------------------------------
  //
  // IMPORTANT:
  //
  // Do NOT include elapsedTime here.
  //
  // elapsedTime changes continuously, which would cancel
  // and restart this timeout every ~100ms.
  //
  // This timeout therefore acts as a debounce:
  // after interim transcript activity stops for 3 seconds,
  // save the latest interim transcript.
  //

  useEffect(() => {
    if (
      !interimTranscript ||
      error ||
      !isRecording ||
      isPaused ||
      isProcessing
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
      }).catch((saveErr) =>
        console.error("[SPEECH] Auto-save error:", saveErr),
      );
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
    error,
  ]);

  // --------------------------------------------------
  // Stop when question becomes inactive
  // --------------------------------------------------

  useEffect(() => {
    if (!isQuestionActive && isRecording && !isProcessing) {
      stopTimeoutRef.current = setTimeout(() => {
        clearInterval(silenceMonitorRef.current);
        clearInterval(silenceTimerRef.current);

        setSilenceSeconds(null);

        lastSpeechAtRef.current = null;

        stop();
      }, 1000);
    }

    return () => {
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
      }
    };
  }, [isQuestionActive, isRecording, isProcessing, stop]);

  // --------------------------------------------------
  // Cleanup
  // --------------------------------------------------

  useEffect(() => {
    return () => {
      clearTimeout(autoSaveRef.current);
      clearTimeout(stopTimeoutRef.current);
      clearTimeout(finalizationTimeoutRef.current);

      clearInterval(silenceTimerRef.current);
      clearInterval(silenceMonitorRef.current);

      lastSpeechAtRef.current = null;

      stop();
    };
  }, [stop]);

  // --------------------------------------------------
  // Reset
  // --------------------------------------------------

  const handleReset = () => {
    if (isProcessing) {
      return;
    }

    console.log("[SPEECH] Resetting recording...");

    submittedRef.current = false;

    latestTranscriptRef.current = "";

    lastSpeechAtRef.current = null;

    clearTimeout(finalizationTimeoutRef.current);

    clearInterval(silenceTimerRef.current);
    clearInterval(silenceMonitorRef.current);

    setSilenceSeconds(null);

    clear();
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="flex flex-col h-full space-y-5 bg-gray-900 text-white p-4 overflow-hidden">
      {/* Mic Status */}
      <div className="w-full max-w-md mx-auto text-center">
        <MicStatus
          isListening={isListening}
          isRecording={isRecording}
          isPaused={isPaused}
          isSupported={isSupported}
          error={error}
        />
      </div>

      {/* Live Transcript */}
      <TranscriptBox
        transcript={transcript}
        interimTranscript={interimTranscript}
        isFinal={!isRecording || !!error}
        isRecording={isRecording}
        error={error}
      />

      {/* Silence warning */}
      {silenceSeconds !== null && isRecording && !isPaused && !isProcessing && (
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

      {/* Controls */}
      <div className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
        <div className="flex flex-1 space-x-4">
          {/* Start / Stop */}
          <button
            onClick={handleToggleRecording}
            disabled={!isSupported || isProcessing}
            className={`px-4 py-2 text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed ${
              isProcessing
                ? "bg-gray-600"
                : isRecording
                  ? "bg-red-700 hover:bg-red-800"
                  : "bg-green-700 hover:bg-green-800"
            }`}
          >
            {isProcessing ? "Evaluating..." : isRecording ? "Stop" : "Start"}
          </button>

          {/* Pause / Resume */}
          {isRecording && !isProcessing && (
            <button
              onClick={() => (isPaused ? resume() : pause())}
              className="px-4 py-2 bg-yellow-700 text-sm font-medium rounded hover:bg-yellow-800"
            >
              {isPaused ? "Resume" : "Pause"}
            </button>
          )}

          {/* Reset */}
          {!isRecording && !isProcessing && (
            <button
              onClick={handleReset}
              disabled={!transcript}
              className="px-4 py-2 bg-gray-600 text-sm font-medium rounded hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reset
            </button>
          )}
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <div className="text-sm text-yellow-300">⏳ Evaluating answer...</div>
        )}
      </div>

      {/* Status / Stats */}
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
