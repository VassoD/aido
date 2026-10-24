export function PageSkeleton(): React.ReactElement {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-4 motion-reduce:animate-none">
      <div className="h-10 w-2/3 rounded-xl bg-line/60" />
      <div className="h-5 w-full rounded-lg bg-line/40" />
      <div className="h-32 w-full rounded-2xl bg-line/40" />
      <div className="h-32 w-full rounded-2xl bg-line/40" />
    </div>
  );
}
