'use client';

import { useState, ReactNode } from 'react';

interface Props {
  /** 1-based index shown on the left of the header row. */
  index: number;
  /** The inline title input shown in the header — stays editable while collapsed. */
  title: string;
  onTitleChange: (value: string) => void;
  titlePlaceholder?: string;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onRemove: () => void;
  removeTitle?: string;
  /** Whether the body starts expanded. Usually: empty cards open, filled cards closed. */
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * Compact card shell used by ContentBlocksEditor, ProductsEditor and
 * SolutionsEditor. The header row (index + inline title input + reorder +
 * remove + chevron) stays visible when collapsed so users can still rename,
 * reorder and delete items without expanding the body.
 */
export default function CollapsibleCard({
  index,
  title,
  onTitleChange,
  titlePlaceholder,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  onRemove,
  removeTitle = 'Ta bort',
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-gray-50/70 rounded-lg">
      {/* Header row — always visible */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Kollapsa' : 'Expandera'}
          className="text-gray-300 hover:text-gray-500 flex-shrink-0"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${open ? 'rotate-90' : ''}`}
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>

        <span className="text-[11px] text-gray-400 w-4 text-center flex-shrink-0">
          {index + 1}
        </span>

        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="flex-1 min-w-0 text-sm bg-transparent outline-none text-gray-700 placeholder:text-gray-300"
          placeholder={titlePlaceholder}
          onClick={(e) => e.stopPropagation()}
        />

        {(onMoveUp || onMoveDown) && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {onMoveUp && (
              <button
                type="button"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                className="text-gray-300 hover:text-gray-500 disabled:opacity-30 text-[11px] px-0.5"
                title="Flytta upp"
              >
                ▲
              </button>
            )}
            {onMoveDown && (
              <button
                type="button"
                onClick={onMoveDown}
                disabled={!canMoveDown}
                className="text-gray-300 hover:text-gray-500 disabled:opacity-30 text-[11px] px-0.5"
                title="Flytta ner"
              >
                ▼
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onRemove}
          className="text-gray-300 hover:text-red-400 text-[11px] px-0.5 ml-0.5 flex-shrink-0"
          title={removeTitle}
        >
          ✕
        </button>
      </div>

      {/* Body — collapsible */}
      {open && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </div>
  );
}
