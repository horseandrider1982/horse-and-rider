// Local brand logo overrides — replaces oversized external CDN images
// with locally-optimized 240x80 WebP/SVG variants. Keyed by brand slug.
import uvex from "@/assets/brands/uvex.webp";
import melzer from "@/assets/brands/melzer.webp";
import freejump from "@/assets/brands/freejump.webp";
import pikeur from "@/assets/brands/pikeur.webp";
import effol from "@/assets/brands/effol.webp";
import lemieux from "@/assets/brands/lemieux.svg";
import ariat from "@/assets/brands/ariat.svg";

export const LOCAL_BRAND_LOGOS: Record<string, string> = {
  uvex,
  "hans-melzer-horse-equipment": melzer,
  freejump,
  pikeur,
  effol,
  lemieux,
  ariat,
};

export function resolveBrandLogo(slug: string, fallback: string | null): string | null {
  return LOCAL_BRAND_LOGOS[slug] || fallback;
}
