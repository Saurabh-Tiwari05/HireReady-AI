import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SectionTitle from "../components/ui/SectionTitle";

gsap.registerPlugin(ScrollTrigger);

// Demo data for the landing-page preview only. The authenticated
// dashboard at src/pages/Dashboard.jsx uses real backend data.
const METRICS = [
  { key: "communication", label: "Communication", value: 82, color: "#00F2FF" },
  { key: "technical", label: "Technical", value: 76, color: "#60A5FA" },
  { key: "behavior", label: "Behavioral", value: 88, color: "#A78BFA" },
  { key: "confidence", label: "Confidence", value: 69, color: "#F472B6" },
  { key: "coding", label: "Coding", value: 91, color: "#34D399" },
];
const HISTORY = [
  { date: "Week 1", score: 52 },
  { date: "Week 2", score: 61 },
  { date: "Week 3", score: 58 },
  { date: "Week 4", score: 70 },
  { date: "Week 5", score: 77 },
  { date: "Week 6", score: 86 },
];
const TIMELINE = [
  { stage: "Resume Screening", when: "Mon 9:00", status: "done", score: 91 },
  { stage: "Technical Round 1", when: "Mon 10:30", status: "done", score: 84 },
  {
    stage: "Communication Check",
    when: "Tue 11:00",
    status: "done",
    score: 88,
  },
  { stage: "System Design", when: "Wed 14:00", status: "done", score: 79 },
  { stage: "Final Panel", when: "Fri 15:30", status: "upcoming", score: null },
];
const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));

export function Gauge({
  value = 0,
  color = "#00F2FF",
  size = 170,
  stroke = 10,
}) {
  const circleRef = useRef(null);
  const [display, setDisplay] = useState(0);
  const safeValue = clamp(value);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;
    const counter = { value: 0 };
    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        scrollTrigger: { trigger: circle, start: "top 95%", once: true },
      });
      timeline.to(
        circle,
        {
          strokeDashoffset: circumference * (1 - safeValue / 100),
          duration: 1.6,
          ease: "power3.out",
        },
        0,
      );
      timeline.to(
        counter,
        {
          value: safeValue,
          duration: 1.6,
          ease: "power3.out",
          onUpdate: () => setDisplay(Math.round(counter.value)),
        },
        0,
      );
    });
    return () => context.revert();
  }, [safeValue, circumference]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,.08)"
          strokeWidth={stroke}
        />
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tabular-nums text-white">
          {display}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-white/40">
          /100
        </span>
      </div>
    </div>
  );
}

export function AnimatedBar({ height = 0, color = "#A78BFA", delay = 0 }) {
  const barRef = useRef(null);
  const safeHeight = clamp(height);
  useEffect(() => {
    if (!barRef.current) return;
    const context = gsap.context(() => {
      gsap.fromTo(
        barRef.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          transformOrigin: "bottom",
          duration: 0.9,
          delay,
          ease: "power3.out",
          scrollTrigger: {
            trigger: barRef.current,
            start: "top 95%",
            once: true,
          },
        },
      );
    });
    return () => context.revert();
  }, [delay, safeHeight]);
  return (
    <div
      ref={barRef}
      className="w-full rounded-t-md"
      style={{
        height: `${safeHeight}%`,
        background: `linear-gradient(180deg, ${color}, ${color}33)`,
      }}
    />
  );
}

export function ProgressBar({ value = 0, color = "#00F2FF" }) {
  const barRef = useRef(null);
  const safeValue = clamp(value);
  useEffect(() => {
    if (!barRef.current) return;
    const context = gsap.context(() => {
      gsap.fromTo(
        barRef.current,
        { width: "0%" },
        {
          width: `${safeValue}%`,
          duration: 1.3,
          ease: "power3.out",
          scrollTrigger: {
            trigger: barRef.current,
            start: "top 95%",
            once: true,
          },
        },
      );
    });
    return () => context.revert();
  }, [safeValue]);
  return (
    <div
      className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10"
      role="progressbar"
      aria-valuenow={safeValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        ref={barRef}
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          background: `linear-gradient(90deg, ${color}, ${color}88)`,
          boxShadow: `0 0 12px ${color}66`,
        }}
      />
    </div>
  );
}

