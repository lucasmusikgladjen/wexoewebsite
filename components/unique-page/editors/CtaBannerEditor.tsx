'use client';

import { CtaBannerState } from '@/lib/unique-page-types';
import { Field } from '@/components/shared/fields';

interface Props {
  state: CtaBannerState;
  onChange: (s: CtaBannerState) => void;
}

export default function CtaBannerEditor({ state, onChange }: Props) {
  const set = <K extends keyof CtaBannerState>(k: K, v: CtaBannerState[K]) => onChange({ ...state, [k]: v });
  return (
    <>
      <Field.Text label="H2" value={state.h2} onChange={(v) => set('h2', v)} />
      <Field.Textarea label="Brödtext" rows={3} value={state.body} onChange={(v) => set('body', v)} />
      <Field.Text label="CTA-text" value={state.ctaText} onChange={(v) => set('ctaText', v)} />
      <Field.Text label="CTA-URL" value={state.ctaUrl} onChange={(v) => set('ctaUrl', v)} />
      <Field.Select<'dark' | 'light'>
        label="Tema"
        value={state.theme}
        onChange={(v) => set('theme', v)}
        options={[{ value: 'dark', label: 'Mörkt' }, { value: 'light', label: 'Ljust' }]}
      />
    </>
  );
}
