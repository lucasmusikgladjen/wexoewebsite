'use client';

import { PartnersMarqueeState } from '@/lib/unique-page-types';
import { Field } from '@/components/shared/fields';

interface Props {
  state: PartnersMarqueeState;
  onChange: (s: PartnersMarqueeState) => void;
}

export default function PartnersMarqueeEditor({ state, onChange }: Props) {
  const set = (v: PartnersMarqueeState) => onChange(v);
  return (
    <>
      <Field.Text label="H2" placeholder="Våra partners" value={state.h2} onChange={(h2) => set({ ...state, h2 })} />
      <Field.Text
        label="Scope: Land (ISO-kod)"
        description="Tomt = använd sidans Country."
        value={state.scope.country}
        onChange={(country) => set({ ...state, scope: { ...state.scope, country } })}
      />
      <Field.Text
        label="Scope: Division (slug)"
        value={state.scope.division}
        onChange={(division) => set({ ...state, scope: { ...state.scope, division } })}
      />
    </>
  );
}
