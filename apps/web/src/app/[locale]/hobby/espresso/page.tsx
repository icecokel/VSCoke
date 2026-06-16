import { EspressoBeanList } from "@/features/hobby/components/espresso-bean-list";
import { getEspressoBeans } from "@/services/espresso-history-service";

export const dynamic = "force-dynamic";

export default async function HobbyEspressoPage() {
  const beans = await getEspressoBeans();

  return <EspressoBeanList beans={beans} />;
}
