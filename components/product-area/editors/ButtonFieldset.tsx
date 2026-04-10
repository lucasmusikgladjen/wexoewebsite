'use client';

interface Segment {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface Props {
  /** Caption shown floating over the top border — e.g. "KNAPP", "KNAPP 1". */
  label: string;
  /** Tailwind background class for the floating caption pill. Must match
   *  the surrounding surface so the caption visually breaks the top border.
   *  Defaults to `bg-white`; pass `bg-gray-50` (or similar) when the
   *  compound sits inside a tinted card body. */
  labelBg?: string;
  segments: Segment[];
}

/**
 * Compound field that groups two or more related text inputs — typically a
 * button's Text + URL — inside a single rounded border. Each segment has
 * its own small label and a borderless input; a thin vertical divider sits
 * between segments. A small uppercase caption floats over the top-center
 * of the border via absolute positioning, so its visual "cut-through"
 * behaviour doesn't depend on browser `<fieldset>`/`<legend>` quirks.
 *
 * Designed to replace the previous pattern of a `<p>`-rubric above a
 * 2-column grid, which created visual asymmetry and too many nested gray
 * boxes.
 */
export default function ButtonFieldset({ label, labelBg = 'bg-white', segments }: Props) {
  return (
    <div className="relative mt-4">
      <span
        className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 ${labelBg} text-[10px] font-semibold tracking-wider text-gray-400 z-10 whitespace-nowrap`}
      >
        {label}
      </span>
      <div className="border border-gray-200 rounded-md flex divide-x divide-gray-200 focus-within:border-gray-400 transition-colors">
        {segments.map((seg, i) => (
          <label
            key={i}
            className="flex-1 min-w-0 px-3 pt-2 pb-2 cursor-text block"
          >
            <span className="block text-[10px] text-gray-400 mb-0.5">{seg.label}</span>
            <input
              type="text"
              value={seg.value}
              onChange={(e) => seg.onChange(e.target.value)}
              placeholder={seg.placeholder}
              className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-300 outline-none"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
