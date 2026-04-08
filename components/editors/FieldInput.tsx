'use client';

interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}

export function FieldInput({ label, value, onChange, placeholder, type = 'text' }: InputProps) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-lp-text-light">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 block w-full rounded-md border border-lp-border bg-white px-3 py-2 text-sm text-lp-text placeholder:text-gray-400 focus:border-lp-main focus:outline-none focus:ring-1 focus:ring-lp-main"
      />
    </label>
  );
}

interface TextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  hint?: string;
}

export function FieldTextarea({ label, value, onChange, placeholder, rows = 4, hint }: TextareaProps) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-lp-text-light">{label}</span>
      {hint && <span className="text-xs text-gray-400 ml-1">({hint})</span>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="mt-1 block w-full rounded-md border border-lp-border bg-white px-3 py-2 text-sm text-lp-text placeholder:text-gray-400 focus:border-lp-main focus:outline-none focus:ring-1 focus:ring-lp-main resize-y"
      />
    </label>
  );
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

export function FieldSelect({ label, value, onChange, options }: SelectProps) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-lp-text-light">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-md border border-lp-border bg-white px-3 py-2 text-sm text-lp-text focus:border-lp-main focus:outline-none focus:ring-1 focus:ring-lp-main"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function FieldCheckbox({ label, checked, onChange }: CheckboxProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-lp-border text-lp-main focus:ring-lp-main h-4 w-4"
      />
      <span className="text-sm text-lp-text">{label}</span>
    </label>
  );
}
