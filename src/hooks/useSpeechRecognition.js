// Custom hook for Web Speech API integration
//
// Speech Recognition V3
// - Continuous recognition
// - Automatic browser restart
// - Transcript accumulation
// - Multiple recognition alternatives
// - Pause / resume
// - Browser lifecycle handling
// - Auto-save
// - Stable synchronous transcript access
//
// IMPORTANT:
//
// The Web Speech API is responsible for speech-to-text.
//
// Interview-level silence detection and auto-submit are intentionally
// handled by SpeechRecorder.jsx.
//
// This hook must NOT interpret `onspeechend` as "answer finished".
// Browser speech recognition can emit speechend during normal pauses.
//

import { useState, useEffect, useCallback, useRef } from "react";

// ============================================================
// HOOK
// ============================================================

const useSpeechRecognition = (options = {}) => {
  const {
    // ----------------------------------------------------------
    // Callbacks
    // ----------------------------------------------------------

    onTranscriptUpdate,
    onFinalTranscript,
    onStart,
    onStop,
    onError,
    onAutoSave,
    onStatusChange,

    // ----------------------------------------------------------
    // Recognition configuration
    // ----------------------------------------------------------

    continuous = true,
    interimResults = true,

    // Technical English generally works better with en-US.
    language = "en-US",

    autoSaveInterval = 3000,

    // ----------------------------------------------------------
    // IMPORTANT:
    //
    // Kept for backward compatibility with existing callers.
    //
    // SpeechRecorder.jsx now owns interview-level silence
    // detection, so this hook does NOT use this value to stop
    // recognition.
    // ----------------------------------------------------------

    maxSilenceTimeout = 7000,

    // Browser-supported range is usually 1–5.
    maxAlternatives = 3,
  } = options;

  // ==========================================================
  // STATE
  // ==========================================================

  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");

  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState(null);

  const [confidence, setConfidence] = useState(0);
  const [wordCount, setWordCount] = useState(0);

  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // ==========================================================
  // REFS
  // ==========================================================

  const recognitionRef = useRef(null);

  const autoSaveRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const restartTimeoutRef = useRef(null);

  // ----------------------------------------------------------
  // AUTHORITATIVE TRANSCRIPT
  // ----------------------------------------------------------

  // This is the source of truth for the completed answer.
  const finalTranscriptRef = useRef("");

  // Current temporary browser hypothesis.
  const interimTranscriptRef = useRef("");

  // ----------------------------------------------------------
  // METADATA REFS
  // ----------------------------------------------------------

  const wordCountRef = useRef(0);
  const confidenceRef = useRef(0);

  const startTimeRef = useRef(null);

  // ----------------------------------------------------------
  // RECOGNITION LIFECYCLE
  // ----------------------------------------------------------

  const recognitionRunningRef = useRef(false);
  const isPausedRef = useRef(false);
  // Whether the current answer should continue recording.
  const shouldBeRecordingRef = useRef(false);

  // True when stop/pause/clear was explicitly requested.
  const manuallyStoppedRef = useRef(false);

  // Used to invalidate stale restart timers.
  const recordingSessionRef = useRef(0);

  // ----------------------------------------------------------
  // DUPLICATE FINAL RESULT PROTECTION
  // ----------------------------------------------------------

  const processedFinalIndexesRef = useRef(new Set());

  // ----------------------------------------------------------
  // RECOGNITION ALTERNATIVES
  // ----------------------------------------------------------

  const alternativesRef = useRef([]);

  // ==========================================================
  // CALLBACK REFS
  // ==========================================================
  //
  // Callback functions can change identity on every render.
  //
  // Keeping them in a ref prevents the SpeechRecognition
  // instance from being recreated unnecessarily.
  //
  // IMPORTANT:
  // onStatusChange MUST be included both here and in the
  // synchronization effect.
  // ==========================================================

  const callbacksRef = useRef({
    onTranscriptUpdate,
    onFinalTranscript,
    onStart,
    onStop,
    onError,
    onAutoSave,
    onStatusChange,
  });

  useEffect(() => {
    callbacksRef.current = {
      onTranscriptUpdate,
      onFinalTranscript,
      onStart,
      onStop,
      onError,
      onAutoSave,
      onStatusChange,
    };
  }, [
    onTranscriptUpdate,
    onFinalTranscript,
    onStart,
    onStop,
    onError,
    onAutoSave,
    onStatusChange,
  ]);

  // ==========================================================
  // INITIALIZE SPEECH RECOGNITION
  // ==========================================================

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsSupported(false);
      setError("Speech Recognition is not supported.");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setError("Speech Recognition is not supported in this browser.");
      return;
    }

    const instance = new SpeechRecognition();

    // ========================================================
    // BASIC CONFIGURATION
    // ========================================================

    instance.continuous = continuous;
    instance.interimResults = interimResults;
    instance.lang = language || "en-US";

    // --------------------------------------------------------
    // Multiple recognition alternatives
    // --------------------------------------------------------

    try {
      instance.maxAlternatives = Math.max(1, Math.min(maxAlternatives, 5));
    } catch (err) {
      console.warn("[SPEECH] maxAlternatives is not configurable:", err);
    }

    recognitionRef.current = instance;

    setIsSupported(true);

    // ========================================================
    // ON START
    // ========================================================

    instance.onstart = () => {
      console.log("[SPEECH] Browser recognition started");
      processedFinalIndexesRef.current.clear();
      recognitionRunningRef.current = true;

      setIsListening(true);
      setIsRecording(true);
      setError(null);

      // Start time belongs to the answer, not each browser
      // recognition restart.
      if (!startTimeRef.current) {
        const now = Date.now();

        startTimeRef.current = now;

        setStartTime(now);
        setEndTime(null);
        setElapsedTime(0);
      }

      callbacksRef.current.onStart?.();

      callbacksRef.current.onStatusChange?.({
        type: "recognitionstart",
      });
    };

    // ========================================================
    // ON END
    // ========================================================

    instance.onend = () => {
      console.log("[SPEECH] Browser recognition ended");

      recognitionRunningRef.current = false;

      setIsListening(false);

      // ------------------------------------------------------
      // IMPORTANT:
      //
      // Browser recognition can end even while the interview
      // answer is still active.
      //
      // If SpeechRecorder still wants recording, restart the
      // browser recognition WITHOUT resetting the transcript.
      // ------------------------------------------------------

      if (shouldBeRecordingRef.current && !manuallyStoppedRef.current) {
        console.log("[SPEECH] Recognition ended unexpectedly. Restarting...");

        callbacksRef.current.onStatusChange?.({
          type: "recognitionend",
          restarting: true,
        });

        const sessionId = recordingSessionRef.current;

        clearTimeout(restartTimeoutRef.current);

        restartTimeoutRef.current = setTimeout(() => {
          // --------------------------------------------------
          // Ignore stale restart timer.
          // --------------------------------------------------

          if (sessionId !== recordingSessionRef.current) {
            console.log("[SPEECH] Ignoring stale restart timer.");

            return;
          }

          // --------------------------------------------------
          // Recording no longer required.
          // --------------------------------------------------

          if (
            !recognitionRef.current ||
            !shouldBeRecordingRef.current ||
            manuallyStoppedRef.current ||
            recognitionRunningRef.current
          ) {
            return;
          }

          try {
            console.log("[SPEECH] Restarting recognition...");

            recognitionRef.current.start();
          } catch (err) {
            console.warn("[SPEECH] Recognition restart failed:", err);
          }
        }, 150);

        return;
      }

      // ------------------------------------------------------
      // GENUINE STOP
      // ------------------------------------------------------

      // GENUINE STOP OR PAUSE

      if (isPausedRef.current) {
        setIsListening(false);

        // Keep the answer session active.
        setIsRecording(true);
        setIsPaused(true);

        return;
      }

      setIsRecording(false);
      setIsPaused(false);

      const now = Date.now();

      setEndTime(now);

      if (startTimeRef.current) {
        setElapsedTime(now - startTimeRef.current);
      }

      callbacksRef.current.onStatusChange?.({
        type: "recognitionend",
        restarting: false,
      });

      callbacksRef.current.onStop?.();
    };

    // ========================================================
    // SPEECH START
    // ========================================================

    instance.onspeechstart = () => {
      console.log("[SPEECH] Speech started");

      // No interview-level silence timer here.
      clearTimeout(silenceTimeoutRef.current);

      // ------------------------------------------------------
      // Tell SpeechRecorder that actual candidate speech has
      // started.
      //
      // SpeechRecorder uses this to reset its 7-second
      // interview-level silence clock.
      // ------------------------------------------------------

      callbacksRef.current.onStatusChange?.({
        type: "speechstart",
      });
    };

    // ========================================================
    // SPEECH END
    // ========================================================

    instance.onspeechend = () => {
      console.log("[SPEECH] Speech ended.");

      clearTimeout(silenceTimeoutRef.current);

      // ------------------------------------------------------
      // VERY IMPORTANT:
      //
      // DO NOT call instance.stop() here.
      //
      // Web Speech API can report speechend during normal
      // pauses between sentences.
      //
      // SpeechRecorder.jsx owns the interview-level
      // 7-second silence detection.
      // ------------------------------------------------------

      console.log("[SPEECH] Speech ended. Waiting for more speech...");

      callbacksRef.current.onStatusChange?.({
        type: "speechend",
      });
    };

    // ========================================================
    // ON RESULT
    // ========================================================

    instance.onresult = (event) => {
      let currentInterim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];

        if (!result || !result[0]) {
          continue;
        }

        const primaryText = result[0].transcript?.trim();

        if (!primaryText) {
          continue;
        }

        // ====================================================
        // COLLECT ALTERNATIVES
        // ====================================================

        const alternatives = [];

        for (let j = 0; j < result.length; j++) {
          const alternative = result[j];

          if (!alternative) {
            continue;
          }

          const alternativeText = alternative.transcript?.trim();

          if (!alternativeText) {
            continue;
          }

          alternatives.push({
            text: alternativeText,
            confidence: alternative.confidence || 0,
          });
        }

        alternativesRef.current = alternatives;

        // ====================================================
        // FINAL RESULT
        // ====================================================

        if (result.isFinal) {
          const text = primaryText;

          // --------------------------------------------------
          // Duplicate protection
          // --------------------------------------------------

          if (processedFinalIndexesRef.current.has(i)) {
            continue;
          }

          processedFinalIndexesRef.current.add(i);

          // --------------------------------------------------
          // Append to authoritative transcript
          // --------------------------------------------------

          const previous = finalTranscriptRef.current.trim();

          const updated = previous ? `${previous} ${text}` : text;

          finalTranscriptRef.current = updated;

          setTranscript(updated);

          // --------------------------------------------------
          // Clear interim
          // --------------------------------------------------

          interimTranscriptRef.current = "";

          setInterimTranscript("");

          // --------------------------------------------------
          // WORD COUNT
          // --------------------------------------------------

          const newWords = text.split(/\s+/).filter(Boolean);

          wordCountRef.current += newWords.length;

          setWordCount(wordCountRef.current);

          // --------------------------------------------------
          // CONFIDENCE
          // --------------------------------------------------

          const resultConfidence = result[0].confidence || 0;

          confidenceRef.current = resultConfidence;

          setConfidence(resultConfidence);

          // --------------------------------------------------
          // DEBUG
          // --------------------------------------------------

          console.log("[SPEECH] Final segment:", text);

          console.log(
            "[SPEECH] Alternatives:",
            alternatives.map((a) => ({
              transcript: a.text,
              confidence: a.confidence,
            })),
          );

          console.log("[SPEECH] Complete transcript:", updated);

          // --------------------------------------------------
          // CALLBACK
          // --------------------------------------------------

          callbacksRef.current.onFinalTranscript?.(text, {
            wordCount: wordCountRef.current,

            confidence: resultConfidence,

            alternatives,

            timestamp: Date.now(),
          });

          continue;
        }

        // ====================================================
        // INTERIM RESULT
        // ====================================================

        currentInterim += `${primaryText} `;
      }

      currentInterim = currentInterim.trim();

      interimTranscriptRef.current = currentInterim;

      setInterimTranscript(currentInterim);

      // ------------------------------------------------------
      // UI transcript
      //
      // FINAL + CURRENT INTERIM
      //
      // finalTranscriptRef remains authoritative.
      // ------------------------------------------------------

      const fullTranscript =
        `${finalTranscriptRef.current} ${currentInterim}`.trim();

      callbacksRef.current.onTranscriptUpdate?.(fullTranscript, {
        isFinal: false,
      });
    };

    // ========================================================
    // ERROR
    // ========================================================

    instance.onerror = (event) => {
      console.warn("[SPEECH] Recognition error:", event.error);

      // ------------------------------------------------------
      // NORMAL / RECOVERABLE EVENTS
      // ------------------------------------------------------

      if (event.error === "no-speech" || event.error === "aborted") {
        callbacksRef.current.onStatusChange?.({
          type: "recognitionerror",
          error: event.error,
          recoverable: true,
        });

        return;
      }

      // ------------------------------------------------------
      // NETWORK ERROR
      // ------------------------------------------------------

      if (event.error === "network") {
        console.warn("[SPEECH] Network error from speech service.");

        setError("Speech recognition temporarily lost connection.");

        callbacksRef.current.onError?.(event.error);

        callbacksRef.current.onStatusChange?.({
          type: "recognitionerror",
          error: event.error,
          recoverable: true,
        });

        return;
      }

      // ------------------------------------------------------
      // REAL ERROR
      // ------------------------------------------------------

      setError(`Speech recognition error: ${event.error}`);

      callbacksRef.current.onError?.(event.error);

      callbacksRef.current.onStatusChange?.({
        type: "recognitionerror",
        error: event.error,
        recoverable: false,
      });

      // ------------------------------------------------------
      // MICROPHONE / PERMISSION FAILURE
      // ------------------------------------------------------

      if (
        event.error === "audio-capture" ||
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        isPausedRef.current = false;

        shouldBeRecordingRef.current = false;

        manuallyStoppedRef.current = true;

        clearTimeout(restartTimeoutRef.current);

        setIsListening(false);
        setIsRecording(false);
        setIsPaused(false);
      }
    };

    // ========================================================
    // CLEANUP
    // ========================================================

    return () => {
      console.log("[SPEECH] Destroying recognition instance");

      // Invalidate any old restart timer.
      recordingSessionRef.current++;

      shouldBeRecordingRef.current = false;

      manuallyStoppedRef.current = true;

      clearInterval(autoSaveRef.current);
      clearTimeout(silenceTimeoutRef.current);
      clearTimeout(restartTimeoutRef.current);

      try {
        instance.stop();
      } catch (err) {
        // Browser may throw if already stopped.
      }

      instance.onstart = null;
      instance.onend = null;
      instance.onresult = null;
      instance.onerror = null;
      instance.onspeechstart = null;
      instance.onspeechend = null;

      if (recognitionRef.current === instance) {
        recognitionRef.current = null;
      }
    };
  }, [continuous, interimResults, language, maxAlternatives]);

  // ==========================================================
  // AUTO SAVE
  // ==========================================================
  //
  // IMPORTANT:
  //
  // Do NOT depend on elapsedTime here.
  //
  // elapsedTime changes every 100ms. If this effect used
  // elapsedTime as a dependency, the timeout would constantly
  // be cancelled and recreated.
  //
  // Use a real interval instead.
  // ==========================================================

  useEffect(() => {
    if (autoSaveInterval <= 0 || !isRecording || isPaused) {
      return;
    }

    clearInterval(autoSaveRef.current);

    autoSaveRef.current = setInterval(() => {
      const latestTranscript = finalTranscriptRef.current.trim();

      if (callbacksRef.current.onAutoSave && latestTranscript) {
        callbacksRef.current.onAutoSave({
          transcript: latestTranscript,

          interimTranscript: interimTranscriptRef.current,

          isFinal: true,

          wordCount: wordCountRef.current,

          confidence: confidenceRef.current,

          startTime: startTimeRef.current,

          elapsedTime: startTimeRef.current
            ? Date.now() - startTimeRef.current
            : 0,
        });
      }
    }, autoSaveInterval);

    return () => {
      clearInterval(autoSaveRef.current);
    };
  }, [autoSaveInterval, isRecording, isPaused]);

  // ==========================================================
  // ELAPSED TIMER
  // ==========================================================

  useEffect(() => {
    let interval = null;

    if (isRecording && startTimeRef.current && !isPaused) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTimeRef.current);
      }, 100);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording, isPaused]);

  // ==========================================================
  // START
  // ==========================================================

  const start = useCallback(() => {
    const instance = recognitionRef.current;

    if (!instance || !isSupported) {
      console.warn("[SPEECH] Recognition is not available.");

      return;
    }

    if (recognitionRunningRef.current) {
      console.warn("[SPEECH] Recognition is already running.");

      return;
    }

    console.log("[SPEECH] Starting NEW answer...");

    // --------------------------------------------------------
    // RESET ANSWER STATE
    // --------------------------------------------------------

    setTranscript("");
    setInterimTranscript("");
    setError(null);

    setWordCount(0);
    setConfidence(0);

    setElapsedTime(0);
    setStartTime(null);
    setEndTime(null);

    finalTranscriptRef.current = "";

    interimTranscriptRef.current = "";

    wordCountRef.current = 0;
    confidenceRef.current = 0;

    startTimeRef.current = null;

    alternativesRef.current = [];

    processedFinalIndexesRef.current.clear();
    // --------------------------------------------------------
    // START RECORDING SESSION
    // --------------------------------------------------------
    isPausedRef.current = false;
    shouldBeRecordingRef.current = true;

    manuallyStoppedRef.current = false;

    recordingSessionRef.current++;

    clearTimeout(silenceTimeoutRef.current);

    clearTimeout(restartTimeoutRef.current);

    callbacksRef.current.onStatusChange?.({
      type: "answerstart",
    });

    try {
      instance.lang = language || "en-US";

      instance.continuous = continuous;

      instance.interimResults = interimResults;

      instance.start();
    } catch (err) {
      console.error("[SPEECH] Failed to start:", err);
      isPausedRef.current = false;
      shouldBeRecordingRef.current = false;

      setIsListening(false);
      setIsRecording(false);

      setError("Could not start microphone. Please try again.");

      callbacksRef.current.onError?.(err);
    }
  }, [isSupported, language, continuous, interimResults]);

  // ==========================================================
  // STOP
  // ==========================================================

  const stop = useCallback(() => {
    const instance = recognitionRef.current;

    if (!instance) {
      return;
    }

    console.log("[SPEECH] Manual stop");

    // --------------------------------------------------------
    // IMPORTANT:
    //
    // Stopping the browser does NOT clear finalTranscriptRef.
    //
    // The browser may still emit one final `onresult` before
    // `onend`.
    //
    // SpeechRecorder intentionally waits briefly after calling
    // stop() so that final result can be incorporated.
    // --------------------------------------------------------

    recordingSessionRef.current++;

    isPausedRef.current = false;

    shouldBeRecordingRef.current = false;

    manuallyStoppedRef.current = true;

    clearTimeout(silenceTimeoutRef.current);

    clearTimeout(restartTimeoutRef.current);

    callbacksRef.current.onStatusChange?.({
      type: "stoprequested",
    });

    if (recognitionRunningRef.current) {
      try {
        instance.stop();
      } catch (err) {
        console.warn("[SPEECH] Stop failed:", err);
      }
    } else {
      setIsListening(false);
      setIsRecording(false);
      setIsPaused(false);
    }
  }, []);

  // ==========================================================
  // PAUSE
  // ==========================================================

  const pause = useCallback(() => {
    const instance = recognitionRef.current;

    if (!instance) {
      return;
    }

    console.log("[SPEECH] Pausing recognition");
    isPausedRef.current = true;
    setIsPaused(true);

    // --------------------------------------------------------
    // Pause means browser recognition stops, but transcript
    // remains intact.
    // --------------------------------------------------------

    shouldBeRecordingRef.current = false;

    manuallyStoppedRef.current = true;

    clearTimeout(silenceTimeoutRef.current);

    clearTimeout(restartTimeoutRef.current);

    callbacksRef.current.onStatusChange?.({
      type: "pause",
    });

    if (recognitionRunningRef.current) {
      try {
        instance.stop();
      } catch (err) {
        console.warn("[SPEECH] Pause stop failed:", err);
      }
    }
  }, []);

  // ==========================================================
  // RESUME
  // ==========================================================

  const resume = useCallback(() => {
    const instance = recognitionRef.current;

    if (!instance || !isSupported) {
      return;
    }

    console.log("[SPEECH] Resuming recognition");
    isPausedRef.current = false;
    setIsPaused(false);

    shouldBeRecordingRef.current = true;

    manuallyStoppedRef.current = false;

    recordingSessionRef.current++;

    clearTimeout(silenceTimeoutRef.current);

    clearTimeout(restartTimeoutRef.current);

    setError(null);

    callbacksRef.current.onStatusChange?.({
      type: "resume",
    });

    if (!recognitionRunningRef.current) {
      try {
        instance.lang = language || "en-US";

        instance.continuous = continuous;

        instance.interimResults = interimResults;

        instance.start();
      } catch (err) {
        console.warn("[SPEECH] Resume failed:", err);
      }
    }
  }, [isSupported, language, continuous, interimResults]);

  // ==========================================================
  // CLEAR
  // ==========================================================

  const clear = useCallback(() => {
    console.log("[SPEECH] Clearing recording");

    const instance = recognitionRef.current;

    recordingSessionRef.current++;

    isPausedRef.current = false;

    shouldBeRecordingRef.current = false;

    manuallyStoppedRef.current = true;

    clearInterval(autoSaveRef.current);

    clearTimeout(silenceTimeoutRef.current);

    clearTimeout(restartTimeoutRef.current);

    if (instance && recognitionRunningRef.current) {
      try {
        instance.stop();
      } catch (err) {
        // Ignore browser stop errors.
      }
    }

    // --------------------------------------------------------
    // Reset React state
    // --------------------------------------------------------

    setTranscript("");
    setInterimTranscript("");

    setIsListening(false);
    setIsRecording(false);
    setIsPaused(false);

    setError(null);

    setWordCount(0);
    setConfidence(0);

    setStartTime(null);
    setEndTime(null);
    setElapsedTime(0);

    // --------------------------------------------------------
    // Reset refs
    // --------------------------------------------------------

    finalTranscriptRef.current = "";

    interimTranscriptRef.current = "";

    wordCountRef.current = 0;
    confidenceRef.current = 0;

    startTimeRef.current = null;

    alternativesRef.current = [];

    processedFinalIndexesRef.current.clear();


    callbacksRef.current.onStatusChange?.({
      type: "clear",
    });
  }, []);

  // ==========================================================
  // RETURN
  // ==========================================================

  return {
    isSupported,

    isListening,
    isRecording,
    isPaused,

    transcript,
    interimTranscript,

    error,

    confidence,
    wordCount,

    elapsedTime,
    startTime,
    endTime,

    start,
    stop,
    pause,
    resume,
    clear,

    hasTranscript: !!finalTranscriptRef.current.trim(),

    isEmpty:
      !finalTranscriptRef.current.trim() &&
      !interimTranscriptRef.current.trim(),

    isFinal: !!finalTranscriptRef.current.trim(),

    // --------------------------------------------------------
    // Latest authoritative transcript
    // --------------------------------------------------------

    getLatestTranscript: () => finalTranscriptRef.current.trim(),

    // --------------------------------------------------------
    // Latest recognition alternatives
    // --------------------------------------------------------

    getLatestAlternatives: () => alternativesRef.current,
  };
};

export default useSpeechRecognition;
