'use client';

import { TestimonialCardState } from '@/lib/unique-page-types';
import { Field } from '@/components/shared/fields';

interface Props {
  state: TestimonialCardState;
  onChange: (s: TestimonialCardState) => void;
}

export default function TestimonialCardEditor({ state, onChange }: Props) {
  const set = (v: TestimonialCardState) => onChange(v);
  return (
    <>
      <Field.Text
        label="Scope: Kundtyp (slug)"
        value={state.scope.customerType ?? ''}
        onChange={(customerType) => set({ ...state, scope: { ...state.scope, customerType } })}
      />
      <Field.Text
        label="Scope: Division (slug)"
        value={state.scope.division}
        onChange={(division) => set({ ...state, scope: { ...state.scope, division } })}
      />
      <Field.Text
        label="Scope: Land (ISO-kod)"
        value={state.scope.country}
        onChange={(country) => set({ ...state, scope: { ...state.scope, country } })}
      />
    </>
  );
}
