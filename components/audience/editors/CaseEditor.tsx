'use client';

import { AudienceState } from '@/lib/audience-types';
import { FieldInput, FieldTextarea } from '@/components/editors/FieldInput';
import ButtonFieldset from '@/components/editors/ButtonFieldset';
import EditorSection from '@/components/editors/EditorSection';

interface Props {
  state: AudienceState;
  setField: <K extends keyof AudienceState>(key: K, value: AudienceState[K]) => void;
  visible: boolean;
  onToggleVisible: (v: boolean) => void;
}

export default function CaseEditor({ state, setField, visible, onToggleVisible }: Props) {
  return (
    <EditorSection title="Kundcase-kort" visible={visible} onToggleVisible={onToggleVisible}>
      <FieldInput
        label="Titel"
        value={state.caseTitle}
        onChange={(v) => setField('caseTitle', v)}
        placeholder="Stor industrikund minskade nedtid med 40 %"
      />

      <FieldTextarea
        label="Beskrivning"
        value={state.caseDescription}
        onChange={(v) => setField('caseDescription', v)}
        rows={4}
        placeholder="Kort sammanfattning av caset…"
      />

      <FieldInput
        label="Resultat"
        value={state.caseResult}
        onChange={(v) => setField('caseResult', v)}
        placeholder="40 % minskad nedtid"
      />

      <ButtonFieldset
        label="Länk"
        segments={[
          {
            value: state.caseLinkText,
            onChange: (v) => setField('caseLinkText', v),
            placeholder: 'Text',
          },
          {
            value: state.caseLinkUrl,
            onChange: (v) => setField('caseLinkUrl', v),
            placeholder: 'URL',
          },
        ]}
      />
    </EditorSection>
  );
}
