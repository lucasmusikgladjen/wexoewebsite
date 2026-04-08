'use client';

import { PageState, PageAction, Tab, TabType } from '@/lib/types';
import { FieldInput, FieldTextarea, FieldSelect, FieldCheckbox } from './FieldInput';

interface Props {
  state: PageState;
  dispatch: React.Dispatch<PageAction>;
}

const tabTypeOptions: { value: string; label: string }[] = [
  { value: 'textimage', label: 'Text + Bild' },
  { value: 'fullmedia', label: 'Helbild / Video' },
  { value: 'faq', label: 'FAQ' },
  { value: 'calameo', label: 'Calameo (dokument)' },
  { value: 'downloads', label: 'Nedladdningar' },
  { value: 'compare', label: 'Jämförelsetabell' },
  { value: 'steps', label: 'Steg-för-steg' },
];

export default function TabsEditor({ state, dispatch }: Props) {
  const set = (field: keyof PageState, value: unknown) =>
    dispatch({ type: 'SET_FIELD', field, value });

  const moveTab = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= state.tabs.length) return;
    dispatch({ type: 'REORDER_TABS', fromIndex: index, toIndex: newIndex });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-lp-main uppercase tracking-wider">Tabs</h3>
        <FieldCheckbox label="Visa" checked={state.showTabs} onChange={(v) => set('showTabs', v)} />
      </div>
      {state.showTabs && (
        <>
          {state.tabs.map((tab, index) => (
            <TabEditor
              key={tab.id}
              tab={tab}
              index={index}
              total={state.tabs.length}
              dispatch={dispatch}
              onMoveUp={() => moveTab(index, -1)}
              onMoveDown={() => moveTab(index, 1)}
              onRemove={() => dispatch({ type: 'REMOVE_TAB', tabId: tab.id })}
            />
          ))}
          <button
            onClick={() => dispatch({ type: 'ADD_TAB' })}
            className="w-full py-2 px-4 border-2 border-dashed border-lp-border rounded-lg text-sm text-lp-text-light hover:border-lp-main hover:text-lp-main transition-colors"
          >
            + Lägg till tab
          </button>
        </>
      )}
    </div>
  );
}

