import { useLanguage } from "@/lib/language-context";

/** Exact headline. Visual text is animated by CSS; an invisible copy reserves the final size. */
export function HeroHeadline() {
  const { c } = useLanguage();
  const text = c("Make smarter energy decisions.");
  return (
    <h1 className="geit-headline" data-testid="hero-headline-box">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="geit-headline-inner">
        <span className="geit-headline-sizer">{text}</span>
        <span className="geit-headline-type">{text}</span>
      </span>
    </h1>
  );
}

export default HeroHeadline;
