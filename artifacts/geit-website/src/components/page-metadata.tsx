import { useEffect } from "react";
import { useLanguage } from "@/lib/language-context";

type PageMetadataProps = {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
};

/** Copy inputs are always English source strings, like all shared page helpers. */
export function PageMetadata({ title, description, path, noIndex = false }: PageMetadataProps) {
  const { c, language } = useLanguage();
  const localizedTitle = `${c(title)} | GEIT Ltd`;
  const localizedDescription = c(description);

  useEffect(() => {
    document.title = localizedTitle;
    const setMeta = (kind: "name" | "property", name: string, value: string) => {
      const tag = document.querySelector(`meta[${kind}="${name}"]`) ?? document.createElement("meta");
      tag.setAttribute(kind, name);
      tag.setAttribute("content", value);
      document.head.appendChild(tag);
    };
    setMeta("name", "description", localizedDescription);
    setMeta("property", "og:title", localizedTitle);
    setMeta("property", "og:description", localizedDescription);
    setMeta("name", "twitter:title", localizedTitle);
    setMeta("name", "twitter:description", localizedDescription);
    setMeta("property", "og:locale", { en: "en_RW", fr: "fr_RW", rw: "rw_RW", sw: "sw_RW" }[language]);
    setMeta("name", "content-language", language);
    setMeta("name", "robots", noIndex ? "noindex, follow" : "index, follow");

    const publicBase = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.replace(/\/$/, "");
    const canonical = document.querySelector('link[rel="canonical"]');
    if (publicBase && path && !noIndex) {
      const tag = canonical ?? document.createElement("link");
      tag.setAttribute("rel", "canonical");
      tag.setAttribute("href", `${publicBase}${path}`);
      document.head.appendChild(tag);
      setMeta("property", "og:url", `${publicBase}${path}`);
      setMeta("property", "og:image", `${publicBase}/images/geit-energy-landscape.jpg`);
    } else {
      canonical?.remove();
      document.querySelector('meta[property="og:url"]')?.remove();
      document.querySelector('meta[property="og:image"]')?.remove();
    }
  }, [localizedTitle, localizedDescription, path, language, noIndex]);
  return null;
}
