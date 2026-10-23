import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BASE = import.meta.env.VITE_API_URL || "/api";
const MAX_SIZE = 10 * 1024 * 1024;

const Icon = ({ name, size = 22 }) => {
  const paths = {
    upload: (
      <>
        <path d="M12 16V4m0 0L7 9m5-5 5 5" />
        <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h6" />
      </>
    ),
    check: <path d="M5 12l4 4L19 6" />,
    close: <path d="M18 6L6 18M6 6l12 12" />,
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9L12 3z" />
        <path d="m19 18 .5 1.5L21 20l-1.5.5L19 22l-.5-1.5L17 20l1.5-.5L19 18z" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
};

export default function ResumeUpload({ onUploadComplete }) {
  const inputRef = useRef(null);
  const xhrRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");

  const validate = (candidate) => {
    if (!candidate) return false;
    if (!candidate.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF resumes are supported at the moment.");
      return false;
    }
    if (candidate.size === 0) {
      setError("This PDF is empty. Please choose another file.");
      return false;
    }
    if (candidate.size > MAX_SIZE) {
      setError("Your PDF exceeds the 10 MB limit.");
      return false;
    }
    return true;
  };

  const chooseFile = (candidate) => {
    if (uploading) return;
    setError("");
    if (!validate(candidate)) return;
    setFile(candidate);
    setProgress(0);
    setPhase("idle");
  };

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive(false);
      if (uploading) return;
      chooseFile(event.dataTransfer.files?.[0]);
    },
    [uploading],
  );

  const onDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!uploading) setDragActive(true);
  };

  const removeFile = () => {
    if (uploading) return;
    setFile(null);
    setProgress(0);
    setPhase("idle");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const uploadFile = async () => {
    if (!file || uploading) return;
    setError("");
    setUploading(true);
    setProgress(0);
    setPhase("uploading");

    try {
      const payload = new FormData();
      payload.append("resume", file);
      payload.append("title", file.name.replace(/\.[^/.]+$/, ""));
      const token = localStorage.getItem("hr_token");

      const resume = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open("POST", `${BASE}/resume/upload`);
        xhr.timeout = 120000;
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
            if (event.loaded === event.total) setPhase("processing");
          }
        };
        xhr.onload = () => {
          let body = {};
          try {
            body = JSON.parse(xhr.responseText || "{}");
          } catch {
            /* Server returned non-JSON */
          }
          if (xhr.status < 200 || xhr.status >= 300) {
            reject(
              new Error(
                body.error || body.message || `Upload failed (${xhr.status})`,
              ),
            );
            return;
          }
          if (!body?.data?.resume) {
            reject(new Error("The server did not return a resume record."));
            return;
          }
          resolve(body.data.resume);
        };
        xhr.onerror = () =>
          reject(
            new Error("Network error. Check your connection and try again."),
          );
        xhr.ontimeout = () =>
          reject(new Error("Upload timed out. Please try again."));
        xhr.onabort = () => reject(new Error("Upload cancelled."));
        xhr.send(payload);
      });

      setPhase("complete");
      setProgress(100);
      onUploadComplete?.(resume);
    } catch (err) {
      setPhase("idle");
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      xhrRef.current = null;
      setUploading(false);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-4xl">
      <div className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-cyan-400/[0.04] blur-3xl" />
      <div className="relative overflow-hidden rounded-[28px] border border-white/[0.10] bg-[#0C1420]/95 shadow-[0_24px_80px_rgba(0,0,0,.25)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
        <div className="border-b border-white/[0.07] px-6 py-7 sm:px-9">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.18em] text-cyan-300">
            <Icon name="spark" size={14} /> Step 01 · Resume intake
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Start with your resume<span className="text-cyan-400">.</span>
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
            Upload a PDF to build your candidate profile and prepare a more
            relevant AI mock interview.
          </p>
        </div>

        <div className="p-5 sm:p-9">
          <div
            onDragEnter={onDragOver}
            onDragOver={onDragOver}
            onDragLeave={(e) => {
              e.preventDefault();
              if (!e.currentTarget.contains(e.relatedTarget))
                setDragActive(false);
            }}
            onDrop={onDrop}
            className={`relative rounded-2xl border-2 border-dashed p-7 text-center transition-all duration-300 sm:p-12 ${dragActive ? "border-cyan-400 bg-cyan-400/[0.09] shadow-[inset_0_0_40px_rgba(34,211,238,.04)]" : "border-white/15 bg-white/[0.025] hover:border-cyan-400/40"}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="sr-only"
              id="resume-file-input"
              onChange={(e) => {
                chooseFile(e.target.files?.[0]);
                e.target.value = "";
              }}
              disabled={uploading}
            />

            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[22px] border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 shadow-[0_0_35px_rgba(34,211,238,.08)]">
                    <Icon name="upload" size={35} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    Drop your resume here
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Drag and drop a PDF, or choose one from your device
                  </p>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-400 px-6 py-3 text-sm font-bold text-[#06131A] transition hover:bg-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                  >
                    Browse files <span className="ml-2">↗</span>
                  </button>
                  <p className="mt-4 text-xs text-slate-500">
                    PDF only · Up to 10 MB
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="selected"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                    <Icon name="file" size={30} />
                  </div>
                  <p
                    className="mx-auto max-w-full truncate text-base font-semibold text-white"
                    title={file.name}
                  >
                    {file.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    PDF document · {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>

                  {uploading || phase === "complete" ? (
                    <div
                      className="mx-auto mt-7 max-w-md"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="mb-2 flex justify-between gap-2 text-xs">
                        <span className="text-slate-300">
                          {phase === "processing"
                            ? "Upload received · Waiting for server..."
                            : phase === "complete"
                              ? "Upload complete"
                              : "Uploading resume..."}
                        </span>
                        <span className="font-semibold text-cyan-300">
                          {progress}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-300"
                        />
                      </div>
                      {phase === "processing" && (
                        <p className="mt-3 text-xs text-slate-400">
                          The server is processing your file. Please keep this
                          page open.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                      >
                        Replace file
                      </button>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-rose-400/40 hover:text-rose-300"
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={uploadFile}
                        className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-2.5 text-sm font-bold text-[#06131A] transition hover:bg-cyan-300"
                      >
                        <Icon name="upload" size={17} /> Upload & continue
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {error && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[0.08] p-3 text-sm text-rose-300"
            >
              <Icon name="close" size={17} />
              <span>{error}</span>
            </motion.div>
          )}

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              ["01", "Upload", "Select a PDF resume"],
              ["02", "AI extraction", "Parse your experience & skills"],
              ["03", "Review", "Confirm your candidate profile"],
            ].map(([number, title, desc]) => (
              <div
                key={number}
                className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"
              >
                <span className="text-xs font-semibold text-cyan-400">
                  {number}
                </span>
                <p className="mt-2 text-sm font-semibold text-white">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Icon name="shield" size={15} /> Your resume is used to prepare your
            interview profile.
          </div>
        </div>
      </div>
    </div>
  );
}
