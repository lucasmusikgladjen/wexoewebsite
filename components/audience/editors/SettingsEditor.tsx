'use client';

import { AudienceState } from '@/lib/audience-types';
import { FieldCheckbox } from '@/components/editors/FieldInput';
import EditorSection from '@/components/editors/EditorSection';

interface Props {
  state: AudienceState;
  setField: <K extends keyof AudienceState>(key: K, value: AudienceState[K]) => void;
}

export default function SettingsEditor({ state, setField }: Props) {
  return (
    <EditorSection title="Inställningar">
      <FieldCheckbox
        label="Aktiv (publicerad)"
        checked={state.active}
        onChange={(v) => setField('active', v)}
      />
    </EditorSection>
  );
}
