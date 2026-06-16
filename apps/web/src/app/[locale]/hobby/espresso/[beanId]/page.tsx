import { notFound } from "next/navigation";

import { EspressoLogView } from "@/features/hobby/components/espresso-log-view";
import { getEspressoBeanById } from "@/services/espresso-history-service";

interface HobbyEspressoBeanPageProps {
  params: Promise<{
    beanId: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function HobbyEspressoBeanPage({ params }: HobbyEspressoBeanPageProps) {
  const { beanId } = await params;
  const bean = await getEspressoBeanById(beanId);

  if (!bean) {
    notFound();
  }

  return <EspressoLogView bean={bean} />;
}
