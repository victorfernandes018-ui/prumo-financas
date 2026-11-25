import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Prumo — Finanças pessoais",
    short_name: "Prumo",
    description: "Organize sua vida financeira e entenda para onde vai seu dinheiro.",
    lang: "pt-BR",
    dir: "ltr",
    start_url: "/dashboard?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#09090c",
    theme_color: "#5b5cf0",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Atalhos ao pressionar o ícone por alguns segundos (Android)
    shortcuts: [
      { name: "Nova despesa", short_name: "Despesa", url: "/dashboard?new=expense", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Nova receita", short_name: "Receita", url: "/dashboard?new=income", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Transações", url: "/transactions", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Relatórios", url: "/reports", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
