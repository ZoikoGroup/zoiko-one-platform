"use client";

import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import useFilteredNavigation from "../hooks/useFilteredNavigation";
import { ROLE_LABELS } from "../config/roles";
import { useAuth } from "../context/AuthContext";

import SearchBar from "./SearchBar.jsx";
import logo from "../assets/logo.png";

function isActive(href, pathname) {
  if (!href) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MenuItem({ item, pathname }) {
  const hasActiveChild = item.children
    ? item.children.some((child) => isActive(child.href, pathname))
    : false;
  const [expanded, setExpanded] = useState(hasActiveChild);

  useEffect(() => {
    if (hasActiveChild) {
      setExpanded(true);
    }
  }, [hasActiveChild, pathname]);

  if (item.sidebar === false) return null;

  if (item.children) {
    const active = hasActiveChild;
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={`group inline-flex w-full items-center justify-between gap-3 rounded-3xl border px-4 py-3 text-left text-sm transition-all duration-200 ${
            active
              ? "border-[#FF7A00]/30 bg-[#FF7A00]/5 text-[#FF7A00] font-semibold"
              : "border-slate-100 bg-slate-50/50 text-slate-600 hover:border-slate-200 hover:bg-slate-100/70 hover:text-slate-900"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <item.icon className={`h-4 w-4 transition-transform duration-200 group-hover:scale-110 ${active ? "text-[#FF7A00]" : ""}`} />
            {item.label}
          </span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </button>
        {expanded ? (
          <div className="space-y-1 pl-5">
            {item.children.map((child) => (
              <MenuItem key={child.label} item={child} pathname={pathname} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  const isCurrent = isActive(item.href, pathname);

  if (item.dp) {
    return (
      <NavLink
        to={item.href ?? "/"}
        className={({ isActive: navActive }) => {
          const active = navActive || isCurrent;
          return `group flex items-center gap-3 rounded-3xl border px-4 py-3 text-sm transition-all duration-200 ${
            active
              ? "border-[#FF7A00]/30 bg-gradient-to-r from-[#FF7A00]/10 to-transparent text-[#FF7A00] font-semibold shadow-[0_4px_12px_rgba(255,122,0,0.05)]"
              : "border-slate-100 bg-slate-50/50 text-slate-600 hover:border-slate-200 hover:bg-slate-100/70 hover:text-slate-900"
          }`;
        }}
        end
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#FF7A00] to-orange-400 text-white text-xs font-bold shadow-[0_2px_8px_rgba(255,122,0,0.25)]">
          PO
        </div>
        <span>{item.label}</span>
      </NavLink>
    );
  }

  return (
    <NavLink
      to={item.href ?? "/"}
      className={({ isActive: navActive }) => {
        const active = navActive || isCurrent;
        return `group flex items-center gap-3 rounded-3xl border px-4 py-3 text-sm transition-all duration-200 ${
          active
            ? "border-[#FF7A00]/30 bg-gradient-to-r from-[#FF7A00]/10 to-transparent text-[#FF7A00] font-semibold shadow-[0_4px_12px_rgba(255,122,0,0.05)]"
            : "border-slate-100 bg-slate-50/50 text-slate-600 hover:border-slate-200 hover:bg-slate-100/70 hover:text-slate-900"
        }`;
      }}
      end
    >
      <item.icon className={`h-4 w-4 transition-transform duration-200 group-hover:scale-110 ${isCurrent ? "text-[#FF7A00]" : ""}`} />
      <span>{item.label}</span>
      {item.badge ? (
        <span className="ml-auto rounded-full bg-[#FF7A00] px-2.5 py-0.5 text-[9px] font-semibold tracking-wider text-white shadow-[0_2px_6px_rgba(255,122,0,0.2)]">
          {item.badge}
        </span>
      ) : null}
    </NavLink>
  );
}

export default function Sidebar({ open, onClose }) {
  const { pathname } = useLocation();
  const { role, product } = useAuth();
  const filteredSections = useFilteredNavigation(role, product);

  return (

    <div>
      <div className={`fixed inset-0 z-30 bg-slate-950/40 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={onClose} />
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 overflow-y-auto border-r border-slate-200 bg-white px-4 py-6 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Link to="/"><img src={logo} alt="Zoiko One" className="h-8 w-auto object-contain self-start" /></Link>
            <span className="self-start rounded-full bg-[#FF7A00]/10 border border-[#FF7A00]/25 px-2.5 py-0.5 text-xs font-semibold text-[#FF7A00]">
              {ROLE_LABELS[role] ?? ""}
            </span>

          </div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 lg:hidden">
            X
          </button>
        </div>
        <SearchBar />
        {filteredSections.map((section, idx) => (

          <div key={`${section.title}-${idx}`} className="mb-8">
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">{section.title}</p>
            <div className="space-y-2">
              {section.items.map((item) => (
                <MenuItem key={item.label} item={item} pathname={pathname} />
              ))}
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}
