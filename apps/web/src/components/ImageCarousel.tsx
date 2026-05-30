import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "./AppIcons";
import { asset } from "../lib/api";

export function ImageCarousel({
  images,
  alt,
  fallback,
  countBadge
}: {
  images: string[];
  alt: string;
  fallback: string;
  countBadge?: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const list = images.length ? images : [fallback];
  const active = asset(list[index]) || fallback;
  const canSlide = list.length > 1;

  return (
    <div className="app-image-carousel">
      <img src={active} alt={alt} />
      {countBadge}
      {canSlide ? (
        <>
          <button
            type="button"
            className="app-carousel-nav app-carousel-nav--prev"
            onClick={(event) => {
              event.stopPropagation();
              setIndex((current) => (current === 0 ? list.length - 1 : current - 1));
            }}
            aria-label="รูปก่อนหน้า"
          >
            <ChevronLeftIcon size={14} />
          </button>
          <button
            type="button"
            className="app-carousel-nav app-carousel-nav--next"
            onClick={(event) => {
              event.stopPropagation();
              setIndex((current) => (current === list.length - 1 ? 0 : current + 1));
            }}
            aria-label="รูปถัดไป"
          >
            <ChevronRightIcon size={14} />
          </button>
          <div className="app-carousel-dots" aria-hidden="true">
            {list.map((image, itemIndex) => (
              <i key={`${image}-${itemIndex}`} className={itemIndex === index ? "active" : ""} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
