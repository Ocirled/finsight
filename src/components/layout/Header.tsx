"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { getInitials } from "@/lib/utils";

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function Header({ user }: HeaderProps) {
  return (
    <header
      className="h-14 px-4 md:px-6 flex items-center justify-between gap-4"
      style={{ background: "#ffffff", borderBottom: "1px solid #dad4c8" }}
    >
      {/* Logo — mobile + tablet only (no sidebar on these breakpoints) */}
      <Link href="/dashboard" className="flex lg:hidden items-center gap-2 cursor-pointer shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#078a52" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
          <polyline points="17 6 23 6 23 12"/>
        </svg>
        <span className="text-sm font-semibold tracking-tight">FinSight</span>
      </Link>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
            style={{ background: "#078a52" }}
          >
            {user.name ? getInitials(user.name) : "U"}
          </div>
          <div className="text-sm hidden sm:block">
            <p className="font-medium leading-none" style={{ color: "#000000" }}>
              {user.name ?? "Pengguna"}
            </p>
            <p className="text-xs mt-0.5 truncate max-w-36" style={{ color: "#9f9b93" }}>
              {user.email}
            </p>
          </div>
        </div>
        <div className="w-px h-4" style={{ background: "#dad4c8" }} />
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-1.5 text-sm transition-colors duration-200 cursor-pointer"
          style={{ color: "#9f9b93" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#000000"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#9f9b93"; }}
          title="Keluar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  );
}
