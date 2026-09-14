export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-5">
      <div className="w-full max-w-xl border-y-2 border-ink py-8">
        <p className="eyebrow">Building the public record</p>
        <h1 className="mt-3 font-display text-4xl font-semibold">
          Resolving artist…
        </h1>
        <p className="mt-4 text-muted-foreground">
          Catalog evidence will appear as each public source returns.
        </p>
      </div>
    </main>
  );
}
