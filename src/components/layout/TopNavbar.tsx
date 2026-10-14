"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Search,
  Bell,
  Building2,
  ChevronDown,
  User,
  LogOut,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";

interface TopNavbarProps {
  onToggleSidebar: () => void;
}

export function TopNavbar({ onToggleSidebar }: TopNavbarProps) {
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Derive breadcrumb and title
  const getPageMeta = () => {
    if (pathname === "/") return { title: "Dashboard Overview", breadcrumb: "Dashboard" };
    if (pathname === "/scan") return { title: "Scan Attendance Sheet", breadcrumb: "Scan Attendance" };
    if (pathname.includes("/review")) return { title: "Recognition Review Workspace", breadcrumb: "Scan / Review" };
    if (pathname.startsWith("/attendance")) return { title: "Attendance Records", breadcrumb: "Attendance" };
    if (pathname.startsWith("/students")) return { title: "Student Management", breadcrumb: "Students" };
    if (pathname.startsWith("/classes")) return { title: "Classes & Subjects", breadcrumb: "Academic Management" };
    if (pathname.startsWith("/reports")) return { title: "Reports & Analytics", breadcrumb: "Reports" };
    if (pathname.startsWith("/history")) return { title: "Scan History & Audit", breadcrumb: "History" };
    if (pathname.startsWith("/settings")) return { title: "System & Symbol Settings", breadcrumb: "Settings" };
    return { title: "Smart Attendance", breadcrumb: "Portal" };
  };

  const { title, breadcrumb } = getPageMeta();

  const notifications = [
    {
      id: 1,
      title: "Scan Needs Review",
      desc: "Grade 10 - Section A Math scan has 4 low-confidence cells.",
      time: "10m ago",
      type: "alert",
    },
    {
      id: 2,
      title: "Attendance Finalized",
      desc: "Grade 11 - STEM Physics records confirmed.",
      time: "1h ago",
      type: "success",
    },
    {
      id: 3,
      title: "Daily Report Ready",
      desc: "Daily school attendance rate reached 94.2%.",
      time: "3h ago",
      type: "info",
    },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shadow-sm">
      {/* Left side: Hamburger + Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden"
          title="Toggle Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Link href="/" className="hover:text-sky-600 transition-colors">
              Portal
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">{breadcrumb}</span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
            {title}
          </h1>
        </div>
      </div>

      {/* Right side: Global Search + School + Notifications + User */}
      <div className="flex items-center gap-3">
        {/* Global Search Bar (desktop) */}
        <div className="relative hidden md:block w-56 lg:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student, ID, class..."
            className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
          />
        </div>

        {/* Current School Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-700">
          <Building2 className="w-4 h-4 text-sky-600" />
          <span className="font-semibold">Oakridge Academy</span>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800">Notifications</span>
                <span className="text-[10px] text-sky-600 font-semibold cursor-pointer hover:underline">
                  Mark all read
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 hover:bg-slate-50 transition-colors flex gap-2.5">
                    {n.type === "alert" && <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                    {n.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                    {n.type === "info" && <FileText className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />}
                    <div className="flex flex-col text-xs">
                      <span className="font-semibold text-slate-800">{n.title}</span>
                      <span className="text-slate-500 text-[11px] mt-0.5 leading-snug">{n.desc}</span>
                      <span className="text-slate-400 text-[10px] mt-1">{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar & Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              MC
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800">Prof. Michael Chang</p>
                <p className="text-[11px] text-slate-500">mchang@oakridge.edu</p>
                <span className="inline-block mt-1 text-[10px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  Senior Faculty (Teacher)
                </span>
              </div>
              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <Sliders className="w-4 h-4 text-slate-400" /> Symbol Configuration
                </Link>
                <Link
                  href="/history"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <User className="w-4 h-4 text-slate-400" /> Activity Log
                </Link>
              </div>
              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={() => setShowProfileMenu(false)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 text-red-500" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
