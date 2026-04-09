'use client';

import { ProductAreaState, Division } from '@/lib/product-area-types';
import { FieldCheckbox } from '@/components/editors/FieldInput';

interface Props {
  state: ProductAreaState;
  divisions: Division[];
  setField: <K extends keyof ProductAreaState>(key: K, value: ProductAreaState[K]) => void;
}

export default function SettingsEditor({ state, divisions, setField }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="text-xl font-bold text-gray-900">Inställningar</h3>

      <div className="space-y-2">
        <FieldCheckbox
          label="Sidomeny istället för toggle"
          checked={state.sideMenu}
          onChange={(v) => setField('sideMenu', v)}
        />
        <FieldCheckbox
          label="Prisförfrågan-formulär"
          checked={state.request}
          onChange={(v) => setField('request', v)}
        />
        <FieldCheckbox
          label="Första produkten öppen som default"
          checked={state.defaultOpen}
          onChange={(v) => setField('defaultOpen', v)}
        />
      </div>

      <div className="pt-2">
        <label className="block">
          <span className="text-[11px] text-gray-400">Division</span>
          <select
            value={state.division[0] ?? ''}
            onChange={(e) =>
              setField('division', e.target.value ? [e.target.value] : [])
            }
            className="mt-0.5 block w-full rounded bg-gray-100/80 px-3 py-2 text-sm text-gray-700 focus:bg-white focus:ring-1 focus:ring-gray-200 focus:outline-none"
          >
            <option value="">— Ingen —</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
