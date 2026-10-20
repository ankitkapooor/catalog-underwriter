import { cn } from '@/lib/utils';

function hueOf(name: string) {
  let hash = 0;
  for (const character of name)
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % 360;
}

function initialsOf(name: string) {
  const words = name
    .replace(/^the\s+/i, '')
    .split(/\s+/)
    .filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');
}

/** Album-style tile generated from the artist name; no image is fetched. */
export function CatalogArtwork({
  name,
  size = 'large',
}: {
  name: string;
  size?: 'large' | 'small';
}) {
  const hue = hueOf(name);
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative flex shrink-0 items-end overflow-hidden text-white',
        size === 'large'
          ? 'aspect-square w-full max-w-[220px] rounded-[10px] p-4 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)]'
          : 'size-11 rounded-md p-1.5',
      )}
      style={{
        background: `radial-gradient(120% 90% at 15% 10%, hsl(${hue} 78% 62%) 0%, transparent 55%), radial-gradient(90% 80% at 90% 85%, hsl(${(hue + 55) % 360} 62% 38%) 0%, transparent 60%), linear-gradient(160deg, hsl(${(hue + 20) % 360} 30% 18%), #111014)`,
      }}
    >
      {size === 'large' && (
        <>
          <span className="absolute top-3.5 left-4 text-[11px] tracking-[0.14em] uppercase opacity-80">
            Catalog
          </span>
          <span className="text-[clamp(1.4rem,4vw,2.5rem)] leading-none font-bold tracking-[-0.03em]">
            {initialsOf(name)}
          </span>
        </>
      )}
    </div>
  );
}
