'use client';

import { ReactNode } from 'react';
import EditorSection from '@/components/editors/EditorSection';

interface Props {
  title: string;
  /** True = sektion visas i preview/render. Optional för sektioner som inte har toggle (metadata). */
  visible?: boolean;
  onToggleVisible?: (v: boolean) => void;
  /** Hint som visas till höger i header. Bibehållen för bak­åtkompatibilitet men inte längre renderad. */
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * Thin wrapper kvar för bakåtkompatibilitet — delegerar till den delade
 * `EditorSection`-headern så alla editorer ser likadana ut.
 */
export default function CollapsibleSection({
  title,
  visible,
  onToggleVisible,
  defaultOpen,
  children,
}: Props) {
  return (
    <EditorSection
      title={title}
      visible={visible}
      onToggleVisible={onToggleVisible}
      defaultOpen={defaultOpen}
    >
      {children}
    </EditorSection>
  );
}

/** Liten input-rad-helper för repetitivt mönster. */
export function FieldRow({
  label,
  children,
  help,
}: {
  label: string;
  children: ReactNode;
  help?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
      {help && <p className="mt-1 text-[11px] text-gray-400">{help}</p>}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:border-gray-400 focus:outline-none"
    />
  );
}

export function TextareaInput({ value, onChange, rows = 4, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:border-gray-400 focus:outline-none"
    />
  );
}

export function SelectInput<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:border-gray-400 focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function CheckboxInput({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-gray-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
      {label}
    </label>
  );
}
