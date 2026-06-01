'use client';

import { ContactFormState } from '@/lib/contact-form-types';

interface Props { state: ContactFormState; }

const NAVY = '#11325D';
const ACCENT = '#F28C28';

/**
 * Visuell skiss av kontaktformuläret. Speglar PHP-renderaren (Renderers/
 * ContactForm.php): navy sektion med subtila former, vitt formulärkort med
 * skugga, orange trust-cirklar + CTA-gradient. Inte pixelidentisk — målet är
 * att redaktören ska känna igen layout/tema och vilka fält som visas.
 *
 * Centrerad layout = minimal variant: ENBART titeln (+ ev. eyebrow) ovanför
 * kortet. Subtitel, trust-signaler och kontaktperson visas bara i split.
 */
export default function ContactFormPreview({ state }: Props) {
  const dark = state.theme === 'dark';
  const isSplit = state.layout === 'split';

  const title = state.title || 'Prata med någon som kan automation';
  const trust = state.trustSignals.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 3);

  return (
    <div
      className="relative overflow-hidden p-8"
      style={{ background: dark ? NAVY : '#FFFFFF', color: dark ? '#fff' : NAVY }}
    >
      {dark && (
        <>
          <span className="pointer-events-none absolute rotate-45" style={{ width: 160, height: 160, top: '14%', left: '3%', background: 'rgba(255,255,255,0.03)' }} />
          <span className="pointer-events-none absolute rotate-45" style={{ width: 200, height: 200, top: -60, right: '10%', background: 'rgba(0,0,0,0.12)' }} />
          <span className="pointer-events-none absolute rotate-45" style={{ width: 90, height: 90, top: '55%', right: '8%', background: 'rgba(242,140,40,0.06)' }} />
        </>
      )}

      <div className={`relative ${isSplit ? 'grid grid-cols-[1fr_1.2fr] gap-8 items-start max-w-3xl' : 'max-w-sm text-center'} mx-auto`}>
        {/* Info / Head */}
        <div className={isSplit ? 'pt-3' : 'mb-4'}>
          {state.eyebrow && (
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: ACCENT }}>{state.eyebrow}</p>
          )}
          <h2 className="text-xl font-bold leading-tight mb-3">{title}</h2>

          {isSplit && state.subtitle && (
            <p className={`text-sm leading-relaxed mb-5 whitespace-pre-line ${dark ? 'text-white/80' : 'text-gray-600'}`}>{state.subtitle}</p>
          )}

          {isSplit && trust.length > 0 && (
            <ul className="space-y-3 mb-5">
              {trust.map((line, i) => {
                const m = line.match(/^\*\*(.+?)\*\*\s*\|?\s*(.*)$/);
                return (
                  <li key={i} className="flex items-start gap-3 text-left">
                    <span
                      className="flex-shrink-0 mt-0.5 flex items-center justify-center rounded-full text-white"
                      style={{ width: 22, height: 22, background: ACCENT }}
                    >
                      <CheckIcon size={12} />
                    </span>
                    <span className={`text-[13px] leading-snug ${dark ? 'text-white/85' : 'text-gray-700'}`}>
                      {m ? (<><strong className={dark ? 'text-white' : 'text-[#11325D]'}>{m[1]}</strong> {m[2]}</>) : line}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {isSplit && state.showContactPerson && (
            <div className="mt-2 flex items-center gap-3 text-left">
              <div className="w-11 h-11 rounded-full" style={{ background: dark ? 'rgba(255,255,255,0.12)' : '#e5e7eb' }} />
              <div className={`text-xs ${dark ? 'text-white/85' : 'text-gray-700'}`}>
                <div className="font-semibold text-[13px]">Kontaktperson</div>
                <div className="opacity-70 text-[10px]">visas från SSOT vid render</div>
              </div>
            </div>
          )}
        </div>

        {/* Form card */}
        <div className="mx-auto w-full rounded-xl border border-gray-200 bg-white p-5 text-left shadow-[0_4px_24px_rgba(0,0,0,0.10)]">
          <div className={`grid ${state.showCompany ? 'grid-cols-2' : 'grid-cols-1'} gap-3 mb-3`}>
            <Field label="Namn" required />
            {state.showCompany && <Field label="Företag" required />}
          </div>
          <div className={`grid ${state.showPhone ? 'grid-cols-2' : 'grid-cols-1'} gap-3 mb-3`}>
            <Field label="E-post" required />
            {state.showPhone && <Field label="Telefon" />}
          </div>
          {state.showDropdown && <Field label={state.dropdownLabel || 'Vad kan vi hjälpa dig med?'} select />}
          <Field label={state.messageLabel || 'Berätta mer (valfritt)'} multiline />

          <div className="mt-3 mb-3 flex items-start gap-2 rounded-lg bg-gray-50 p-3">
            <div className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-[3px] border-2 border-gray-300 bg-white" />
            <div className="text-[10px] leading-snug text-gray-500">Ja, jag vill ta emot nyheter, tips och erbjudanden från Wexoe via e-post.</div>
          </div>

          <button
            className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(242,140,40,0.3)]"
            style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #e07b1a 100%)` }}
          >
            {state.ctaText || 'Skicka'}
            <ArrowIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, multiline, select }: { label: string; required?: boolean; multiline?: boolean; select?: boolean }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-[11px] font-semibold text-gray-700">
        {label}{required && <span style={{ color: ACCENT }}> *</span>}
      </div>
      <div className={`relative w-full rounded-lg border-2 border-gray-200 bg-white ${multiline ? 'h-14' : 'h-9'}`}>
        {select && (
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </div>
    </div>
  );
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
