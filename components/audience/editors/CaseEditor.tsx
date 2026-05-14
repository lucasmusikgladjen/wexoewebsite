'use client';

import { AudienceState } from '@/lib/audience-types';
import { Field } from '@/components/shared/fields';
import type { SectionEditorProps } from '@/lib/page-types/types';

export default function CaseEditor({ state, onChange }: SectionEditorProps<AudienceState>) {
  const set = <K extends keyof AudienceState>(key: K, value: AudienceState[K]) =>
    onChange({ ...state, [key]: value });

  return (
    <>
      <Field.Text
        label="Titel"
        value={state.caseTitle}
        onChange={(v) => set('caseTitle', v)}
        placeholder="Stor industrikund minskade nedtid med 40 %"
      />

      <Field.Textarea
        label="Beskrivning"
        value={state.caseDescription}
        onChange={(v) => set('caseDescription', v)}
        rows={4}
        placeholder="Kort sammanfattning av caset…"
      />

      <Field.Text
        label="Resultat"
        value={state.caseResult}
        onChange={(v) => set('caseResult', v)}
        placeholder="40 % minskad nedtid"
      />

      <Field.Buttons
        label="Länk"
        segments={[
          { value: state.caseLinkText, onChange: (v) => set('caseLinkText', v), placeholder: 'Text' },
          { value: state.caseLinkUrl, onChange: (v) => set('caseLinkUrl', v), placeholder: 'URL' },
        ]}
      />
    </>
  );
}
