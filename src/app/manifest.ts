import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Constellation — Studio de devis",
    short_name: "Constellation",
    description: "Créez, conservez et partagez des devis professionnels depuis votre téléphone.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#eef1f5",
    theme_color: "#07132e",
    lang: "fr",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/pwa-icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon/512?maskable=1",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
