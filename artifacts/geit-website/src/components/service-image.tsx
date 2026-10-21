import { useLanguage } from '@/lib/language-context';

/** Supplied service artwork fills the frame with a centred cover crop. */
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
      className="aspect-[8/5] w-full object-cover"
      data-testid={`service-image-${slug}`}
    />
  );
}
