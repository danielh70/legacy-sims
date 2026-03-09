import { SimWorkbench } from '@/components/sim-workbench';
import { getSimCatalog } from '@/lib/engine/catalogs';

export default async function HomePage() {
  const catalog = await getSimCatalog();

  return <SimWorkbench catalog={catalog} />;
}