function TabEditor({
  tab,
  index,
  total,
  dispatch,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  tab: Tab;
  index: number;
  total: number;
  dispatch: React.Dispatch<PageAction>;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const setField = (field: keyof Tab, value: unknown) =>
    dispatch({ type: 'SET_TAB_FIELD', tabId: tab.id, field, value });

  return (
    <div className="border border-lp-border rounded-lg bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-lp-border">
        <span className="text-xs font-semibold text-lp-main w-5 text-center">{index + 1}</span>
        <input
          value={tab.name}
          onChange={(e) => setField('name', e.target.value)}
          className="flex-1 text-sm font-medium bg-transparent border-none outline-none text-lp-text"
          placeholder="Tabnamn..."
        />
        <div className="flex items-center gap-1">
          <button onClick={onMoveUp} disabled={index === 0} className="text-gray-400 hover:text-lp-main disabled:opacity-30 text-xs px-1" title="Flytta upp">▲</button>
          <button onClick={onMoveDown} disabled={index === total - 1} className="text-gray-400 hover:text-lp-main disabled:opacity-30 text-xs px-1" title="Flytta ner">▼</button>
          <button onClick={onRemove} className="text-gray-400 hover:text-red-500 text-xs px-1 ml-1" title="Ta bort">✕</button>
        </div>
      </div>
      <div className="p-3 space-y-3">
        <FieldSelect
          label="Typ"
          value={tab.type}
          onChange={(v) => setField('type', v as TabType)}
          options={tabTypeOptions}
        />
        {tab.type === 'textimage' && <TextImageFields tab={tab} setField={setField} />}
        {tab.type === 'fullmedia' && <FullMediaFields tab={tab} setField={setField} />}
        {tab.type === 'faq' && <FaqFields tab={tab} setField={setField} />}
        {tab.type === 'calameo' && <CalameoFields tab={tab} setField={setField} />}
        {tab.type === 'downloads' && <DownloadFields tab={tab} dispatch={dispatch} />}
        {tab.type === 'compare' && <CompareFields tab={tab} setField={setField} />}
        {tab.type === 'steps' && <StepsFields tab={tab} setField={setField} />}
      </div>
    </div>
  );
}

function TextImageFields({ tab, setField }: { tab: Tab; setField: (f: keyof Tab, v: unknown) => void }) {
  return (
    <>
      <FieldInput label="H2" value={tab.tiH2} onChange={(v) => setField('tiH2', v)} placeholder="Rubrik för tabben" />
      <FieldTextarea label="Text" value={tab.tiText} onChange={(v) => setField('tiText', v)} rows={3} />
      <FieldTextarea label="Benefits" value={tab.tiBenefits} onChange={(v) => setField('tiBenefits', v)} rows={3} hint="en per rad" placeholder={"Fördel 1\nFördel 2\nFördel 3"} />
      <FieldInput label="Bild (URL)" value={tab.tiImage} onChange={(v) => setField('tiImage', v)} placeholder="https://..." />
      <FieldCheckbox label="Inverterad layout (bild till vänster)" checked={tab.tiInverted} onChange={(v) => setField('tiInverted', v)} />
    </>
  );
}

function FullMediaFields({ tab, setField }: { tab: Tab; setField: (f: keyof Tab, v: unknown) => void }) {
  return (
    <FieldInput label="URL (bild eller YouTube)" value={tab.fmUrl} onChange={(v) => setField('fmUrl', v)} placeholder="https://youtube.com/watch?v=... eller https://wexoe.se/bild.jpg" />
  );
}

function FaqFields({ tab, setField }: { tab: Tab; setField: (f: keyof Tab, v: unknown) => void }) {
  return (
    <FieldTextarea
      label="FAQ-innehåll"
      value={tab.faqContent}
      onChange={(v) => setField('faqContent', v)}
      rows={8}
      hint="Q: fråga / A: svar"
      placeholder={"Q: Vad är FTTO?\nA: FTTO står för Fiber To The Office och är en nätverksarkitektur som...\n\nQ: Vilka fördelar har FTTO?\nA: De främsta fördelarna inkluderar..."}
    />
  );
}

function CalameoFields({ tab, setField }: { tab: Tab; setField: (f: keyof Tab, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((n) => (
        <div key={n} className="grid grid-cols-[1fr_2fr] gap-2">
          <FieldInput
            label={`Titel ${n}`}
            value={tab[`calTitle${n}` as keyof Tab] as string}
            onChange={(v) => setField(`calTitle${n}` as keyof Tab, v)}
            placeholder={`Dokument ${n}`}
          />
          <FieldInput
            label={`Iframe-URL ${n}`}
            value={tab[`calUrl${n}` as keyof Tab] as string}
            onChange={(v) => setField(`calUrl${n}` as keyof Tab, v)}
            placeholder="https://v.calameo.com/..."
          />
        </div>
      ))}
    </div>
  );
}

function DownloadFields({ tab, dispatch }: { tab: Tab; dispatch: React.Dispatch<PageAction> }) {
  return (
    <div className="space-y-3">
      {tab.downloads.map((dl) => (
        <div key={dl.id} className="border border-gray-200 rounded p-2 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-lp-text-light">Nedladdning</span>
            <button
              onClick={() => dispatch({ type: 'REMOVE_DOWNLOAD', tabId: tab.id, downloadId: dl.id })}
              className="text-xs text-gray-400 hover:text-red-500"
            >
              ✕
            </button>
          </div>
          <FieldInput label="Namn" value={dl.name} onChange={(v) => dispatch({ type: 'SET_DOWNLOAD_FIELD', tabId: tab.id, downloadId: dl.id, field: 'name', value: v })} placeholder="Produktblad FTTO" />
          <FieldInput label="Beskrivning" value={dl.description} onChange={(v) => dispatch({ type: 'SET_DOWNLOAD_FIELD', tabId: tab.id, downloadId: dl.id, field: 'description', value: v })} placeholder="Teknisk specifikation..." />
          <div className="grid grid-cols-2 gap-2">
            <FieldInput label="Fil-URL" value={dl.fileUrl} onChange={(v) => dispatch({ type: 'SET_DOWNLOAD_FIELD', tabId: tab.id, downloadId: dl.id, field: 'fileUrl', value: v })} placeholder="https://..." />
            <FieldInput label="Filtyp" value={dl.fileType} onChange={(v) => dispatch({ type: 'SET_DOWNLOAD_FIELD', tabId: tab.id, downloadId: dl.id, field: 'fileType', value: v })} placeholder="PDF" />
          </div>
        </div>
      ))}
      <button
        onClick={() => dispatch({ type: 'ADD_DOWNLOAD', tabId: tab.id })}
        className="w-full py-1.5 px-3 border border-dashed border-gray-300 rounded text-xs text-lp-text-light hover:border-lp-main hover:text-lp-main transition-colors"
      >
        + Lägg till nedladdning
      </button>
    </div>
  );
}

function CompareFields({ tab, setField }: { tab: Tab; setField: (f: keyof Tab, v: unknown) => void }) {
  return (
    <>
      <FieldInput label="Titel" value={tab.compareTitle} onChange={(v) => setField('compareTitle', v)} placeholder="Jämför lösningar" />
      <div className="grid grid-cols-2 gap-2">
        <FieldInput label="Kolumn A" value={tab.compareColA} onChange={(v) => setField('compareColA', v)} placeholder="FTTO" />
        <FieldInput label="Kolumn B" value={tab.compareColB} onChange={(v) => setField('compareColB', v)} placeholder="Traditionellt" />
      </div>
      <FieldTextarea
        label="Rader"
        value={tab.compareRows}
        onChange={(v) => setField('compareRows', v)}
        rows={5}
        hint="Label | Värde A | Värde B"
        placeholder={"Kostnad | Låg | Hög\nInstallationstid | 2 timmar | 8 timmar\nSkalbarhet | Hög | Begränsad"}
      />
    </>
  );
}

function StepsFields({ tab, setField }: { tab: Tab; setField: (f: keyof Tab, v: unknown) => void }) {
  return (
    <>
      <FieldInput label="Titel" value={tab.stepsTitle} onChange={(v) => setField('stepsTitle', v)} placeholder="Så här kommer du igång" />
      <FieldTextarea
        label="Steg"
        value={tab.stepsRows}
        onChange={(v) => setField('stepsRows', v)}
        rows={5}
        hint="Rubrik | Beskrivning"
        placeholder={"Kontakta oss | Berätta om ditt projekt\nDesign | Vi tar fram en lösningsförslag\nInstallation | Vi installerar och testar"}
      />
    </>
  );
}
