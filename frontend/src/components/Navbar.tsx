"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Video, User as UserIcon, LogOut, LayoutDashboard } from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white">InterviewLens</span>
            <span className="text-blue-500 font-semibold ml-1">AI</span>
          </div>
        </Link>

        <nav className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center space-x-2 text-sm text-slate-300 hover:text-white px-3 py-2 rounded-md hover:bg-slate-800 transition"
              >
                <LayoutDashboard className="h-4 w-4 text-blue-400" />
                <span>Dashboard</span>
              </Link>
              <div className="flex items-center space-x-2 border-l border-slate-800 pl-4">
                <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xs font-semibold">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left text-xs">
                  <div className="font-medium text-slate-200">{user.full_name}</div>
                  <div className="text-slate-400">{user.target_role}</div>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md transition"
                  title="Log out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                href="/login"
                className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2 rounded-md hover:bg-slate-800 transition"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-md shadow-sm transition"
              >
                Get Started
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
