import { useEffect } from "react";
import { BackNavIcon, CloseIcon, ForwardIcon, ProductGalleryIcon } from "./AppIcons";

export function ImageGalleryDialog({
  images,
  title,
  selectedIndex,
  onSelect,
  onClose
}: {
  images: string[];
  title: string;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onSelect(Math.max(0, selectedIndex - 1));
      if (event.key === "ArrowRight") onSelect(Math.min(images.length - 1, selectedIndex + 1));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [images.length, onClose, onSelect, selectedIndex]);

  return (
    <div className="sheet-backdrop gallery-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="gallery-dialog" role="dialog" aria-modal="true" aria-label={`แกลเลอรี ${title}`}>
        <div className="gallery-dialog-topbar">
          <div className="gallery-dialog-title">
            <ProductGalleryIcon size={16} />
            <span>{title}</span>
          </div>
          <button type="button" className="gallery-dialog-close" onClick={onClose} aria-label="ปิดแกลเลอรี">
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="gallery-dialog-stage">
          {images.length > 1 ? (
            <button
              type="button"
              className="gallery-dialog-nav gallery-dialog-nav-prev"
              onClick={() => onSelect(Math.max(0, selectedIndex - 1))}
              disabled={selectedIndex === 0}
              aria-label="รูปก่อนหน้า"
            >
              <BackNavIcon size={16} />
            </button>
          ) : null}

          <div className="gallery-dialog-image-wrap">
            <img src={images[selectedIndex]} alt={`${title} รูปที่ ${selectedIndex + 1}`} className="gallery-dialog-image" />
          </div>

          {images.length > 1 ? (
            <button
              type="button"
              className="gallery-dialog-nav gallery-dialog-nav-next"
              onClick={() => onSelect(Math.min(images.length - 1, selectedIndex + 1))}
              disabled={selectedIndex === images.length - 1}
              aria-label="รูปถัดไป"
            >
              <ForwardIcon size={16} />
            </button>
          ) : null}
        </div>

        {images.length > 1 ? (
          <>
            <div className="gallery-dialog-count">{selectedIndex + 1} / {images.length}</div>
            <div className="gallery-dialog-thumbs" aria-label="รูปย่อทั้งหมด">
              {images.map((image, index) => (
                <button
                  key={`${title}-${index}`}
                  type="button"
                  className={`gallery-dialog-thumb${index === selectedIndex ? " active" : ""}`}
                  onClick={() => onSelect(index)}
                  aria-label={`ดูรูปที่ ${index + 1}`}
                >
                  <img src={image} alt="" />
                </button>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
