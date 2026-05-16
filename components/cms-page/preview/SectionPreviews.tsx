'use client';

/**
 * Type-specifika preview-block. Visuellt enklare än PHP-pluginet — målet är
 * att redaktören ser vilken sektion som är vilken, inte pixel-perfekt CSS.
 */

import {
  CaseGridSection,
  CatalogSection,
  CompanyDataStripSection,
  ContactFormSection,
  CtaBannerSection,
  FaqSection,
  HeroSection,
  NewsGridSection,
  NewsTextSplitSection,
  PartnerListSection,
  TabsSection,
  TeamGridSection,
  TestimonialSection,
  TextImageSection,
  TextOnlySection,
} from '@/lib/cms-page-types';

function ButtonRow({ items }: { items: Array<{ text: string; url: string; primary: boolean }> }) {
  const visible = items.filter((b) => b.text || b.url);
  if (visible.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {visible.map((b, i) => (
        <span
          key={i}
          className={`px-3 py-1.5 rounded text-xs font-medium ${b.primary ? 'bg-orange-500 text-white' : 'border border-gray-300 text-current'}`}
        >
          {b.text || '(text saknas)'}
        </span>
      ))}
    </div>
  );
}

function ImagePlaceholder({ url, label, minH = 'min-h-32' }: { url: string; label?: string; minH?: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className={`w-full ${minH} object-cover rounded`} />
    );
  }
  return (
    <div className={`w-full ${minH} rounded bg-gradient-to-br from-blue-900/70 to-orange-500/70 grid place-items-center text-white text-[10px] uppercase tracking-wider`}>
      {label || 'Bild'}
    </div>
  );
}

export function HeroPreview({ section, pageH1 }: { section: HeroSection; pageH1: string }) {
  return (
    <div className="p-8">
      {section.eyebrow && <p className="text-[10px] uppercase tracking-wider opacity-70 mb-2">{section.eyebrow}</p>}
      <h1 className="text-3xl font-bold mb-3">{section.h1 || pageH1 || '(ingen rubrik)'}</h1>
      {section.subtitle && <p className="text-sm opacity-80 mb-3 whitespace-pre-line">{section.subtitle}</p>}
      <ButtonRow items={[
        { text: section.ctaText, url: section.ctaUrl, primary: true },
        { text: section.cta2Text, url: section.cta2Url, primary: false },
      ]} />
    </div>
  );
}

