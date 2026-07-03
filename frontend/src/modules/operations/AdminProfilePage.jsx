import React, { useState } from "react";
import {
  Globe, Cpu, Radio, Building2, MapPin, Users, Zap,
  Shield, Brain, Wifi, Satellite, BadgeCheck,
  Landmark, HeartPulse, Utensils, Tv, Coins, Server,
  Clock, Lock, ShieldCheck, Layers, Phone, Sparkles,
  TrendingUp, Star, Award,
} from "lucide-react";

// ─── palette per division ────────────────────────────────────────────────────
// Each division gets: bg (card fill), border, icon bg, icon text, badge bg/text, accent bar colour

const DIV_COLORS = {
  tech:    { bg: "bg-violet-50",  border: "border-violet-200", iconBg: "bg-violet-600",  iconText: "text-white", badge: "bg-violet-100 text-violet-700 border-violet-200", bar: "bg-violet-500",  hero: "from-violet-700 to-indigo-800",  pill: "bg-violet-600" },
  comm:    { bg: "bg-teal-50",    border: "border-teal-200",   iconBg: "bg-teal-600",    iconText: "text-white", badge: "bg-teal-100 text-teal-700 border-teal-200",       bar: "bg-teal-500",    hero: "from-teal-700 to-emerald-800",   pill: "bg-teal-600" },
  fin:     { bg: "bg-amber-50",   border: "border-amber-200",  iconBg: "bg-amber-500",   iconText: "text-white", badge: "bg-amber-100 text-amber-700 border-amber-200",     bar: "bg-amber-500",   hero: "from-amber-600 to-orange-700",   pill: "bg-amber-500" },
  health:  { bg: "bg-pink-50",    border: "border-pink-200",   iconBg: "bg-pink-600",    iconText: "text-white", badge: "bg-pink-100 text-pink-700 border-pink-200",         bar: "bg-pink-500",    hero: "from-pink-600 to-rose-700",      pill: "bg-pink-600" },
  food:    { bg: "bg-green-50",   border: "border-green-200",  iconBg: "bg-green-600",   iconText: "text-white", badge: "bg-green-100 text-green-700 border-green-200",     bar: "bg-green-500",   hero: "from-green-600 to-teal-700",     pill: "bg-green-600" },
  media:   { bg: "bg-blue-50",    border: "border-blue-200",   iconBg: "bg-blue-600",    iconText: "text-white", badge: "bg-blue-100 text-blue-700 border-blue-200",         bar: "bg-blue-500",    hero: "from-blue-600 to-indigo-700",    pill: "bg-blue-600" },
  group:   { bg: "bg-slate-50",   border: "border-slate-200",  iconBg: "bg-[#FF7A00]",  iconText: "text-white", badge: "bg-orange-100 text-orange-700 border-orange-200",   bar: "bg-[#FF7A00]",  hero: "from-[#0f3460] to-[#16213e]",    pill: "bg-[#FF7A00]" },
};

// ─── data ────────────────────────────────────────────────────────────────────

