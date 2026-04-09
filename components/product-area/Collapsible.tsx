'use client';

import { useState, ReactNode } from 'react';

interface Props {
  title: string;
  /** Smaller label shown next to the title (e.g. "inte ifylld"). */
  meta?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** Minimal collapsible panel — thin divider, chevron, no fills. */
export default function Collapsible({ title, meta, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-3 text-left group"
      >
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="text-sm text-gray-800 group-hover:text-gray-900 transition-colors truncate">
            {title}
          </span>
          {meta && <span className="text-xs text-gray-300 truncate">{meta}</span>}
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-gray-300 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && <div className="pb-6 pt-1">{children}</div>}
    </div>
  );
}
