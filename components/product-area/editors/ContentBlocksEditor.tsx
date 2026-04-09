'use client';

import { useState } from 'react';
import { ProductAreaState, NormalSection } from '@/lib/product-area-types';
import { FieldTextarea, FieldInput, FieldCheckbox, FieldColor } from '@/components/editors/FieldInput';

interface Props {
  state: ProductAreaState;
  setNormal: (n: 1 | 2 | 3 | 4, patch: Partial<NormalSection>) => void;
}

/** True when a block has *any* content filled in — used to decide whether to
 *  auto-reveal it on mount. */
function hasContent(n: NormalSection): boolean {
  return !!(n.h2.trim() || n.text.trim() || n.bullets.trim() || n.image.trim());
}

export default function ContentBlocksEditor({ state, setNormal }: Props) {
  const sections = [state.normal1, state.normal2, state.normal3, state.normal4];

  // Auto-reveal enough slots on mount to cover all filled blocks — even if
  // some middle blocks are empty (mirrors how the PHP plugin skips empty
  // Normal sections individually). After mount, visibility is user-driven.
  const [visibleCount, setVisibleCount] = useState(() => {
    const highestFilled = sections.reduce(
      (max, s, i) => (hasContent(s) ? i : max),
      -1,
    );
    return Math.max(1, highestFilled + 1);
  });

  const addBlock = () => setVisibleCount((v) => Math.min(4, v + 1));

  const clearBlock = (index: number) => {
    const n = (index + 1) as 1 | 2 | 3 | 4;
    setNormal(n, {
      h2: '',
      text: '',
      bullets: '',
      image: '',
      reversed: false,
      bg: '',
      upp: false,
    });
    // If the cleared block was the last visible one, collapse the slot away
    // so the user can undo an accidental "+ Lägg till" with one click.
    if (index === visibleCount - 1 && visibleCount > 1) {
      setVisibleCount((v) => v - 1);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xl font-bold text-gray-900">Innehåll</h3>

      {Array.from({ length: visibleCount }).map((_, i) => {
        const n = (i + 1) as 1 | 2 | 3 | 4;
        const section = sections[i];
        return (
          <BlockCard
            key={n}
            index={i}
            section={section}
            onPatch={(patch) => setNormal(n, patch)}
            onClear={() => clearBlock(i)}
          />
        );
      })}

      {visibleCount < 4 && (
        <button
          type="button"
          onClick={addBlock}
          className="w-full py-2 text-sm text-gray-300 hover:text-gray-500 transition-colors"
        >
          + Lägg till textblock
        </button>
      )}
    </div>
  );
}

function BlockCard({
  index,
  section,
  onPatch,
  onClear,
}: {
  index: number;
  section: NormalSection;
  onPatch: (patch: Partial<NormalSection>) => void;
  onClear: () => void;
}) {
  return (
    <div className="bg-gray-50/70 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-400 w-4 text-center">{index + 1}</span>
        <input
          value={section.h2}
          onChange={(e) => onPatch({ h2: e.target.value })}
          className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder:text-gray-300"
          placeholder="Rubrik på textblocket…"
        />
        <button
          type="button"
          onClick={onClear}
          className="text-gray-300 hover:text-red-400 text-[11px] px-0.5"
          title="Rensa block"
        >
          ✕
        </button>
      </div>

      <FieldTextarea
        label="Brödtext"
        value={section.text}
        onChange={(v) => onPatch({ text: v })}
        rows={3}
        placeholder="Beskrivande text för blocket…"
      />

      <FieldTextarea
        label="Punkter"
        value={section.bullets}
        onChange={(v) => onPatch({ bullets: v })}
        rows={3}
        hint="en per rad"
        placeholder={'Första punkten\nAndra punkten'}
      />

      <FieldInput
        label="Bild"
        value={section.image}
        onChange={(v) => onPatch({ image: v })}
        placeholder="https://..."
      />

      <div className="flex items-center gap-5 pt-0.5">
        <FieldCheckbox
          label="Bild till vänster"
          checked={section.reversed}
          onChange={(v) => onPatch({ reversed: v })}
        />
        <FieldCheckbox
          label="Före produkter"
          checked={section.upp}
          onChange={(v) => onPatch({ upp: v })}
        />
      </div>

      <FieldColor
        label="Bakgrund"
        value={section.bg}
        onChange={(v) => onPatch({ bg: v })}
        defaultColor={index % 2 === 1 ? '#F8F9FA' : '#FFFFFF'}
      />
    </div>
  );
}
