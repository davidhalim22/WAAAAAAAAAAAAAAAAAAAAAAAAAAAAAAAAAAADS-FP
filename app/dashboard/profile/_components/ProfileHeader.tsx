"use client";

import { Flame, Zap, BookOpen, CheckCircle2 } from "lucide-react";

type Language = {
  flag: string;
  name: string;
  level: string;
  xp: number;
};

type ProfileHeaderProps = {
  initials: string;
  displayName: string;
  email?: string | null;
  displayLanguages: Language[];
  stats: {
    streak: string;
    xp: string;
    words: string;
    lessons: string;
  };
};

export function ProfileHeader({initials, displayName, email, displayLanguages, stats}: ProfileHeaderProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-start gap-6">
        <div className="relative flex-shrink-0">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold"
            style={{ background: "linear-gradient(135deg, #4a7cf7, #7c3aed)" }}>
            {initials}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-800">
            {displayName}
          </h2>

          <p className="text-sm text-gray-500 mt-0.5">
            {email}
          </p>

          <div className="flex flex-wrap gap-2 mt-3">
            {displayLanguages.map((l) => (
              <span key={l.name} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full font-medium">
                {l.flag} {l.name} · {l.level}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: "Streak",
              value: stats.streak,
              icon: Flame,
              color: "#ff6b35",
            },
            {
              label: "Total XP",
              value: stats.xp,
              icon: Zap,
              color: "#4a7cf7",
            },
            {
              label: "Words",
              value: stats.words,
              icon: BookOpen,
              color: "#34d399",
            },
            {
              label: "Lessons",
              value: stats.lessons,
              icon: CheckCircle2,
              color: "#a78bfa",
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="text-center bg-gray-50 rounded-xl p-3 min-w-[80px]">
              <Icon size={16} style={{ color }} className="mx-auto mb-1"/>
              <p className="text-lg font-bold text-gray-800 leading-none">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}