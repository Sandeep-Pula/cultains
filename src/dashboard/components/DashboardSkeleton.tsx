export const DashboardSkeleton = () => (
  <div className="min-h-screen bg-brand-60 p-6 lg:pl-80">
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-3xl bg-brand-30" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="h-[420px] animate-pulse rounded-3xl bg-brand-30" />
        <div className="h-[420px] animate-pulse rounded-3xl bg-brand-30" />
      </div>
    </div>
  </div>
);
