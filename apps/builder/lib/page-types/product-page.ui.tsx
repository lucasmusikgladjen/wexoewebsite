/**
 * Product Page — UI-side sidtypsdefinition.
 *
 * 7 sektioner: Hero, Innehåll, Produkter, Lösningar, Visitkort,
 * Kontaktformulär, Inställningar. Innehåll/Produkter/Lösningar/Visitkort
 * är toggle-bara via showContent/showProducts/showSolutions/showContact
 * på staten (computed i fromRecord från innehåll, ej persisterade).
 */

import { ProductPageState } from '../product-page-types';
import HeroEditor from '@/components/product-page/editors/HeroEditor';
import ContentBlocksEditor from '@/components/product-page/editors/ContentBlocksEditor';
import ProductsEditor from '@/components/product-page/editors/ProductsEditor';
import SolutionsEditor from '@/components/product-page/editors/SolutionsEditor';
import ContactEditor from '@/components/product-page/editors/ContactEditor';
import SettingsEditor from '@/components/product-page/editors/SettingsEditor';
import ContactFormEditor from '@/components/contact-form/ContactFormEditor';
import ProductPagePreviewPanel from '@/components/product-page/preview/ProductPagePreviewPanel';
import type { PageTypeUIDef, SectionDef } from './types';

function showToggle<K extends keyof ProductPageState>(key: K) {
  return (state: ProductPageState, setState: (next: ProductPageState) => void) => ({
    value: Boolean(state[key]),
    onChange: (v: boolean) =>
      setState({ ...state, [key]: v as ProductPageState[K] }),
  });
}

const sections: SectionDef<ProductPageState>[] = [
  {
    id: 'hero',
    label: 'Hero',
    Editor: HeroEditor,
  },
  {
    id: 'content',
    label: 'Innehåll',
    Editor: ContentBlocksEditor,
    visibilityToggle: showToggle('showContent'),
  },
  {
    id: 'products',
    label: 'Produkter',
    Editor: ProductsEditor,
    visibilityToggle: showToggle('showProducts'),
  },
  {
    id: 'solutions',
    label: 'Lösningar',
    Editor: SolutionsEditor,
    visibilityToggle: showToggle('showSolutions'),
  },
  {
    id: 'contact',
    label: 'Visitkort',
    Editor: ContactEditor,
    visibilityToggle: showToggle('showContact'),
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
    visibilityToggle: showToggle('showContactForm'),
  },
  {
    id: 'settings',
    label: 'Inställningar',
    Editor: SettingsEditor,
  },
];

export const productPageUI: PageTypeUIDef<ProductPageState> & {
  canSave: (state: ProductPageState) => boolean;
  canSaveHint: string;
} = {
  id: 'product-page',
  label: 'Produktområde',
  sections,
  previewLayout: ({ state, activeSection, scrollTrigger, onSectionClick }) => (
    <ProductPagePreviewPanel
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
    badge: (_s, mode) => (mode === 'create' ? 'Ny produktsida' : 'Produktsida'),
  },
  canSave: (s) => !!s.slug.trim() && !!s.h1.trim(),
  canSaveHint: 'Slug + rubrik krävs',
};
