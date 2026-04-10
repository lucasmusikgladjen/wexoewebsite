'use client';

interface Segment {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface Props {
  /** Label shown above the field, same styling as FieldInput. */
  label: string;
  segments: Segment[];
}

/**
 * Groups two related text inputs under a single label. Visually looks and
 * behaves like a regular FieldInput — same gray background, label style,
 * rounded corners, focus ring — but the inner row is split into segments
 * by thin vertical dividers so the user can tell the inputs belong
 * together without any extra chrome.
 *
 * Used for the Text + URL pair on each button configuration in
 * HeroEditor and ProductsEditor.
 */
export default function ButtonFieldset({ label, segments }: Props) {
  return (
    <label className="block">
      <span className="text-[11px] text-gray-400">{label}</span>
      <div className="mt-0.5 flex bg-gray-100/80 rounded divide-x divide-gray-200 focus-within:bg-white focus-within:ring-1 focus-within:ring-gray-200">
        {segments.map((seg, i) => (
          <input
            key={i}
            type="text"
            value={seg.value}
            onChange={(e) => seg.onChange(e.target.value)}
            placeholder={seg.placeholder}
            className="flex-1 min-w-0 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-300 bg-transparent outline-none"
          />
        ))}
      </div>
    </label>
  );
}
