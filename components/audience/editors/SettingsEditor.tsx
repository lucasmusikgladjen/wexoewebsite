'use client';

import { AudienceState } from '@/lib/audience-types';
import { Field } from '@/components/shared/fields';
import type { SectionEditorProps } from '@/lib/page-types/types';

export default function SettingsEditor({ state, onChange }: SectionEditorProps<AudienceState>) {
  return (
    <Field.Checkbox
      label="Aktiv (publicerad)"
      checked={state.active}
      onChange={(v) => onChange({ ...state, active: v })}
    />
  );
}
