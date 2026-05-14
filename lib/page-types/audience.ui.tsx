/**
 * Audience — UI-side sidtypsdefinition.
 *
 * Bara React-komponenter, slug-input config och section-meta. Importeras
 * av client-kod (PageTypeBuilder) och av server-pages som re-renderar
 * client-komponenter med uiDef som prop.
 */

import { AudienceState } from '../audience-types';
import HeroEditor from '@/components/audience/editors/HeroEditor';
import ValueEditor from '@/components/audience/editors/ValueEditor';
import CaseEditor from '@/components/audience/editors/CaseEditor';
import SettingsEditor from '@/components/audience/editors/SettingsEditor';
import ContactFormEditor from '@/components/contact-form/ContactFormEditor';
import AudiencePreviewPanel from '@/components/audience/preview/AudiencePreviewPanel';
import type { PageTypeUIDef, SectionDef } from './types';

const sections: SectionDef<AudienceState>[] = [
  {
    id: 'hero',
    label: 'Hero',
    Editor: HeroEditor,
  },
  {
    id: 'value',
    label: 'Värdeproposition',
    Editor: ValueEditor,
    visibilityToggle: (state, setState) => ({
      value: state.showValue,
      onChange: (v) => setState({ ...state, showValue: v }),
    }),
  },
  {
    id: 'case',
    label: 'Kundcase',
    Editor: CaseEditor,
    visibilityToggle: (state, setState) => ({
      value: state.showCase,
      onChange: (v) => setState({ ...state, showCase: v }),
    }),
  },
  {
    id: 'contactForm',
    label: 'Kontaktformulär',
    Editor: ({ state, onChange }) => (
      <ContactFormEditor
        state={state.contactForm}
        onChange={(cf) => onChange({ ...state, contactForm: cf })}
      />
    ),
    visibilityToggle: (state, setState) => ({
      value: state.showContactForm,
      onChange: (v) => setState({ ...state, showContactForm: v }),
    }),
  },
  {
    id: 'settings',
    label: 'Inställningar',
    Editor: SettingsEditor,
  },
];

export const audienceUI: PageTypeUIDef<AudienceState> & {
  canSave: (state: AudienceState) => boolean;
  canSaveHint: string;
} = {
  id: 'audience',
  label: 'Kundtyp',
  sections,
  previewLayout: ({ state, activeSection, scrollTrigger, onSectionClick }) => (
    <AudiencePreviewPanel
      state={state}
      activeSection={activeSection}
      onSectionClick={onSectionClick}
      scrollTrigger={scrollTrigger}
    />
  ),
  slugInput: {
    accessor: (s) => s.slug,
    setter: (s, slug) => ({ ...s, slug }),
    placeholder: 'min-sida',
    badge: (_s, mode) => (mode === 'create' ? 'Ny audience-sida' : 'Audience-sida'),
  },
  canSave: (s) => !!s.slug.trim() && !!s.title.trim(),
  canSaveHint: 'Slug + titel krävs',
};
