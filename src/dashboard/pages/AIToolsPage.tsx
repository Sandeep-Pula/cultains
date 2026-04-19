import { ArrowUpRight, ImageIcon, Sparkles } from 'lucide-react';

export const AIToolsPage = () => {
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
              Launch AI workflows without leaving your decorator workspace.
            </h1>
            <p className="mt-3 text-sm leading-6 text-brand-dark/70 sm:text-base">
              Keep advanced rendering and future AI utilities in one place so your team can move from CRM, inventory,
              billing, and project coordination straight into execution tools.
            </p>
          </div>
          <div className="rounded-[28px] border border-brand-30 bg-brand-60/50 px-5 py-4 text-sm text-brand-dark/75">
            More AI cards can be added here later without changing the sidebar structure.
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <a
          href="#try-once"
          className="group rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand-10 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-60 text-brand-10">
            <ImageIcon size={22} />
          </div>
          <div className="mt-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-brand-dark">AI Room Rendering</h2>
              <p className="mt-2 text-sm leading-6 text-brand-dark/70">
                Upload a room, apply wallpaper and curtain references, and generate a polished preview for client discussions.
              </p>
            </div>
            <ArrowUpRight size={18} className="mt-1 text-brand-dark/45 transition group-hover:text-brand-10" />
          </div>
          <div className="mt-5 inline-flex rounded-full bg-brand-60 px-3 py-1 text-xs font-medium text-brand-dark">
            Open tool
          </div>
        </a>
      </section>
    </div>
  );
};
