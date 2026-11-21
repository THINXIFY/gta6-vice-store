/** Shown while an admin page loads its data. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="grid animate-pulse gap-6 motion-reduce:animate-none">
      <div className="grid gap-2">
        <div className="h-7 w-48 rounded-md bg-panel-2" />
        <div className="h-4 w-80 max-w-full rounded-md bg-panel" />
      </div>
      <div className="h-24 rounded-2xl border border-line bg-panel" />
      <div className="h-72 rounded-2xl border border-line bg-panel" />
    </div>
  );
}