export function TextImagePreview({ section }: { section: TextImageSection }) {
  const bullets = section.bullets.split('\n').filter(Boolean);
  return (
    <div className="p-6 grid grid-cols-2 gap-6 items-center">
      <div className={section.reversed ? 'order-2' : 'order-1'}>
        {section.eyebrow && <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">{section.eyebrow}</p>}
        {section.h2 && <h2 className="text-xl font-bold mb-2">{section.h2}</h2>}
        {section.body && <p className="text-sm opacity-80 whitespace-pre-line mb-2">{section.body}</p>}
        {bullets.length > 0 && (
          <ul className="space-y-1 text-sm">
            {bullets.map((b, i) => (
              <li key={i} className="flex gap-2"><span className="text-green-600">✓</span>{b}</li>
            ))}
          </ul>
        )}
        <ButtonRow items={[
          { text: section.ctaText, url: section.ctaUrl, primary: true },
          { text: section.cta2Text, url: section.cta2Url, primary: false },
        ]} />
      </div>
      <div className={section.reversed ? 'order-1' : 'order-2'}>
        <ImagePlaceholder url={section.imageUrl} label="Bild" />
      </div>
    </div>
  );
}

export function TextOnlyPreview({ section }: { section: TextOnlySection }) {
  return (
    <div className={`p-8 max-w-xl mx-auto ${section.align === 'center' ? 'text-center' : ''}`}>
      {section.eyebrow && <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">{section.eyebrow}</p>}
      {section.h2 && <h2 className="text-xl font-bold mb-2">{section.h2}</h2>}
      <p className="text-sm opacity-80 whitespace-pre-line">{section.body}</p>
    </div>
  );
}

export function CompanyDataStripPreview({ section }: { section: CompanyDataStripSection }) {
  const items = section.items.split('\n').filter(Boolean).map((line) => {
    const [val, ...rest] = line.split('|');
    return { value: (val || '').trim(), label: rest.join('|').trim() };
  });
  return (
    <div className="p-6">
      {section.h2 && <h2 className="text-xl font-bold mb-3">{section.h2}</h2>}
      {section.useCompanySingleton && (
        <p className="text-[10px] text-gray-400 mb-2">Använder core_company-data ({section.countryCode || 'auto'})</p>
      )}
      <div className="grid grid-cols-4 gap-3">
        {items.length === 0
          ? <p className="text-xs text-gray-400 col-span-4">Inga datapunkter</p>
          : items.map((it, i) => (
              <div key={i} className="p-3 rounded bg-gray-50">
                <div className="text-xl font-bold text-orange-500">{it.value || '–'}</div>
                <div className="text-xs opacity-70">{it.label}</div>
              </div>
            ))}
      </div>
    </div>
  );
}

export function NewsTextSplitPreview({ section }: { section: NewsTextSplitSection }) {
  return (
    <div className="p-6 grid grid-cols-2 gap-6">
      <div>
        {section.eyebrow && <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">{section.eyebrow}</p>}
        {section.h2 && <h2 className="text-xl font-bold mb-2">{section.h2}</h2>}
        {section.body && <p className="text-sm opacity-80 whitespace-pre-line">{section.body}</p>}
        <ButtonRow items={[{ text: section.ctaText, url: section.ctaUrl, primary: true }]} />
      </div>
      <div>
        <p className="text-[10px] text-gray-400 mb-2">
          {section.newsManualIds.length} manuella + scope (land={section.scopeCountry || 'sidans'}, div={section.scopeDivision || 'sidans'}, max={section.limit || '∞'})
        </p>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded bg-gray-50 text-xs">
              <p className="font-medium">Artikel #{i}</p>
              <p className="opacity-60">Auto-laddad ingress…</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GridCards({ count, columns }: { count: number; columns: '2' | '3' | '4' }) {
  const colsClass = columns === '2' ? 'grid-cols-2' : columns === '4' ? 'grid-cols-4' : 'grid-cols-3';
  return (
    <div className={`grid ${colsClass} gap-3`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded bg-gray-50">
          <div className="h-20 rounded-t bg-gradient-to-br from-blue-900/40 to-orange-500/40" />
          <div className="p-2 text-xs">
            <p className="font-medium">Kort #{i + 1}</p>
            <p className="opacity-60">Beskrivning…</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CaseGridPreview({ section }: { section: CaseGridSection }) {
  return (
    <div className="p-6">
      {section.eyebrow && <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">{section.eyebrow}</p>}
      {section.h2 && <h2 className="text-xl font-bold mb-2">{section.h2}</h2>}
      {section.body && <p className="text-sm opacity-80 whitespace-pre-line mb-3">{section.body}</p>}
      <p className="text-[10px] text-gray-400 mb-2">
        {section.caseManualIds.length} manuella + scope (land={section.scopeCountry || 'sidans'}, div={section.scopeDivision || 'sidans'}, kundtyp={section.scopeCustomerType || '–'}, max={section.limit || '∞'})
      </p>
      <GridCards count={Number(section.columns)} columns={section.columns} />
    </div>
  );
}

export function NewsGridPreview({ section }: { section: NewsGridSection }) {
  return (
    <div className="p-6">
      {section.eyebrow && <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">{section.eyebrow}</p>}
      {section.h2 && <h2 className="text-xl font-bold mb-2">{section.h2}</h2>}
      <p className="text-[10px] text-gray-400 mb-2">
        {section.articleManualIds.length} manuella + scope (topic={section.scopeTopic || '–'}, max={section.limit || '∞'})
      </p>
      <GridCards count={Number(section.columns)} columns={section.columns} />
    </div>
  );
}

export function CatalogPreview({ section }: { section: CatalogSection }) {
  return (
    <div className="p-6">
      {section.eyebrow && <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">{section.eyebrow}</p>}
      {section.h2 && <h2 className="text-xl font-bold mb-2">{section.h2}</h2>}
      {section.introBody && <p className="text-sm opacity-80 whitespace-pre-line mb-3">{section.introBody}</p>}
      <p className="text-[10px] text-gray-400 mb-2">
        Källor: {[section.includeProducts && 'produkter', section.includeArticles && 'artiklar'].filter(Boolean).join(', ') || '(ingen vald)'}.
        Facets: {section.facetFields.split('\n').filter(Boolean).join(', ') || 'inga'}.
      </p>
      <div className="p-3 rounded bg-gray-50 text-xs text-center">
        Katalog-sök + grid renderas i frontend-pluginet
      </div>
    </div>
  );
}

export function TabsPreview({ section }: { section: TabsSection }) {
  return (
    <div className="p-6">
      {section.eyebrow && <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">{section.eyebrow}</p>}
      {section.h2 && <h2 className="text-xl font-bold mb-2">{section.h2}</h2>}
      {section.introBody && <p className="text-sm opacity-80 whitespace-pre-line mb-3">{section.introBody}</p>}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-2 mb-3">
        {section.tabs.length === 0
          ? <p className="text-xs text-gray-400 italic">Inga flikar</p>
          : section.tabs.map((t, i) => (
              <span key={t.clientId} className={`px-3 py-1 rounded-full text-xs font-medium ${i === 0 ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-700'}`}>
                {t.name || `Flik ${i + 1}`}
              </span>
            ))}
      </div>
      {section.tabs[0] && (
        <div className="grid grid-cols-2 gap-4 items-center">
          <div>
            {section.tabs[0].h2 && <h3 className="text-lg font-semibold mb-2">{section.tabs[0].h2}</h3>}
            <p className="text-sm opacity-80 whitespace-pre-line">{section.tabs[0].body}</p>
          </div>
          <ImagePlaceholder url={section.tabs[0].imageUrl} label="Flik-bild" />
        </div>
      )}
    </div>
  );
}

export function TeamGridPreview({ section }: { section: TeamGridSection }) {
  return (
    <div className="p-6">
      {section.eyebrow && <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">{section.eyebrow}</p>}
      {section.h2 && <h2 className="text-xl font-bold mb-2">{section.h2}</h2>}
      {section.body && <p className="text-sm opacity-80 whitespace-pre-line mb-3">{section.body}</p>}
      <p className="text-[10px] text-gray-400 mb-2">
        Variant: {section.variant} · {section.coworkerManualIds.length} manuella · scope (land={section.scopeCountry || 'sidans'}, div={section.scopeDivision || 'sidans'}, max={section.limit || '∞'})
      </p>
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="text-center">
            <div className="h-20 rounded bg-gradient-to-br from-blue-900/40 to-orange-500/40 mb-1" />
            <p className="text-xs font-medium">Medarbetare {i}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PartnerListPreview({ section }: { section: PartnerListSection }) {
  return (
    <div className="p-6">
      {section.eyebrow && <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">{section.eyebrow}</p>}
      {section.h2 && <h2 className="text-xl font-bold mb-2">{section.h2}</h2>}
      {section.body && <p className="text-sm opacity-80 whitespace-pre-line mb-3">{section.body}</p>}
      <p className="text-[10px] text-gray-400 mb-2">
        Variant: {section.variant} · {section.partnerManualIds.length} manuella · scope (land={section.scopeCountry || 'sidans'}, div={section.scopeDivision || 'sidans'}, max={section.limit || '∞'})
      </p>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="aspect-square rounded bg-gray-50 grid place-items-center text-xs text-gray-400">
            Logo
          </div>
        ))}
      </div>
    </div>
  );
}

export function FaqPreview({ section }: { section: FaqSection }) {
  const items: { q: string; a: string }[] = [];
  let pending: { q?: string; a?: string } = {};
  for (const line of section.items.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('Q:')) {
      if (pending.q !== undefined || pending.a !== undefined) {
        items.push({ q: pending.q ?? '', a: pending.a ?? '' });
        pending = {};
      }
      pending.q = trimmed.slice(2).trim();
    } else if (trimmed.startsWith('A:')) {
      pending.a = trimmed.slice(2).trim();
    }
  }
  if (pending.q !== undefined || pending.a !== undefined) {
    items.push({ q: pending.q ?? '', a: pending.a ?? '' });
  }

  return (
    <div className="p-6">
      {section.eyebrow && <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">{section.eyebrow}</p>}
      {section.h2 && <h2 className="text-xl font-bold mb-2">{section.h2}</h2>}
      {section.body && <p className="text-sm opacity-80 whitespace-pre-line mb-3">{section.body}</p>}
      <ul className="space-y-2">
        {items.length === 0
          ? <li className="text-xs text-gray-400 italic">Inga frågor</li>
          : items.map((it, i) => (
              <li key={i} className="p-3 rounded border border-gray-200">
                <p className="text-sm font-semibold">{it.q || '(fråga saknas)'}</p>
                <p className="text-sm opacity-80 mt-1">{it.a || '(svar saknas)'}</p>
              </li>
            ))}
      </ul>
    </div>
  );
}

export function TestimonialPreview({ section }: { section: TestimonialSection }) {
  return (
    <div className="p-8 text-center">
      {section.eyebrow && <p className="text-[10px] uppercase tracking-wider opacity-70 mb-2">{section.eyebrow}</p>}
      <blockquote className="text-lg font-bold italic mb-3 whitespace-pre-line">
        &ldquo;{section.quote || '(citat saknas)'}&rdquo;
      </blockquote>
      <div className="flex items-center justify-center gap-2">
        {section.authorImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={section.authorImageUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-900 to-orange-500" />
        )}
        <div className="text-left">
          <p className="text-sm font-semibold">{section.authorName || '(namn)'}</p>
          <p className="text-xs opacity-70">{section.authorTitle}</p>
        </div>
      </div>
      {(section.testimonialManualIds.length > 0 || section.featuredOnly || section.scopeCustomerType) && (
        <p className="text-[10px] text-gray-400 mt-3">
          SSOT-fallback: {section.testimonialManualIds.length} manuella · {section.featuredOnly ? 'endast featured' : 'alla'} · kundtyp={section.scopeCustomerType || '–'}
        </p>
      )}
    </div>
  );
}

export function CtaBannerPreview({ section }: { section: CtaBannerSection }) {
  return (
    <div className="p-6">
      <div className="rounded-2xl p-8 bg-gradient-to-br from-blue-900 to-blue-800 text-white grid grid-cols-2 gap-6 items-center">
        <div>
          {section.eyebrow && <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">{section.eyebrow}</p>}
          {section.h2 && <h2 className="text-xl font-bold mb-2">{section.h2}</h2>}
          {section.body && <p className="text-sm opacity-80 whitespace-pre-line">{section.body}</p>}
          <ButtonRow items={[
            { text: section.ctaText, url: section.ctaUrl, primary: true },
            { text: section.cta2Text, url: section.cta2Url, primary: false },
          ]} />
        </div>
        <ImagePlaceholder url={section.imageUrl} label="CTA-bild" minH="min-h-32" />
      </div>
    </div>
  );
}

export function ContactFormPreview({ section }: { section: ContactFormSection }) {
  const split = section.cfLayout === 'split';
  return (
    <div className="p-6">
      <div className={`p-6 rounded-xl bg-white border border-gray-200 ${split ? 'grid grid-cols-2 gap-6' : ''}`}>
        <div>
          {section.eyebrow && <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">{section.eyebrow}</p>}
          {section.title && <h2 className="text-xl font-bold mb-2">{section.title}</h2>}
          {section.subtitle && <p className="text-sm opacity-80 whitespace-pre-line">{section.subtitle}</p>}
          {section.showContactPerson && (
            <div className="mt-4 p-3 rounded bg-gray-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-900 to-orange-500" />
              <div>
                <p className="text-sm font-semibold">Kontaktperson</p>
                <p className="text-xs opacity-70">Hämtas från SSOT</p>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded bg-gray-50 text-xs text-gray-400">Namn</div>
            <div className="p-2 rounded bg-gray-50 text-xs text-gray-400">E-post</div>
            {section.showCompany && <div className="p-2 rounded bg-gray-50 text-xs text-gray-400">Företag</div>}
            {section.showPhone && <div className="p-2 rounded bg-gray-50 text-xs text-gray-400">Telefon</div>}
          </div>
          {section.showDropdown && (
            <div className="p-2 rounded bg-gray-50 text-xs text-gray-400">
              {section.dropdownLabel || 'Ärende'}
            </div>
          )}
          <div className="p-2 rounded bg-gray-50 text-xs text-gray-400 min-h-[60px]">
            {section.messageLabel || 'Meddelande'}
          </div>
          {section.trustSignals && (
            <p className="text-[10px] text-gray-400">
              {section.trustSignals.split('\n').filter(Boolean).join(' · ')}
            </p>
          )}
          <div className="text-xs text-white bg-orange-500 px-3 py-1.5 rounded inline-block">
            {section.ctaText || 'Skicka'}
          </div>
        </div>
      </div>
    </div>
  );
}
