"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Video,
  Layers,
  FileText,
  BarChart2,
  BookOpen,
  Settings,
  HelpCircle,
} from "lucide-react";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Mock Interviews", href: "/dashboard/interviews", icon: Layers },
  { name: "Upload Video", href: "/dashboard/interviews/upload", icon: Video },
  { name: "Resume Intelligence", href: "/dashboard/resume", icon: FileText },
  { name: "Performance Analytics", href: "/dashboard/analytics", icon: BarChart2 },
  { name: "Practice Plans", href: "/dashboard/practice", icon: BookOpen },
  { name: "Settings & Privacy", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/50 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Workspace
        </div>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
        <div className="flex items-center space-x-2 text-slate-300 font-medium">
          <HelpCircle className="h-4 w-4 text-blue-400" />
          <span>Interview Coaching AI</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          Record your responses, review timestamped transcripts, and follow adaptive technical questions.
        </p>
      </div>
    </aside>
  );
}
