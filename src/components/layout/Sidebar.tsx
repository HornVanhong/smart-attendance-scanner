"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScanLine,
  CalendarCheck,
  GraduationCap,
  School,
  BookOpen,
  BarChart3,
  History,
  Settings,
  ChevronRight,
  ShieldAlert,
  UserCheck,
  Sparkles,
} from "lucide-react";

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string; email: string }>({
    name: "Teacher",
    role: "TEACHER",
    email: "teacher@school.edu",
  });
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleRoleChange = async (userId: string) => {
    setIsSwitchingRole(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSwitchingRole(false);
    }
  };

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Scan Attendance", href: "/scan", icon: ScanLine, highlight: true },
    { name: "Attendance Records", href: "/attendance", icon: CalendarCheck },
    { name: "Students", href: "/students", icon: GraduationCap },
    { name: "Classes & Subjects", href: "/classes", icon: School },
    { name: "Reports & Analytics", href: "/reports", icon: BarChart3 },
    { name: "Scan History", href: "/history", icon: History },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-slate-900 text-slate-100 border-r border-slate-800 transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        } ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* App Branding */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-400 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
              <ScanLine className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-wide text-white leading-tight">
                  SmartAttendance
                </span>
                <span className="text-[11px] font-medium text-sky-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI Sheet Scanner
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          {!collapsed && (
            <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              Main Menu
            </div>
          )}

          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onMobileClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group relative ${
                  isActive
                    ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                    : item.highlight
                    ? "text-sky-300 hover:bg-slate-800/80 hover:text-white"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
                title={collapsed ? item.name : undefined}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive
                      ? "text-white"
                      : item.highlight
                      ? "text-sky-400 group-hover:text-sky-300"
                      : "text-slate-400 group-hover:text-slate-200"
                  }`}
                />
                {!collapsed && <span>{item.name}</span>}

                {item.highlight && !collapsed && !isActive && (
                  <span className="ml-auto text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded font-semibold border border-sky-500/30">
                    NEW
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* User Profile & Role Switcher */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          {!collapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-sky-400 shrink-0">
                  {currentUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-semibold text-white truncate">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">
                    {currentUser.role.replace("_", " ")}
                  </span>
                </div>
              </div>

              {/* Quick Role Switcher for Pairing & QA */}
              <div className="pt-1 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Switch Role:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleRoleChange("usr_teacher")}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                      currentUser.role === "TEACHER"
                        ? "bg-sky-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                    title="Teacher"
                  >
                    Teacher
                  </button>
                  <button
                    onClick={() => handleRoleChange("usr_reviewer")}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                      currentUser.role === "ATTENDANCE_REVIEWER"
                        ? "bg-amber-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                    title="Reviewer"
                  >
                    Reviewer
                  </button>
                  <button
                    onClick={() => handleRoleChange("usr_admin")}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                      currentUser.role === "ADMIN"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                    title="Admin"
                  >
                    Admin
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-sky-400"
                title={`${currentUser.name} (${currentUser.role})`}
              >
                {currentUser.name[0]}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
