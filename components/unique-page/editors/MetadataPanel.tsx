'use client';

import { UniquePageState } from '@/lib/unique-page-types';
import { Field } from '@/components/shared/fields';
import type { SectionEditorProps } from '@/lib/page-types/types';

export default function MetadataPanel({ state, onChange }: SectionEditorProps<UniquePageState>) {
  const set = <K extends keyof UniquePageState>(k: K, v: UniquePageState[K]) =>
    onChange({ ...state, [k]: v });

  return (
    <>
      <Field.Text label="H1 (huvudrubrik)" placeholder="Om oss" value={state.h1} onChange={(v) => set('h1', v)} />
      <Field.Text
        label="SEO Title"
        description="Visas i <title>-taggen. Tom = använd H1."
        value={state.seoTitle}
        onChange={(v) => set('seoTitle', v)}
      />
      <Field.Textarea
        label="SEO Description"
        description="150–160 tecken rekommenderas."
        rows={3}
        value={state.seoDescription}
        onChange={(v) => set('seoDescription', v)}
      />
      <Field.Text
        label="OG Image URL"
        description="1200×630 rekommenderas."
        placeholder="https://..."
        value={state.ogImageUrl}
        onChange={(v) => set('ogImageUrl', v)}
      />
      <Field.LinkedRecords
        label="Land"
        source="core_countries"
        value={state.countryIds}
        onChange={(ids) => set('countryIds', ids)}
      />
      <Field.LinkedRecords
        label="Division (valfri)"
        source="core_divisions"
        value={state.divisionIds}
        onChange={(ids) => set('divisionIds', ids)}
      />
    </>
  );
}
