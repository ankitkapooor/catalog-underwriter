import { demoCatalog } from '@/data/demo-catalog';
import { UnderwritingWorkbench } from '@/components/underwriting-workbench';

export default async function ArtistUnderwritePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <UnderwritingWorkbench
      artistId={id}
      initialCatalog={id === 'demo' ? demoCatalog : null}
    />
  );
}
