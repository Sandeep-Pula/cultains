import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Heart, ImageIcon, Search, Sparkles } from 'lucide-react';
import type { WorkspaceBusinessConfig } from '../businessConfig';

type AIToolsPageProps = {
  businessConfig: WorkspaceBusinessConfig;
};

export const AIToolsPage = ({ businessConfig }: AIToolsPageProps) => {
  const storageKey = `aivyapari-ai-favorites-${businessConfig.type}`;
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      setFavorites(raw ? JSON.parse(raw) : []);
    } catch {
      setFavorites([]);
    }
  }, [storageKey]);

  const tools = useMemo(() => {
    const shared = [
      { id: 'room-rendering', name: 'AI Room Rendering', description: 'Upload a room, apply references, and create polished visual previews.', category: 'Design', href: '#try-once' },
      ...businessConfig.aiSuggestions.map((item) => ({ ...item, href: '#dashboard/ai-tools' })),
    ];
    return shared.filter((tool) => {
      const hay = `${tool.name} ${tool.description} ${tool.category}`.toLowerCase();
      return hay.includes(query.toLowerCase());
    });
  }, [businessConfig.aiSuggestions, query]);

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
              <Sparkles size={14} />
              AI tool hub
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
              Search, favorite, and launch AI workflows without leaving your workspace.
            </h1>
            <p className="mt-3 text-sm leading-6 text-brand-dark/70 sm:text-base">
              Keep industry AI tools and future automation utilities in one place so your team can move from CRM,
              inventory, billing, and operations straight into execution tools. Suggestions below are tuned for {businessConfig.label.toLowerCase()} workflows.
            </p>
          </div>
          <label className="flex rounded-[28px] border border-brand-30 bg-brand-60/50 px-5 py-4 text-sm text-brand-dark/75 lg:min-w-[320px]">
            <Search size={18} className="mr-3 mt-0.5 text-brand-dark/50" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search AI tools for this workspace..."
              className="w-full bg-transparent outline-none placeholder:text-brand-dark/45"
            />
          </label>
        </div>
      </section>

      <section className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-brand-dark">Favorites</h2>
            <p className="mt-1 text-sm text-brand-dark/65">Pin the tools you want at the top of your workspace.</p>
          </div>
          <div className="rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold text-brand-dark">{favorites.length} saved</div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {favorites.length ? tools.filter((tool) => favorites.includes(tool.id)).map((tool) => (
            <span key={tool.id} className="inline-flex items-center gap-2 rounded-full border border-brand-30 bg-brand-60 px-3 py-2 text-sm font-medium text-brand-dark">
              <Heart size={14} className="fill-current text-rose-500" />
              {tool.name}
            </span>
          )) : (
            <div className="text-sm text-brand-dark/55">No favorite AI tools yet.</div>
          )}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <a
            key={tool.id}
            href={tool.href}
            className="group rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand-10 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-60 text-brand-10">
                <ImageIcon size={22} />
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  toggleFavorite(tool.id);
                }}
                className={`rounded-full p-2 ${favorites.includes(tool.id) ? 'text-rose-500' : 'text-brand-dark/35'}`}
                aria-label="Toggle favorite"
              >
                <Heart size={18} className={favorites.includes(tool.id) ? 'fill-current' : ''} />
              </button>
            </div>
            <div className="mt-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-brand-dark">{tool.name}</h2>
                <p className="mt-2 text-sm leading-6 text-brand-dark/70">{tool.description}</p>
              </div>
              <ArrowUpRight size={18} className="mt-1 text-brand-dark/45 transition group-hover:text-brand-10" />
            </div>
            <div className="mt-5 flex items-center justify-between">
              <div className="inline-flex rounded-full bg-brand-60 px-3 py-1 text-xs font-medium text-brand-dark">
                {tool.category}
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-dark/55">Open tool</div>
            </div>
          </a>
        ))}
      </section>
    </div>
  );
};
