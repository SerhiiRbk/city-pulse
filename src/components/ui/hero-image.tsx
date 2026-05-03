import Image from 'next/image';

type HeroImageProps = {
  /**
   * Absolute or root-relative URL of the source image. Hosts must be
   * allow-listed in `next.config.ts` `images.remotePatterns`.
   */
  src: string;
  /**
   * Decorative hero photos use `alt=""` to keep them out of the
   * accessibility tree (the surrounding `<h1>` already names the page).
   * Provide a real description if the photo is meaningful content.
   */
  alt?: string;
  /**
   * When `true`, instructs Next.js to preload this image and emit
   * `fetchpriority="high"`. Use only on the LCP hero of the route.
   */
  priority?: boolean;
};

/**
 * Edge-to-edge hero photo for landing-style sections. Renders a
 * Next/Image positioned absolutely so it can sit behind the page
 * gradient/overlay layers without affecting layout. Preloads on the
 * critical path so the LCP element is the optimized AVIF/WebP byte
 * stream rather than a CSS background discovered after style parse.
 */
export function HeroImage({ src, alt = '', priority = true }: HeroImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      // `fill` + parent `position: relative` lets the photo cover the
      // hero region without us declaring concrete dimensions, and
      // `sizes` matches the layout (hero spans the viewport at every
      // breakpoint) so the optimizer picks the right resolution.
      fill
      sizes="100vw"
      priority={priority}
      quality={80}
      className="object-cover"
      // Ensure the rendered <img> is invisible to screen readers when
      // the image is decorative. Browsers already skip empty-alt images
      // but this is belt-and-braces for older AT.
      aria-hidden={alt ? undefined : true}
    />
  );
}