const GROUP_DATA = {
  founder: {
    name: "Lennox McLeod", title: "Founder & Executive Chairman", initials: "LM",
    bio: "A seasoned global corporate strategist, commercial and corporate law consultant, and professionally qualified accountant with 30+ years of Tier-1 telecom, finance, and boardroom leadership. Specialises in cross-border M&A, corporate governance, and sustainable expansion across five continents.",
  },
  stats: [
    { label: "Headquartered", value: "Sacramento", sub: "California, USA",            color: "from-orange-400 to-orange-600" },
    { label: "Leadership exp.", value: "30+ yrs",  sub: "Founder's track record",     color: "from-violet-500 to-violet-700" },
    { label: "Sectors",        value: "8+",        sub: "AI · Telecom · Fintech · Health · Food · Media", color: "from-teal-500 to-teal-700" },
    { label: "Global reach",   value: "5",         sub: "Continents active",           color: "from-blue-500 to-blue-700" },
  ],
  offices: ["Sacramento, CA (HQ)", "London, UK", "Singapore", "Orlando, FL", "Dover, DE"],
  divisions: [
    { icon: Cpu,       name: "ZoikoTech Inc.",        desc: "AI platforms, SaaS, BSS & cybersecurity",    c: DIV_COLORS.tech   },
    { icon: Radio,     name: "Zoiko Communications",  desc: "MVNOs, eSIM, broadband & telecom",           c: DIV_COLORS.comm   },
    { icon: Coins,     name: "Zoiko Financial Group", desc: "ZoikoPay, ZoikoRemit, Zoiko Money",          c: DIV_COLORS.fin    },
    { icon: HeartPulse,name: "Zoiko Healthcare",      desc: "Pharma, MedTech, nutraceuticals & derma",    c: DIV_COLORS.health },
    { icon: Utensils,  name: "Zoiko Foods Corp",      desc: "Noxx Chicken, Zoiko Kitchen, GingerNoxx",   c: DIV_COLORS.food   },
    { icon: Tv,        name: "Zoiko Media / OTT",     desc: "Zoiko TV — sustainability & tech content",   c: DIV_COLORS.media  },
  ],
};

const TECH_DATA = {
  aiModules: [
    { name: "Nexus",   color: "bg-violet-600 text-white" },
    { name: "Axis",    color: "bg-indigo-600 text-white" },
    { name: "Nova",    color: "bg-purple-600 text-white" },
    { name: "Gnostic", color: "bg-blue-600 text-white"   },
    { name: "Zoikie",  color: "bg-fuchsia-600 text-white"},
    { name: "Halo",    color: "bg-cyan-600 text-white"   },
  ],
  platforms: [
    { icon: Server,     name: "ZoikoNex",    desc: "Flagship OSS/BSS — carrier-grade billing, provisioning & partner integration", c: DIV_COLORS.media  },
    { icon: Clock,      name: "ZoikoTime",   desc: "Time optimisation platform for enterprise productivity",                        c: DIV_COLORS.tech   },
    { icon: Layers,     name: "ZoikoSuite",  desc: "Accounting & legal SaaS — WCAG-compliant, scalable citizen portals",           c: DIV_COLORS.comm   },
    { icon: Shield,     name: "ZoikoShield", desc: "Cybersecurity platform protecting enterprise digital assets",                   c: DIV_COLORS.fin    },
    { icon: ShieldCheck,name: "ZoikoAssure", desc: "RegTech — regulatory compliance and risk management",                          c: DIV_COLORS.health },
    { icon: Users,      name: "ZoikoPal",    desc: "Social connectivity and companionship platform",                               c: DIV_COLORS.food   },
  ],
  quotes: [
    { text: "ZoikoNex turned our legacy OSS/BSS into a modular, AI-native engine. Provisioning dropped by 70%, and fraud detection saved us $2M in the first year.", src: "Telecom client — zoikotech.com", color: "border-violet-400 bg-violet-50" },
    { text: "Our new citizen portal — built with ZoikoSuite — scales to 5× more traffic and meets 100% WCAG accessibility. Digital inclusion done right.",            src: "Public institution client — zoikotech.com", color: "border-teal-400 bg-teal-50" },
  ],
};

