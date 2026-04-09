'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PageRow {
  id: string;
  name: string;
  slug: string;
  h1: string;
}

type PageType = 'landing' | 'product' | 'contact';

const PAGE_TYPES: Array<{
  id: PageType;
  label: string;
  available: boolean;
  description: string;
}> = [
  { id: 'landing', label: 'Landing page', available: true, description: 'Kampanj- och konverteringssida' },
  { id: 'product', label: 'Produktsida', available: false, description: 'Kommer snart' },
  { id: 'contact', label: 'Kontaktsida', available: false, description: 'Kommer snart' },
];

export default function PageManager() {
  const router = useRouter();
  const [pages, setPages] = useState<PageRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState<PageType | 'all'>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/read?action=list')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          setPages([]);
        } else {
          setPages(data.pages ?? []);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Kunde inte hämta sidor');
        setPages([]);
      });
    return () => { cancelled = true; };
  }, []);

  const filteredPages = useMemo(() => {
    if (!pages) return [];
    if (activeType !== 'all' && activeType !== 'landing') return [];
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.h1.toLowerCase().includes(q),
    );
  }, [pages, query, activeType]);

  const counts = {
    all: pages?.length ?? 0,
    landing: pages?.length ?? 0,
    product: 0,
    contact: 0,
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-dm-sans)' }}>
      <div className="max-w-3xl mx-auto px-8 pt-24 pb-32">
        {/* Header */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-gray-900">Sidor</h1>
            <p className="text-sm text-gray-400 mt-1">
              {pages === null ? 'Laddar…' : `${counts.landing} ${counts.landing === 1 ? 'sida' : 'sidor'}`}
            </p>
          </div>
          <button
            onClick={() => setShowAddDialog(true)}
            className="px-4 py-2 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: '#11325D' }}
          >
            Ny sida
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök på namn, slug eller rubrik…"
            className="w-full px-0 py-3 text-base bg-transparent border-0 border-b border-gray-200 focus:border-gray-900 focus:outline-none placeholder:text-gray-300 transition-colors"
          />
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-6 mb-10 text-sm">
          <button
            onClick={() => setActiveType('all')}
            className={`transition-colors ${activeType === 'all' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Alla <span className="text-gray-300 ml-1">{counts.all}</span>
          </button>
          {PAGE_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => t.available && setActiveType(t.id)}
              disabled={!t.available}
              className={`transition-colors ${
                activeType === t.id
                  ? 'text-gray-900'
                  : t.available
                  ? 'text-gray-400 hover:text-gray-600'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title={t.available ? '' : 'Kommer snart'}
            >
              {t.label}{' '}
              <span className={t.available ? 'text-gray-300 ml-1' : 'text-gray-300 ml-1'}>
                {counts[t.id]}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        {error && (
          <div className="py-6 text-sm text-red-500">
            Kunde inte hämta sidor: {error}
          </div>
        )}

        {pages === null && !error && (
          <div className="space-y-px">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="py-5 border-b border-gray-100">
                <div className="h-4 w-48 bg-gray-100 rounded mb-2" />
                <div className="h-3 w-24 bg-gray-50 rounded" />
              </div>
            ))}
          </div>
        )}

        {pages && filteredPages.length === 0 && !error && (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">
              {query ? 'Inga sidor matchar din sökning.' : 'Inga sidor ännu.'}
            </p>
          </div>
        )}

        {pages && filteredPages.length > 0 && (
          <ul className="space-y-px">
            {filteredPages.map((page) => (
              <li key={page.id}>
                <Link
                  href={`/editor/${page.id}`}
                  className="block py-5 border-b border-gray-100 group transition-colors hover:bg-gray-50/50 -mx-4 px-4 rounded"
                >
                  <div className="flex items-baseline justify-between gap-6">
                    <div className="min-w-0 flex-1">
                      <p className="text-base text-gray-900 truncate group-hover:text-lp-main transition-colors">
                        {page.name || page.slug || 'Ingen titel'}
                      </p>
                      {page.h1 && page.h1 !== page.name && (
                        <p className="text-sm text-gray-400 mt-0.5 truncate">{page.h1}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-300 font-mono whitespace-nowrap">
                      /{page.slug}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showAddDialog && (
        <AddPageDialog
          onClose={() => setShowAddDialog(false)}
          onSelect={(type) => {
            if (type === 'landing') {
              router.push('/editor');
            }
          }}
        />
      )}
    </div>
  );
}

function AddPageDialog({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (type: PageType) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-lg font-medium text-gray-900">Ny sida</h2>
          <p className="text-sm text-gray-400 mt-0.5">Välj vilken typ du vill skapa</p>
        </div>
        <div className="px-3 py-3">
          {PAGE_TYPES.map((t) => (
            <button
              key={t.id}
              disabled={!t.available}
              onClick={() => {
                if (!t.available) return;
                onSelect(t.id);
                onClose();
              }}
              className={`w-full text-left px-3 py-3 rounded-md transition-colors ${
                t.available
                  ? 'hover:bg-gray-50 cursor-pointer'
                  : 'cursor-not-allowed opacity-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>
                </div>
                {!t.available && (
                  <span className="text-[10px] uppercase tracking-wider text-gray-300">
                    Snart
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
        <div className="px-6 py-3 flex justify-end border-t border-gray-100">
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Avbryt
          </button>
        </div>
      </div>
    </div>
  );
}
