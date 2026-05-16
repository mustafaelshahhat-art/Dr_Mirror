import { ImageOff } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
}

interface Props {
  images: ProductImage[];
  productName: string;
}

/**
 * Image gallery with a main viewport and a horizontal thumbnail strip.
 * Active image index is managed internally — the parent does not need to
 * track which image is showing.
 */
export function ProductImageGallery({ images, productName }: Props) {
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const [activeImage, setActiveImage] = useState(0);
  const currentImage = images[activeImage] ?? images[0];

  return (
    <section className="space-y-3">
      <div className="aspect-[4/5] w-full overflow-hidden rounded-large border border-divider/60 bg-bone max-h-[clamp(240px,52svh,480px)] lg:max-h-none">
        {currentImage ? (
          <img
            src={currentImage.url}
            alt={currentImage.alt ?? productName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-default-300 dark:text-default-600">
            <ImageOff className="size-16" aria-hidden />
          </div>
        )}
      </div>

      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto" role="group" aria-label={productName}>
          {images.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              aria-current={idx === activeImage ? 'true' : undefined}
              aria-label={`Image ${idx + 1} of ${images.length}`}
              onClick={() => setActiveImage(idx)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  setActiveImage((i) => isRtl
                    ? (i - 1 + images.length) % images.length
                    : (i + 1) % images.length);
                } else if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  setActiveImage((i) => isRtl
                    ? (i + 1) % images.length
                    : (i - 1 + images.length) % images.length);
                }
              }}
              className={
                idx === activeImage
                  ? 'h-16 w-20 shrink-0 overflow-hidden rounded-medium ring-2 ring-primary'
                  : 'h-16 w-20 shrink-0 overflow-hidden rounded-medium border border-divider/60 transition-shadow hover:ring-1 hover:ring-default-300'
              }
            >
              <img
                src={img.url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