export default function Dashboard() {
  const sectionRef = useRef(null);
  const [filter, setFilter] = useState("All");
  const filtered = HISTORY.filter(
    (_, index) =>
      filter === "All" || (filter === "First half" ? index < 3 : index >= 3),
  );

  useEffect(() => {
    if (!sectionRef.current) return;
    const context = gsap.context(() => {
      gsap.fromTo(
        ".dash-card",
        { opacity: 0, y: 38, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 85%",
            once: true,
          },
        },
      );
    }, sectionRef);
    return () => context.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative bg-bg"
      aria-label="Performance dashboard preview"
    >
      <div className="section relative z-10 mx-auto max-w-6xl px-6">
        <SectionTitle
          title="Your Performance Dashboard"
          gradient={["Performance"]}
          subtitle="A preview of how HireReady AI turns practice into measurable progress."
        />
        <div className="mt-5 text-center text-xs uppercase tracking-[0.2em] text-white/35">
          Illustrative demo data
        </div>
        <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="dash-card glass rounded-2xl p-6">
            <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-white/40">
              Overall Score
            </p>
            <div className="flex justify-center">
              <Gauge value={86} color="#00F2FF" />
            </div>
            <p className="mt-6 text-center text-sm text-gray-400">
              Example improvement{" "}
              <span className="font-bold text-emerald-400">+14 points</span>
            </p>
          </div>
          <div className="dash-card glass rounded-2xl p-6">
            <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-white/40">
              Skill Breakdown
            </p>
            <div className="space-y-5">
              {METRICS.map((metric) => (
                <div key={metric.key} className="flex items-center gap-4">
                  <span className="w-28 text-sm text-gray-300">
                    {metric.label}
                  </span>
                  <ProgressBar value={metric.value} color={metric.color} />
                  <span className="w-8 text-right text-sm font-bold tabular-nums text-white">
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="dash-card glass rounded-2xl p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold uppercase tracking-widest text-white/40">
                Progress History
              </p>
              <div className="flex gap-1 rounded-full bg-white/5 p-1">
                {["All", "First half", "Second half"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFilter(option)}
                    aria-pressed={filter === option}
                    className={`rounded-full px-2 py-1 text-[11px] transition-colors ${filter === option ? "bg-accent/20 text-accent" : "text-white/50 hover:text-white"}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex h-44 items-end gap-3">
              {filtered.map((item, index) => (
                <div
                  key={item.date}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <div className="flex h-36 w-full items-end">
                    <AnimatedBar
                      height={item.score}
                      color="#A78BFA"
                      delay={index * 0.1}
                    />
                  </div>
                  <span className="text-[10px] text-white/40">
                    {item.date.replace("Week ", "W")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="dash-card glass mt-4 rounded-2xl p-6">
          <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-white/40">
            Sample Interview Timeline
          </p>
          <div className="relative flex flex-col gap-5 pl-6">
            <div className="absolute bottom-2 left-[7px] top-2 w-px bg-gradient-to-b from-accent via-white/10 to-transparent" />
            {TIMELINE.map((item) => (
              <div
                key={item.stage}
                className="relative flex items-center gap-4"
              >
                <span
                  className={`absolute -left-6 h-[15px] w-[15px] rounded-full border-2 ${item.status === "done" ? "border-accent bg-accent/30 shadow-[0_0_10px_rgba(0,242,255,0.6)]" : "border-white/20 bg-white/5"}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{item.stage}</p>
                  <p className="text-xs text-white/40">{item.when}</p>
                </div>
                <span
                  className={`rounded-full bg-white/5 px-3 py-1 text-xs ${item.score == null ? "text-white/40" : "font-bold text-accent"}`}
                >
                  {item.score == null ? "Upcoming" : item.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