const COMM_DATA = {
  stats: [
    { label: "Carrier partners",      value: "4+",      sub: "AT&T · T-Mobile · Orange · BT", color: "from-teal-400 to-teal-600"   },
    { label: "Orbit eSIM countries",  value: "200+",    sub: "Global roaming coverage",        color: "from-blue-400 to-blue-600"   },
    { label: "MVNO brands",           value: "8+",      sub: "Community & lifestyle focused",  color: "from-violet-400 to-violet-600"},
    { label: "UK broadband",          value: "BT Auth.",sub: "Zoiko Broadband reseller",       color: "from-green-400 to-green-600" },
  ],
  brands: [
    { dot: "#185FA5", bg: "bg-blue-50   border-blue-200",   text: "text-blue-800",   name: "Zoiko Mobile USA/UK", desc: "Lifestyle MVNO for animal lovers, music fans, entrepreneurs & veterans" },
    { dot: "#1D9E75", bg: "bg-teal-50   border-teal-200",   text: "text-teal-800",   name: "GoLite Mobile",       desc: "Marine conservation MVNO — profits support ocean protection" },
    { dot: "#D85A30", bg: "bg-orange-50 border-orange-200", text: "text-orange-800", name: "DriverX Mobile",      desc: "For drivers, couriers & logistics — GPS & auto integrations" },
    { dot: "#2C2C2A", bg: "bg-slate-100 border-slate-300",  text: "text-slate-800",  name: "Sable Mobile",        desc: "African American community — cultural ownership & reinvestment" },
    { dot: "#D4537E", bg: "bg-pink-50   border-pink-200",   text: "text-pink-800",   name: "Raíces Mobile",       desc: "Latino & Hispanic families — bilingual support & family-first plans" },
    { dot: "#7F77DD", bg: "bg-violet-50 border-violet-200", text: "text-violet-800", name: "Avivo Mobile",        desc: "LGBTQ+ individuals & families — inclusive plans & wellness partnerships" },
    { dot: "#639922", bg: "bg-green-50  border-green-200",  text: "text-green-800",  name: "EverGuard Mobile",    desc: "Military, veterans & first responders — duty-first connectivity" },
  ],
  orbitFeatures: [
    { icon: Satellite,  name: "GSMA eSIM",      desc: "Standard-compliant provisioning & real-time plan management", c: DIV_COLORS.comm  },
    { icon: Lock,       name: "Compliance",     desc: "GDPR · CCPA · PCI-DSS aligned billing & privacy",            c: DIV_COLORS.media },
    { icon: Globe,      name: "200+ countries", desc: "North America · UK/Europe · Caribbean · APAC · Africa",      c: DIV_COLORS.tech  },
    { icon: Zap,        name: "API sandbox",    desc: "Open to enterprise & partner integrations",                   c: DIV_COLORS.fin   },
  ],
};

// ─── reusable components ─────────────────────────────────────────────────────

function GradientStatCard({ label, value, sub, color }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${color} p-4 text-white shadow-sm`}>
      <p className="text-xs font-medium text-white/70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-white/60 mt-0.5 leading-tight">{sub}</p>}
      <div className="absolute -right-3 -bottom-3 h-14 w-14 rounded-full bg-white/10" />
    </div>
  );
}

function RichPlatformCard({ icon: Icon, name, desc, c }) {
  return (
    <div className={`relative overflow-hidden flex items-start gap-3 rounded-2xl ${c.bg} border ${c.border} p-4`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.iconBg} ${c.iconText} shadow-sm`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-800">{name}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
      </div>
      <div className={`absolute left-0 top-0 h-full w-1 rounded-l-2xl ${c.bar}`} />
    </div>
  );
}

// ─── tab panels ──────────────────────────────────────────────────────────────

