import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PageTransition from "../components/ui/PageTransition";
import Navbar from "../components/ui/Navbar";

const capabilities = [
  {
    number: "01",
    icon: "▤",
    title: "Resume intelligence",
    text: "Upload a PDF and extract candidate information such as skills, projects, education, and experience.",
    tags: ["PDF parsing", "Profile extraction", "Review & edit"],
  },
  {
    number: "02",
    icon: "✳",
    title: "Personalized questions",
    text: "Generate interview questions informed by the candidate's actual background and project experience.",
    tags: ["Gemini AI", "Resume context", "Adaptive questions"],
  },
  {
    number: "03",
    icon: "◉",
    title: "Voice-based interview",
    text: "Answer questions aloud through an interactive interview flow powered by browser speech recognition.",
    tags: ["Speech recognition", "Interactive practice", "Auto-submit"],
  },
  {
    number: "04",
    icon: "◇",
    title: "Answer evaluation",
    text: "Receive structured feedback on individual responses to identify what worked and what needs attention.",
    tags: ["AI evaluation", "Answer feedback", "Strengths & gaps"],
  },
  {
    number: "05",
    icon: "▥",
    title: "Interview reports",
    text: "See a consolidated review of the session, including performance insights and areas to improve.",
    tags: ["Session summary", "Performance insights", "Next steps"],
  },
  {
    number: "06",
    icon: "⌁",
    title: "Candidate dashboard",
    text: "Access profile details, recent activity, interview history, and reports from one central workspace.",
    tags: ["Overview", "History", "Progress"],
  },
];
const stack = [
  { name: "Frontend", tech: "React · Vite · Tailwind CSS · Framer Motion" },
  { name: "Backend", tech: "Node.js · Express.js · REST APIs" },
  { name: "Database", tech: "PostgreSQL · JSONB" },
  { name: "AI", tech: "Google Gemini" },
  { name: "Authentication", tech: "JWT" },
  { name: "Voice", tech: "Web Speech API" },
];
const journey = [
  "Upload resume",
  "Review profile",
  "Start interview",
  "Answer questions",
  "Review feedback",
];
const appear = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
};
export default function Work() {
  return (
    <>
      <Navbar />
      <PageTransition>
        <main
          id="main"
          className="relative min-h-screen overflow-hidden bg-bg text-white"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[650px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,242,255,0.11),transparent_65%)]"
          />
          <section className="relative mx-auto max-w-6xl px-6 pb-20 pt-36 text-center sm:pt-44">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> Inside
              the platform
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-display mx-auto mt-7 max-w-4xl text-5xl font-bold leading-[1.12] tracking-tight sm:text-6xl lg:text-7xl"
            >
              A smarter way to{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-400 bg-clip-text text-transparent">
                prepare, practice & improve.
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mx-auto mt-7 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg"
            >
              Explore how HireReady AI combines resume understanding,
              personalized interviews, and structured feedback in one workflow.
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-9 flex flex-wrap justify-center gap-3"
            >
              <Link
                to="/resume"
                className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-bold text-[#06151c] transition hover:bg-cyan-300"
              >
                Try the experience ↗
              </Link>
              <Link
                to="/about"
                className="rounded-xl border border-white/15 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Our mission
              </Link>
            </motion.div>
          </section>

          <section className="relative border-y border-white/[0.07] bg-white/[0.015] py-16 sm:py-20">
            <div className="mx-auto max-w-6xl px-6">
              <div className="mb-9">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
                  The workflow
                </p>
                <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  One connected preparation journey.
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-400">
                  Each stage builds on the previous one, from understanding your
                  resume to reviewing your answers.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {journey.map((item, i) => (
                  <div
                    key={item}
                    className="relative rounded-2xl border border-white/[0.09] bg-[#0D1724] p-5"
                  >
                    <span className="text-xs font-bold text-cyan-400">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="mt-5 text-sm font-semibold text-white">
                      {item}
                    </p>
                    <div className="mt-5 h-1 rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400"
                        style={{ width: `${(i + 1) * 20}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="relative mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="mb-11 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
                What we've built
              </p>
              <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Six connected capabilities.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-400">
                Core features designed to help candidates move beyond memorizing
                answers and toward meaningful practice.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((feature, i) => (
                <motion.article
                  key={feature.title}
                  {...appear}
                  transition={{ delay: (i % 3) * 0.07 }}
                  className="group flex h-full flex-col rounded-2xl border border-white/[0.09] bg-[#0D1724] p-7 transition hover:-translate-y-1 hover:border-cyan-400/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08] text-2xl text-cyan-300">
                      {feature.icon}
                    </span>
                    <span className="text-xs font-semibold text-slate-600">
                      {feature.number} / 06
                    </span>
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-slate-400">
                    {feature.text}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {feature.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.article>
              ))}
            </div>
          </section>

          <section className="relative border-y border-white/[0.07] bg-white/[0.015] py-20 sm:py-24">
            <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
                  Under the hood
                </p>
                <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Built with a modern, practical stack.
                </h2>
                <p className="mt-5 text-sm leading-7 text-slate-400">
                  HireReady AI combines a responsive React interface, a Node.js
                  API, PostgreSQL storage, and AI-powered interview features.
                </p>
                <div className="mt-8 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.05] p-5">
                  <p className="text-sm font-semibold text-cyan-300">
                    Designed as an end-to-end project
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    From authentication and resume handling to interactive
                    sessions and final reports, the workflow connects frontend,
                    backend, data, and AI components.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {stack.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-xl border border-white/[0.09] bg-[#0D1724] p-5"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-400">
                      {item.name}
                    </p>
                    <p className="mt-3 text-sm font-medium leading-6 text-white">
                      {item.tech}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/[0.10] via-[#101B2A] to-violet-500/[0.09] px-7 py-14 text-center sm:px-12">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                Put it into practice
              </span>
              <h2 className="font-display mt-5 text-3xl font-bold sm:text-4xl">
                Your next interview starts here.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-400">
                Upload your resume, review your profile, and experience a mock
                interview shaped by your background.
              </p>
              <Link
                to="/resume"
                className="mt-8 inline-flex rounded-xl bg-cyan-400 px-7 py-3 text-sm font-bold text-[#06151c] transition hover:bg-cyan-300"
              >
                Start preparing ↗
              </Link>
            </div>
          </section>
          <footer className="border-t border-white/[0.07] px-6 py-7 text-center text-xs text-slate-500">
            HireReady AI · Resume-aware interview preparation
          </footer>
        </main>
      </PageTransition>
    </>
  );
}
