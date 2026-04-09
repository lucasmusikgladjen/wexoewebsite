'use client';

import { ProductAreaState, LinkedSolution, emptyLinkedSolution } from '@/lib/product-area-types';
import { FieldInput, FieldTextarea, FieldCheckbox, FieldColor } from '@/components/editors/FieldInput';

interface Props {
  state: ProductAreaState;
  setField: <K extends keyof ProductAreaState>(key: K, value: ProductAreaState[K]) => void;
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
        <SolutionCard
          key={sol.clientId}
          solution={sol}
          index={i}
          total={state.solutions.length}
          onPatch={(patch) => patchSolution(i, patch)}
          onMoveUp={() => moveSolution(i, -1)}
          onMoveDown={() => moveSolution(i, 1)}
          onRemove={() => removeSolution(i)}
        />
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

function SolutionCard({
  solution,
  index,
  total,
  onPatch,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  solution: LinkedSolution;
  index: number;
  total: number;
  onPatch: (patch: Partial<LinkedSolution>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-gray-50/70 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-400 w-4 text-center">{index + 1}</span>
        <input
          value={solution.name}
          onChange={(e) => onPatch({ name: e.target.value })}
          className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder:text-gray-300"
          placeholder="Lösningens namn…"
        />
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="text-gray-300 hover:text-gray-500 disabled:opacity-30 text-[11px] px-0.5"
            title="Flytta upp"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="text-gray-300 hover:text-gray-500 disabled:opacity-30 text-[11px] px-0.5"
            title="Flytta ner"
          >
            ▼
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-gray-300 hover:text-red-400 text-[11px] px-0.5 ml-0.5"
            title="Ta bort"
          >
            ✕
          </button>
        </div>
      </div>

      <FieldInput
        label="Kategori"
        value={solution.category}
        onChange={(v) => onPatch({ category: v })}
        placeholder="T.ex. Koncept"
      />

      <FieldTextarea
        label="Beskrivning"
        value={solution.description}
        onChange={(v) => onPatch({ description: v })}
        rows={3}
        placeholder="Kort beskrivning av lösningen…"
      />

      <FieldInput
        label="Bild"
        value={solution.image}
        onChange={(v) => onPatch({ image: v })}
        placeholder="https://..."
      />

      <div className="grid grid-cols-2 gap-2">
        <FieldInput
          label="Länk"
          value={solution.url}
          onChange={(v) => onPatch({ url: v })}
          placeholder="/losningar/..."
        />
        <FieldInput
          label="Knapptext"
          value={solution.ctaText}
          onChange={(v) => onPatch({ ctaText: v })}
          placeholder="Läs mer"
        />
      </div>

      <FieldCheckbox
        label="Visa"
        checked={solution.visa}
        onChange={(v) => onPatch({ visa: v })}
      />
    </div>
  );
}
