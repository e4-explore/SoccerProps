"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export interface BreadcrumbOption {
  href: string;
  label: string;
  logo?: string;
  active?: boolean;
}

export function BreadcrumbDropdown({
  label,
  options,
  isLast = false,
}: {
  label: string;
  options: BreadcrumbOption[];
  isLast?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-0.5 text-xs transition-colors ${
          isLast
            ? "text-zinc-300 hover:text-white"
            : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        {label}
        <svg viewBox="0 0 20 20" className="size-3 mt-px shrink-0 text-zinc-600">
          <path
            d="M5.5 8l4.5 4.5L14.5 8"
            stroke="currentColor"
            strokeWidth="1.75"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-zinc-900 ring-1 ring-zinc-800 rounded-lg shadow-xl min-w-[180px] max-h-72 overflow-y-auto py-1">
          {options.map((opt) => (
            <Link
              key={opt.href}
              href={opt.href}
              prefetch={false}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                opt.active
                  ? "text-white font-medium bg-zinc-800"
                  : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {opt.logo && (
                <Image
                  src={opt.logo}
                  alt=""
                  width={16}
                  height={16}
                  className="object-contain shrink-0"
                />
              )}
              {opt.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
