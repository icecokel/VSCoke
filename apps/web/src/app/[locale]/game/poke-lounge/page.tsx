import { permanentRedirect } from "next/navigation";

import { pokeLoungeSiteUrl } from "@/lib/site-url";

interface PokeLoungeRedirectPageProps {
  params: Promise<{ locale: string }>;
}

const PokeLoungeRedirectPage = async ({ params }: PokeLoungeRedirectPageProps) => {
  const { locale } = await params;

  permanentRedirect(`${pokeLoungeSiteUrl}/${locale}/game/poke-lounge`);
};

export default PokeLoungeRedirectPage;
