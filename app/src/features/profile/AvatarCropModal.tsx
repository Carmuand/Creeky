import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/i18n";

/**
 * Properties for the {@link AvatarCropModal} component.
 */
interface AvatarCropModalProps {
  /** Whether the modal is visible. */
  open: boolean;
  /** Source image to crop. */
  imageSrc: string | null;
  /** Called with the cropped image data URL. */
  onConfirm: (dataUrl: string) => void;
  /** Called when the user cancels. */
  onCancel: () => void;
}

/**
 * Modal that lets the user zoom and pan a profile photo, then crop it to a
 * square that the application displays as a circle.
 *
 * @param props - Component properties.
 * @returns The crop modal.
 */
export function AvatarCropModal({ open, imageSrc, onConfirm, onCancel }: AvatarCropModalProps) {
  const { t } = useI18n();
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (open) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [open, imageSrc]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  };

  const handleMouseUp = () => setDragging(false);

  const handleConfirm = () => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    const natW = img.naturalWidth || img.width;
    const natH = img.naturalHeight || img.height;
    const imgRect = img.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();
    const cx = contRect.left + contRect.width / 2;
    const cy = contRect.top + contRect.height / 2;
    // crop center in image-displayed coords
    const cropCenterX = cx - imgRect.left;
    const cropCenterY = cy - imgRect.top;
    // scale to source coords
    const scaleX = natW / imgRect.width;
    const scaleY = natH / imgRect.height;
    const cropSize = Math.min(contRect.width * scaleX, contRect.height * scaleY);
    const sx = cropCenterX * scaleX - cropSize / 2;
    const sy = cropCenterY * scaleY - cropSize / 2;
    // clamp
    const clampedSx = Math.max(0, Math.min(natW - cropSize, sx));
    const clampedSy = Math.max(0, Math.min(natH - cropSize, sy));
    const finalSize = Math.min(cropSize, natW - clampedSx, natH - clampedSy);
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, clampedSx, clampedSy, finalSize, finalSize, 0, 0, size, size);
    onConfirm(canvas.toDataURL("image/png"));
  };

  return (
    <Modal open={open} onClose={onCancel} className="w-full max-w-sm" closeOnBackdropClick={false}>
      <div className="flex flex-col gap-4 p-6">
        <h3 className="text-sm font-semibold text-(--text)">{t("avatar.crop.title")}</h3>
        <div
          ref={containerRef}
          className="relative mx-auto h-64 w-64 overflow-hidden rounded-full border border-(--border-medium) bg-(--bg-tertiary) cursor-move select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {imageSrc ? (
            <img
              ref={imgRef}
              src={imageSrc}
              alt=""
              crossOrigin="anonymous"
              draggable={false}
              className="absolute left-1/2 top-1/2 h-full w-full object-cover"
              style={{
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transformOrigin: "center",
              }}
            />
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-(--text-soft)">{t("avatar.crop.zoom")}</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-(--accent)"
          />
        </div>
        <p className="text-[11px] text-(--muted)">{t("avatar.crop.hint")}</p>
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>{t("common.cancel")}</Button>
          <Button variant="primary" size="sm" onClick={handleConfirm}>{t("common.confirm")}</Button>
        </div>
      </div>
    </Modal>
  );
}
