'use client';

import { ProductAreaState, LinkedProduct, emptyLinkedProduct } from '@/lib/product-area-types';
import { FieldInput, FieldTextarea, FieldCheckbox, FieldColor } from '@/components/editors/FieldInput';

interface Props {
  state: ProductAreaState;
  setField: <K extends keyof ProductAreaState>(key: K, value: ProductAreaState[K]) => void;
}

export default function ProductsEditor({ state, setField }: Props) {
  const patchProduct = (index: number, patch: Partial<LinkedProduct>) => {
    setField(
      'products',
      state.products.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    );
  };

  const moveProduct = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= state.products.length) return;
    const next = [...state.products];
    const [moved] = next.splice(index, 1);
    next.splice(newIndex, 0, moved);
    setField('products', next);
  };

  const removeProduct = (index: number) => {
    setField(
      'products',
      state.products.filter((_, i) => i !== index),
    );
  };

  const addProduct = () => {
    const next = emptyLinkedProduct();
    next.order = state.products.length + 1;
    next.name = '';
    setField('products', [...state.products, next]);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xl font-bold text-gray-900">Produkter</h3>

      {state.products.length === 0 && (
        <p className="text-xs text-gray-300 italic">Inga produkter ännu.</p>
      )}

      {state.products.map((product, i) => (
        <ProductCard
          key={product.clientId}
          product={product}
          index={i}
          total={state.products.length}
          onPatch={(patch) => patchProduct(i, patch)}
          onMoveUp={() => moveProduct(i, -1)}
          onMoveDown={() => moveProduct(i, 1)}
          onRemove={() => removeProduct(i)}
        />
      ))}

      <button
        type="button"
        onClick={addProduct}
        className="w-full py-2 text-sm text-gray-300 hover:text-gray-500 transition-colors"
      >
        + Lägg till produkt
      </button>

      {/* ── Färger för produkt-sektionen ─────────────────────────────── */}
      <div className="pt-3">
        <p className="text-[11px] text-gray-400 mb-1.5">Färger</p>
        <div className="space-y-2">
          <FieldColor
            label="Bakgrund"
            value={state.toggleBg}
            onChange={(v) => setField('toggleBg', v)}
            defaultColor="#11325D"
          />
          <div className="grid grid-cols-2 gap-2">
            <FieldColor
              label="Kortbakgrund"
              value={state.toggleHeaderBg}
              onChange={(v) => setField('toggleHeaderBg', v)}
              defaultColor="#FFFFFF"
            />
            <FieldColor
              label="Accent"
              value={state.toggleAccent}
              onChange={(v) => setField('toggleAccent', v)}
              defaultColor="#F28C28"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  index,
  total,
  onPatch,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  product: LinkedProduct;
  index: number;
  total: number;
  onPatch: (patch: Partial<LinkedProduct>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-gray-50/70 rounded-lg p-3 space-y-3">
      {/* Card header: index + inline name + reorder + remove */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-400 w-4 text-center">{index + 1}</span>
        <input
          value={product.name}
          onChange={(e) => onPatch({ name: e.target.value })}
          className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder:text-gray-300"
          placeholder="Produktnamn…"
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
        label="Underrubrik"
        value={product.ecosystemDescription}
        onChange={(v) => onPatch({ ecosystemDescription: v })}
        placeholder="T.ex. Integrerad arkitektur"
      />

      <FieldTextarea
        label="Beskrivning"
        value={product.description}
        onChange={(v) => onPatch({ description: v })}
        rows={4}
        placeholder="Kort beskrivning av produkten…"
      />

      <FieldTextarea
        label="Punkter"
        value={product.bullets}
        onChange={(v) => onPatch({ bullets: v })}
        rows={3}
        hint="en per rad"
        placeholder={'Hög tillgänglighet\nKonsoliderad plattform'}
      />

      <FieldInput
        label="Bild"
        value={product.image}
        onChange={(v) => onPatch({ image: v })}
        placeholder="https://..."
      />

      <div>
        <p className="text-[11px] text-gray-400 mb-1.5">Primär knapp</p>
        <div className="grid grid-cols-2 gap-2">
          <FieldInput
            label="Text"
            value={product.button2Text}
            onChange={(v) => onPatch({ button2Text: v })}
            placeholder="Kontakta oss"
          />
          <FieldInput
            label="URL"
            value={product.button2Url}
            onChange={(v) => onPatch({ button2Url: v })}
            placeholder="/kontakt/"
          />
        </div>
      </div>

      <div>
        <p className="text-[11px] text-gray-400 mb-1.5">Sekundär knapp</p>
        <div className="grid grid-cols-2 gap-2">
          <FieldInput
            label="Text"
            value={product.button1Text}
            onChange={(v) => onPatch({ button1Text: v })}
            placeholder="Läs mer"
          />
          <FieldInput
            label="URL"
            value={product.button1Url}
            onChange={(v) => onPatch({ button1Url: v })}
            placeholder="/produkt/..."
          />
        </div>
      </div>

      <FieldInput
        label="Rubrik i sidomeny"
        value={product.headerSideMenu}
        onChange={(v) => onPatch({ headerSideMenu: v })}
        placeholder="Lämna tom för att använda produktnamnet"
      />

      <div className="flex items-center gap-5 pt-0.5">
        <FieldCheckbox
          label="Visa"
          checked={product.visa}
          onChange={(v) => onPatch({ visa: v })}
        />
        <FieldCheckbox
          label="Horisontell layout"
          checked={product.horizontal}
          onChange={(v) => onPatch({ horizontal: v })}
        />
      </div>

      {/* Read-only linked articles */}
      {product.articles.length > 0 && (
        <div className="pt-2 mt-1 border-t border-gray-200/60">
          <p className="text-[11px] text-gray-400 mb-1.5">
            Artiklar <span className="text-gray-300">— läsläge</span>
          </p>
          <div className="space-y-1">
            {product.articles.map((a) => (
              <div key={a.recordId} className="flex items-baseline justify-between gap-3 text-xs">
                <span className="text-gray-600 truncate">{a.name || '(namnlös)'}</span>
                <span className="font-mono text-gray-300 whitespace-nowrap">{a.artikelnummer || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
