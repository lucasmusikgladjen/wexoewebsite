'use client';

import { ProductAreaState, LinkedSolution, emptyLinkedSolution } from '@/lib/product-area-types';
import { FieldInput, FieldTextarea, FieldCheckbox, FieldColor } from '@/components/editors/FieldInput';
import CollapsibleCard from './CollapsibleCard';

interface Props {
  state: ProductAreaState;
  setField: <K extends keyof ProductAreaState>(key: K, value: ProductAreaState[K]) => void;
}

/** A solution is "filled" once it has a name — used for default-collapse. */
function hasContent(s: LinkedSolution): boolean {
  return !!s.name.trim();
}

export default function SolutionsEditor({ state, setField }: Props) {
  const patchSolution = (index: number, patch: Partial<LinkedSolution>) => {
    setField(
      'solutions',
      state.solutions.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  };

  const moveSolution = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= state.solutions.length) return;
    const next = [...state.solutions];
    const [moved] = next.splice(index, 1);
    next.splice(newIndex, 0, moved);
    setField('solutions', next);
  };

  const removeSolution = (index: number) => {
    setField(
      'solutions',
      state.solutions.filter((_, i) => i !== index),
    );
  };

  const addSolution = () => {
    const next = emptyLinkedSolution();
    next.order = state.solutions.length + 1;
    next.name = '';
    setField('solutions', [...state.solutions, next]);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xl font-bold text-gray-900">Lösningar</h3>

      <FieldInput
        label="Rubrik"
        value={state.solutionsTitle}
        onChange={(v) => setField('solutionsTitle', v)}
        placeholder="Lösningar & koncept"
      />

      {state.solutions.length === 0 && (
        <p className="text-xs text-gray-300 italic">Inga lösningar ännu.</p>
      )}

      {state.solutions.map((sol, i) => (
        <CollapsibleCard
          key={sol.clientId}
          index={i}
          title={sol.name}
          onTitleChange={(v) => patchSolution(i, { name: v })}
          titlePlaceholder="Lösningens namn…"
          onMoveUp={() => moveSolution(i, -1)}
          onMoveDown={() => moveSolution(i, 1)}
          canMoveUp={i > 0}
          canMoveDown={i < state.solutions.length - 1}
          onRemove={() => removeSolution(i)}
          removeTitle="Ta bort lösning"
          defaultOpen={!hasContent(sol)}
        >
          <FieldInput
            label="Kategori"
            value={sol.category}
            onChange={(v) => patchSolution(i, { category: v })}
            placeholder="T.ex. Koncept"
          />

          <FieldTextarea
            label="Beskrivning"
            value={sol.description}
            onChange={(v) => patchSolution(i, { description: v })}
            rows={3}
            placeholder="Kort beskrivning av lösningen…"
          />

          <FieldInput
            label="Bild"
            value={sol.image}
            onChange={(v) => patchSolution(i, { image: v })}
            placeholder="https://..."
          />

          <div className="grid grid-cols-2 gap-2">
            <FieldInput
              label="Länk"
              value={sol.url}
              onChange={(v) => patchSolution(i, { url: v })}
              placeholder="/losningar/..."
            />
            <FieldInput
              label="Knapptext"
              value={sol.ctaText}
              onChange={(v) => patchSolution(i, { ctaText: v })}
              placeholder="Läs mer"
            />
          </div>

          <FieldCheckbox
            label="Visa"
            checked={sol.visa}
            onChange={(v) => patchSolution(i, { visa: v })}
          />
        </CollapsibleCard>
      ))}

      <button
        type="button"
        onClick={addSolution}
        className="w-full py-2 text-sm text-gray-300 hover:text-gray-500 transition-colors"
      >
        + Lägg till lösning
      </button>

      {/* ── Färger för lösningsgriden ─────────────────────────────────── */}
      <div className="pt-3">
        <p className="text-[11px] text-gray-400 mb-1.5">Färger</p>
        <div className="grid grid-cols-2 gap-2">
          <FieldColor
            label="Bakgrund"
            value={state.solutionsBg}
            onChange={(v) => setField('solutionsBg', v)}
            defaultColor="#FFFFFF"
          />
          <FieldColor
            label="Kortbakgrund"
            value={state.solutionsCardBg}
            onChange={(v) => setField('solutionsCardBg', v)}
            defaultColor="#FFFFFF"
          />
        </div>
      </div>
    </div>
  );
}
