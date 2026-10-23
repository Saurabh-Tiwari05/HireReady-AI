import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PageTransition from "../components/ui/PageTransition";
import Navbar from "../components/ui/Navbar";

const reveal = { hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0 } };
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const values = [
  {
    icon: "◎",
    title: "Personalized practice",
    text: "Interview questions built around your resume, skills, and projects—not a generic question bank.",
  },
  {
    icon: "◈",
    title: "Actionable feedback",
    text: "Understand your strengths and improvement areas after each answer and across your interview.",
  },
  {
    icon: "✳",
    title: "Confidence through repetition",
    text: "Practice in a focused environment, review your progress, and prepare for your next opportunity.",
  },
];

const steps = [
  {
    number: "01",
    title: "Upload your resume",
    text: "Start with a PDF so HireReady AI can identify relevant experience, skills, and projects.",
  },
  {
    number: "02",
    title: "Review your profile",
    text: "Check the extracted details and make corrections before starting your practice session.",
  },
  {
    number: "03",
    title: "Practice your interview",
    text: "Answer personalized questions using your voice in an interactive mock interview.",
  },
  {
    number: "04",
    title: "Learn from feedback",
    text: "Review answer-level evaluations and a final interview report to guide your preparation.",
  },
];

const team = [
  "Saurabh Tiwari",
  "Samarth Sharma",
  "Sameer Kumar",
  "Sagar Shukla",
  "Sajal Sharma",
  "Satwik Mishra",
];

function Eyebrow({ children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
      <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
      {children}
    </span>
  );
}
function SectionHeading({ eyebrow, title, description, center = false }) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-cyan-400">
        {eyebrow}
      </p>
      <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-sm leading-7 text-slate-400 sm:text-base">
          {description}
        </p>
      )}
    </div>
  );
}
export default function About() {
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
            className="pointer-events-none absolute inset-x-0 top-0 h-[650px] bg-[radial-gradient(ellipse_at_50%_10%,rgba(0,242,255,0.11),transparent_60%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-[-180px] top-[450px] h-[450px] w-[450px] rounded-full bg-violet-500/[0.06] blur-[100px]"
          />
          <section className="relative mx-auto max-w-6xl px-6 pb-20 pt-36 text-center sm:pt-44">
            <motion.div initial="hidden" animate="visible" variants={stagger}>
              <motion.div variants={reveal}>
                <Eyebrow>Our mission</Eyebrow>
              </motion.div>
              <motion.h1
                variants={reveal}
                className="font-display mx-auto mt-7 max-w-4xl text-5xl font-bold leading-[1.12] tracking-tight sm:text-6xl lg:text-7xl"
              >
                The interview coach built around{" "}
                <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-400 bg-clip-text text-transparent">
                  your story.
                </span>
              </motion.h1>
              <motion.p
                variants={reveal}
                className="mx-auto mt-7 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg"
              >
                HireReady AI helps students and early-career candidates turn
                their resumes into realistic interview practice, useful
                feedback, and a clearer path to improvement.
              </motion.p>
              <motion.div
                variants={reveal}
                className="mt-9 flex flex-wrap justify-center gap-3"
              >
                <Link
                  to="/resume"
                  className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-bold text-[#06151c] transition hover:bg-cyan-300"
                >
                  Get started <span className="ml-1">↗</span>
                </Link>
                <Link
                  to="/work"
                  className="rounded-xl border border-white/15 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Explore how it works
                </Link>
              </motion.div>
            </motion.div>
            <div className="mx-auto mt-20 grid max-w-4xl gap-3 sm:grid-cols-3">
              {[
                ["Resume-aware", "Question generation"],
                ["Voice-first", "Mock interview practice"],
                ["Feedback-led", "Learning experience"],
              ].map(([value, label]) => (
                <div
                  key={value}
                  className="rounded-2xl border border-white/[0.09] bg-white/[0.035] p-6 backdrop-blur"
                >
                  <p className="text-lg font-semibold text-cyan-300">{value}</p>
                  <p className="mt-1 text-xs text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="relative border-y border-white/[0.06] bg-white/[0.015] py-20 sm:py-24">
            <div className="mx-auto max-w-6xl px-6">
              <SectionHeading
                eyebrow="Why HireReady AI"
                title="Preparation should feel personal."
                description="Traditional interview practice often starts with generic questions. We designed HireReady AI to begin with what makes each candidate different."
              />
              <div className="mt-10 grid gap-5 md:grid-cols-3">
                {values.map((item, i) => (
                  <motion.article
                    key={item.title}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ delay: i * 0.08 }}
                    className="group rounded-2xl border border-white/[0.09] bg-[#0D1724] p-7 transition hover:-translate-y-1 hover:border-cyan-400/25"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.09] text-2xl text-cyan-300">
                      {item.icon}
                    </span>
                    <h3 className="mt-6 text-lg font-semibold">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-400">
                      {item.text}
                    </p>
                  </motion.article>
                ))}
              </div>
            </div>
          </section>

          <section className="relative mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <SectionHeading
              eyebrow="The experience"
              title="From resume to readiness."
              description="A guided workflow that turns what you have already achieved into focused interview preparation."
            />
            <div className="mt-12 grid gap-4 md:grid-cols-2">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="flex gap-5 rounded-2xl border border-white/[0.09] bg-white/[0.025] p-6 sm:p-7"
                >
                  <span className="font-display text-3xl font-bold text-cyan-400/65">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-400">
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="relative border-y border-white/[0.06] bg-white/[0.015] py-20 sm:py-24">
            <div className="mx-auto max-w-6xl px-6">
              <SectionHeading
                eyebrow="Built by students"
                title="Meet the team behind HireReady AI."
                description="A six-member computer science project team building a practical AI-powered interview preparation experience."
              />
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {team.map((name, i) => (
                  <div
                    key={name}
                    className="flex items-center gap-4 rounded-2xl border border-white/[0.09] bg-[#0D1724] p-5"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-violet-400/20 text-sm font-bold text-cyan-200">
                      {name
                        .split(" ")
                        .map((word) => word[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{name}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Project team member · {String(i + 1).padStart(2, "0")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-7 text-sm text-slate-500">
                B.Tech Computer Science & Engineering · Guided by Prof.
                Sreeparna Ganguly
              </p>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/[0.10] via-[#101B2A] to-violet-500/[0.09] px-7 py-14 text-center sm:px-12">
              <Eyebrow>Your next step</Eyebrow>
              <h2 className="font-display mt-5 text-3xl font-bold sm:text-4xl">
                Ready to practice with purpose?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-400">
                Bring your resume. We'll help you turn it into a more focused
                mock interview experience.
              </p>
              <Link
                to="/resume"
                className="mt-8 inline-flex rounded-xl bg-cyan-400 px-7 py-3 text-sm font-bold text-[#06151c] transition hover:bg-cyan-300"
              >
                Upload your resume ↗
              </Link>
            </div>
          </section>
          <footer className="border-t border-white/[0.07] px-6 py-7 text-center text-xs text-slate-500">
            HireReady AI · Practice smarter. Interview with confidence.
          </footer>
        </main>
      </PageTransition>
    </>
  );
}