function GroupPanel() {
  const { founder, stats, offices, divisions } = GROUP_DATA;
  return (
    <div className="space-y-6">

      {/* Hero — multi-colour ribbon accent */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f3460] to-[#1a1a3e] p-6 text-white shadow-lg">
        {/* colourful top ribbon */}
        <div className="absolute top-0 left-0 right-0 h-1 flex">
          <div className="flex-1 bg-violet-500" /><div className="flex-1 bg-teal-500" />
          <div className="flex-1 bg-amber-500" /><div className="flex-1 bg-pink-500" />
          <div className="flex-1 bg-green-500" /><div className="flex-1 bg-blue-500" />
        </div>
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
        <div className="absolute -left-4 -bottom-6 h-24 w-24 rounded-full bg-white/5" />
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-white/50 mb-2">Global Conglomerate · Founded by Lennox McLeod</p>
        <h2 className="text-2xl font-bold mb-1">Zoiko Group</h2>
        <p className="text-sm text-white/60 mb-4 leading-relaxed max-w-lg">
          A diversified multinational driving innovation across AI, telecom, fintech, healthcare, food, OTT media and consumer markets — operating across five continents.
        </p>
        <div className="flex flex-wrap gap-2">
          {["Sacramento, California (HQ)", "London · Singapore · Orlando · Dover", "5 Continents Active"].map((t) => (
            <span key={t} className="flex items-center gap-1 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs text-white/80">
              <MapPin className="h-3 w-3" />{t}
            </span>
          ))}
        </div>
      </div>

      {/* Founder — orange accent card */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-6 shadow-sm">
        <div className="absolute top-0 left-0 h-full w-1.5 rounded-l-3xl bg-gradient-to-b from-[#FF7A00] to-orange-400" />
        <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF7A00] text-white">
            <Users className="h-4 w-4" />
          </span>
          Founder & Executive Chairman
        </h3>
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF7A00] to-orange-500 text-xl font-bold text-white shadow-[0_4px_20px_rgba(255,122,0,0.35)]">
            {founder.initials}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-base">{founder.name}</p>
            <span className="inline-block mt-0.5 mb-2 rounded-full bg-orange-100 border border-orange-200 px-2.5 py-0.5 text-xs font-semibold text-orange-700">{founder.title}</span>
            <p className="text-xs text-slate-500 leading-relaxed">{founder.bio}</p>
          </div>
        </div>
      </div>

      {/* Stats — gradient cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => <GradientStatCard key={s.label} {...s} />)}
      </div>

      {/* Divisions — full colour per division */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF7A00] text-white"><Landmark className="h-4 w-4" /></span>
          Group Divisions
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {divisions.map(({ icon: Icon, name, desc, c }) => (
            <div key={name} className={`relative overflow-hidden rounded-2xl ${c.bg} border ${c.border} p-4 text-center`}>
              <div className={`absolute top-0 left-0 right-0 h-1 ${c.bar}`} />
              <div className={`mx-auto mb-2 mt-1 flex h-10 w-10 items-center justify-center rounded-xl ${c.iconBg} ${c.iconText} shadow-sm`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-800">{name}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Offices */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white"><MapPin className="h-4 w-4" /></span>
          Global Offices
        </h3>
        <div className="flex flex-wrap gap-2">
          {offices.map((o, i) => {
            const colors = ["bg-violet-100 text-violet-700 border-violet-200","bg-teal-100 text-teal-700 border-teal-200","bg-blue-100 text-blue-700 border-blue-200","bg-amber-100 text-amber-700 border-amber-200","bg-green-100 text-green-700 border-green-200"];
            return (
              <span key={o} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${colors[i % colors.length]}`}>
                <Globe className="h-3 w-3" />{o}
              </span>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-400">Strategic expansion underway across North America, EMEA, and Asia-Pacific.</p>
      </div>
    </div>
  );
}

function TechPanel() {
  const { aiModules, platforms, quotes } = TECH_DATA;
  return (
    <div className="space-y-6">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 to-indigo-800 p-6 text-white shadow-lg">
        <div className="absolute top-0 left-0 right-0 h-1 flex">
          <div className="flex-1 bg-violet-400" /><div className="flex-1 bg-purple-400" /><div className="flex-1 bg-indigo-400" /><div className="flex-1 bg-blue-400" /><div className="flex-1 bg-fuchsia-400" /><div className="flex-1 bg-cyan-400" />
        </div>
        <div className="absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-white/5" />
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-white/50 mb-2">AI & Digital Infrastructure · Zoiko Group Division</p>
        <h2 className="text-2xl font-bold mb-1">ZoikoTech Inc.</h2>
        <p className="text-sm text-white/60 mb-4 leading-relaxed max-w-lg">
          The technology engine of Zoiko Group — building AI-powered platforms for enterprises, telecoms, governments, and institutions across the globe.
        </p>
        <div className="flex flex-wrap gap-2">
          {["California-based, global delivery", "AI · SaaS · BSS · Cybersecurity", "USA · UK · India · Africa · APAC"].map((t) => (
            <span key={t} className="rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs text-white/80">{t}</span>
          ))}
        </div>
      </div>

      {/* Zoiko AI */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-6 shadow-sm">
        <div className="absolute top-0 left-0 h-full w-1.5 rounded-l-3xl bg-gradient-to-b from-violet-600 to-indigo-600" />
        <h3 className="mb-2 flex items-center gap-2 text-base font-bold text-slate-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white"><Brain className="h-4 w-4" /></span>
          Zoiko AI — Agentic Intelligence Platform (ZAIP)
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          An Agentic Intelligence Platform integrating cognition, knowledge, ethics, and execution through six core modules — delivering human-aligned autonomy.
        </p>
        <div className="flex flex-wrap gap-2">
          {aiModules.map((m) => (
            <span key={m.name} className={`rounded-full px-4 py-1.5 text-xs font-bold shadow-sm ${m.color}`}>{m.name}</span>
          ))}
        </div>
      </div>

      {/* Platform suite */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white"><Layers className="h-4 w-4" /></span>
          Platform Suite
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {platforms.map((p) => <RichPlatformCard key={p.name} {...p} />)}
        </div>
      </div>

      {/* ZWS */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm">
        <div className="absolute top-0 left-0 h-full w-1.5 rounded-l-3xl bg-blue-500" />
        <h3 className="mb-2 flex items-center gap-2 text-base font-bold text-slate-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white"><Globe className="h-4 w-4" /></span>
          Zoiko Web Services (ZWS)
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Delivers Tier-1 digital transformation across the USA, UK, India, Africa, and Asia-Pacific — spanning cloud infrastructure, enterprise architecture, and compliance-driven platform engineering.
        </p>
      </div>

      {/* Client results */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white"><Award className="h-4 w-4" /></span>
          Client Results
        </h3>
        <div className="space-y-3">
          {quotes.map((q) => (
            <div key={q.src} className={`rounded-2xl border-l-4 px-4 py-3 ${q.color}`}>
              <p className="text-xs italic text-slate-700 leading-relaxed">"{q.text}"</p>
              <p className="mt-1.5 text-xs font-semibold text-slate-400">— {q.src}</p>
            </div>
          ))}
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3">
            <BadgeCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-xs font-medium text-emerald-700">MVNO client onboarded and fully operational in just 14 days using ZoikoNex.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommPanel() {
  const { stats, brands, orbitFeatures } = COMM_DATA;
  return (
    <div className="space-y-6">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-700 to-emerald-800 p-6 text-white shadow-lg">
        <div className="absolute top-0 left-0 right-0 h-1 flex">
          {["bg-teal-400","bg-blue-400","bg-violet-400","bg-pink-400","bg-orange-400","bg-green-400","bg-cyan-400"].map((c,i) => (
            <div key={i} className={`flex-1 ${c}`} />
          ))}
        </div>
        <div className="absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-white/5" />
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-white/50 mb-2">Telecom · MVNO Portfolio · Zoiko Group Division</p>
        <h2 className="text-2xl font-bold mb-1">Zoiko Communications Group</h2>
        <p className="text-sm text-white/60 mb-4 leading-relaxed max-w-lg">
          A next-generation portfolio of community MVNOs, travel eSIM, and broadband — powered by partnerships with AT&T, T-Mobile, Orange, and BT.
        </p>
        <div className="flex flex-wrap gap-2">
          {["USA · UK · Caribbean · APAC", "Physical SIM · eSIM · Broadband", "Community-first brands"].map((t) => (
            <span key={t} className="rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs text-white/80">{t}</span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => <GradientStatCard key={s.label} {...s} />)}
      </div>

      {/* MVNO brands — each fully coloured */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-white"><Phone className="h-4 w-4" /></span>
          MVNO Brand Portfolio
        </h3>
        <div className="space-y-2">
          {brands.map((b) => (
            <div key={b.name} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${b.bg}`}>
              <span className="h-3 w-3 shrink-0 rounded-full shadow-sm" style={{ background: b.dot }} />
              <span className={`min-w-[130px] text-sm font-bold ${b.text}`}>{b.name}</span>
              <span className="text-xs text-slate-500">{b.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Orbit */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 p-6 shadow-sm">
        <div className="absolute top-0 left-0 h-full w-1.5 rounded-l-3xl bg-gradient-to-b from-teal-500 to-cyan-600" />
        <h3 className="mb-2 flex items-center gap-2 text-base font-bold text-slate-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-white"><Satellite className="h-4 w-4" /></span>
          Zoiko Orbit — Global eSIM Platform
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          Launched August 2025 — delivers intelligent global travel connectivity across 200+ countries, powered by ZoikoNex OSS/BSS infrastructure with GSMA-standard eSIM provisioning.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {orbitFeatures.map((f) => <RichPlatformCard key={f.name} {...f} />)}
        </div>
      </div>

      {/* Broadband */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 p-5 shadow-sm">
        <div className="absolute top-0 left-0 h-full w-1.5 rounded-l-3xl bg-blue-500" />
        <h3 className="mb-2 flex items-center gap-2 text-base font-bold text-slate-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white"><Wifi className="h-4 w-4" /></span>
          Zoiko Broadband (UK)
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Operated under Zoiko Telecom Ltd (UK) as an authorised reseller of BT Wholesale and EE SIMs — offering HTTP, SOGEA, and superfast broadband plans alongside SIP trunking and IoT services for homes and businesses across the UK.
        </p>
      </div>
    </div>
  );
}

// ─── main ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "group", label: "Zoiko Group", icon: Building2, active: "bg-gradient-to-r from-orange-500 to-[#FF7A00] text-white shadow-[0_2px_12px_rgba(255,122,0,0.35)]" },
  { id: "tech",  label: "ZoikoTech",  icon: Cpu,       active: "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_2px_12px_rgba(124,58,237,0.35)]" },
  { id: "comm",  label: "Zoiko Comms",icon: Radio,     active: "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-[0_2px_12px_rgba(13,148,136,0.35)]" },
];

export default function ZoikoProfilePage() {
  const [activeTab, setActiveTab] = useState("group");

  return (
    <div className="space-y-6 font-sans">

      {/* Header */}
      <div className="text-center py-3">
        {/* colourful underline accent */}
        <div className="flex justify-center gap-1 mb-3">
          {["bg-violet-500","bg-teal-500","bg-amber-500","bg-pink-500","bg-green-500","bg-blue-500"].map((c,i) => (
            <div key={i} className={`h-1 w-8 rounded-full ${c}`} />
          ))}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">ZOIKO GROUPS</h1>
        <p className="mt-2 text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
          A diversified global conglomerate spanning AI, Telecom, Fintech, Healthcare, Foods &amp; Media — operating across five continents under the vision of Founder Lennox McLeod.
        </p>
        {/* division pills row */}
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {[
            { label: "AI & Tech",    cls: "bg-violet-100 text-violet-700 border-violet-200" },
            { label: "Telecom",      cls: "bg-teal-100 text-teal-700 border-teal-200"       },
            { label: "Fintech",      cls: "bg-amber-100 text-amber-700 border-amber-200"    },
            { label: "Healthcare",   cls: "bg-pink-100 text-pink-700 border-pink-200"       },
            { label: "Foods",        cls: "bg-green-100 text-green-700 border-green-200"    },
            { label: "Media / OTT",  cls: "bg-blue-100 text-blue-700 border-blue-200"       },
          ].map((p) => (
            <span key={p.label} className={`rounded-full border px-3 py-1 text-xs font-semibold ${p.cls}`}>{p.label}</span>
          ))}
        </div>
      </div>

      {/* Tab bar — coloured active states */}
      <div className="flex gap-1.5 rounded-2xl bg-slate-100 border border-slate-200 p-1.5">
        {TABS.map(({ id, label, icon: Icon, active }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
              activeTab === id ? active : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "group" && <GroupPanel />}
      {activeTab === "tech"  && <TechPanel />}
      {activeTab === "comm"  && <CommPanel />}
    </div>
  );
}