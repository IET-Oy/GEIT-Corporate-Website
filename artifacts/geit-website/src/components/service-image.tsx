import { useLanguage } from '@/lib/language-context';

/** Supplied service artwork, kept uncropped inside a consistent card frame. */
export function ServiceImage({ slug, title }: { slug: string; title: string }) {
  const { c } = useLanguage();
  return (
    <img
      src={`${import.meta.env.BASE_URL}images/services/${slug}.webp`}
      alt={c(title)}
      width={768}
      height={480}
      loading="lazy"
      decoding="async"
      className="aspect-[8/5] w-full object-contain bg-[#e9eff1]"
      data-testid={`service-image-${slug}`}
    />
  );
}
