'use client';

import { ProductAreaState } from '@/lib/product-area-types';
import { FieldInput, FieldTextarea, FieldColor } from '@/components/editors/FieldInput';

interface Props {
  state: ProductAreaState;
  setField: <K extends keyof ProductAreaState>(key: K, value: ProductAreaState[K]) => void;
}

export default function HeroEditor({ state, setField }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="text-xl font-bold text-gray-900">Hero</h3>

      <FieldInput
        label="Rubrik"
        value={state.h1}
        onChange={(v) => setField('h1', v)}
        placeholder="T.ex. Rockwell Automation PLC"
      />

      <FieldInput
        label="Underrubrik"
        value={state.heroH2}
        onChange={(v) => setField('heroH2', v)}
        placeholder="Allen-Bradley PLC för små och stora applikationer"
      />

      <FieldTextarea
        label="Brödtext"
        value={state.heroText}
        onChange={(v) => setField('heroText', v)}
        rows={4}
        placeholder="Kort beskrivning av vad sidan handlar om…"
      />

      <FieldTextarea
        label="Benefits"
        value={state.heroBenefits}
        onChange={(v) => setField('heroBenefits', v)}
        rows={3}
        hint="en per rad"
        placeholder={'Från fristående styrning till fabriksövergripande\nFör både process- och diskret tillverkning\nIntegrerad arkitektur'}
      />

      <FieldInput
        label="Bakgrundsbild"
        value={state.heroImage}
        onChange={(v) => setField('heroImage', v)}
        placeholder="https://wexoe.se/wp-content/uploads/..."
      />

      <div className="pt-1">
        <p className="text-[11px] text-gray-400 mb-1.5">Primär knapp</p>
        <div className="grid grid-cols-2 gap-2">
          <FieldInput
            label="Text"
            value={state.heroCtaText}
            onChange={(v) => setField('heroCtaText', v)}
            placeholder="Kontakta oss"
          />
          <FieldInput
            label="URL"
            value={state.heroCtaUrl}
            onChange={(v) => setField('heroCtaUrl', v)}
            placeholder="/kontakt/"
          />
        </div>
      </div>

      {/* ── NPI-kort (höger kolumn) ─────────────────────────────────────── */}
      <div className="pt-3">
        <p className="text-[11px] text-gray-400 mb-1.5">
          NPI-kort <span className="text-gray-300">— visas i hero-högerkolumnen om titel är ifylld</span>
        </p>
        <div className="space-y-2">
          <FieldInput
            label="Titel"
            value={state.npiTitle}
            onChange={(v) => setField('npiTitle', v)}
            placeholder="T.ex. ControlLogix 5590"
          />
          <FieldTextarea
            label="Beskrivning"
            value={state.npiDescription}
            onChange={(v) => setField('npiDescription', v)}
            rows={2}
            placeholder="Ny generation med dubbla scantiden…"
          />
          <FieldInput
            label="Bild"
            value={state.npiImage}
            onChange={(v) => setField('npiImage', v)}
            placeholder="https://..."
          />
          <FieldInput
            label="Länk"
            value={state.npiLink}
            onChange={(v) => setField('npiLink', v)}
            placeholder="/produkter/controllogix/"
          />
        </div>
      </div>

      {/* ── Färger ──────────────────────────────────────────────────────── */}
      <div className="pt-3">
        <p className="text-[11px] text-gray-400 mb-1.5">Färger</p>
        <div className="space-y-2">
          <FieldColor
            label="Topbanner"
            value={state.topBg}
            onChange={(v) => setField('topBg', v)}
            defaultColor="#11325D"
          />
          <div className="grid grid-cols-2 gap-2">
            <FieldColor
              label="Bakgrund"
              value={state.heroBg}
              onChange={(v) => setField('heroBg', v)}
              defaultColor="#FFFFFF"
            />
            <FieldColor
              label="Accent"
              value={state.heroAccent}
              onChange={(v) => setField('heroAccent', v)}
              defaultColor="#F28C28"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
