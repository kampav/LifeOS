import { RELEASE_LOG } from "@/lib/releaseLog";

export default function ReleaseLogPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <section className="panel-dark overflow-hidden rounded-[2rem] p-6 text-white md:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60">Release log</p>
        <h1 className="serif-italic mt-3 text-5xl leading-tight">What changed in LifeOS</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-white/75">
          A clear running log of product changes, so the app explains what improved without exposing engineering internals.
        </p>
      </section>

      <div className="mt-6 space-y-4">
        {RELEASE_LOG.map(release => (
          <article key={release.version} className="panel rounded-[1.5rem] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="metric-label">{release.date}</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">{release.title}</h2>
              </div>
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-black text-white">{release.version}</span>
            </div>
            <ul className="mt-4 space-y-2">
              {release.items.map(item => (
                <li key={item} className="flex gap-2 text-sm leading-6 text-slate-600">
                  <span className="mt-2 h-2 w-2 flex-none rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
