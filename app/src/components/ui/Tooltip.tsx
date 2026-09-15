import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  cloneElement,
  isValidElement,
  forwardRef,
  type ReactNode,
  type HTMLAttributes,
  type ComponentPropsWithoutRef,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";

type TooltipSide = "top" | "right" | "bottom" | "left";
type TooltipAlign = "start" | "center" | "end";

interface TooltipProviderProps {
  children: ReactNode;
  delayDuration?: number;
  skipDelayDuration?: number;
}

interface TooltipContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentId: string;
  delayDuration: number;
}

interface TooltipProps {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  delayDuration?: number;
}

interface TooltipTriggerProps extends HTMLAttributes<HTMLElement> {
  children: ReactElement;
  asChild?: boolean;
}

interface TooltipContentProps extends ComponentPropsWithoutRef<"div"> {
  side?: TooltipSide;
  sideOffset?: number;
  align?: TooltipAlign;
  alignOffset?: number;
  hideArrow?: boolean;
}

const TooltipProviderContext = createContext<{ delayDuration: number; skipDelayDuration: number }>({
  delayDuration: 200,
  skipDelayDuration: 300,
});

const TooltipContext = createContext<TooltipContextValue | null>(null);

function useTooltipContext(): TooltipContextValue {
  const ctx = useContext(TooltipContext);
  if (!ctx) throw new Error("Tooltip components must be used within <Tooltip>");
  return ctx;
}

/**
 * Global provider for tooltip delay configuration.
 *
 * Wraps the application or a subtree to control default `delayDuration` for all nested
 * tooltips. Mirrors the Radix `TooltipProvider` API without requiring any external
 * dependency.
 *
 * @example
 * ```tsx
 * <TooltipProvider delayDuration={300}>
 *   <App />
 * </TooltipProvider>
 * ```
 */
export function TooltipProvider({ children, delayDuration = 200, skipDelayDuration = 300 }: TooltipProviderProps) {
  return (
    <TooltipProviderContext.Provider value={{ delayDuration, skipDelayDuration }}>
      {children}
    </TooltipProviderContext.Provider>
  );
}

/**
 * Root tooltip controller that owns open state and trigger reference.
 *
 * Composes with `TooltipTrigger` and `TooltipContent` to mirror the shadcn/Radix
 * pattern while using only Tailwind. Can be controlled or uncontrolled.
 *
 * @example
 * ```tsx
 * <Tooltip>
 *   <TooltipTrigger>
 *     <button>Hover me</button>
 *   </TooltipTrigger>
 *   <TooltipContent side="top">Helpful text</TooltipContent>
 * </Tooltip>
 * ```
 */
export function Tooltip({ children, open, defaultOpen = false, onOpenChange, delayDuration }: TooltipProps) {
  const provider = useContext(TooltipProviderContext);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const currentOpen = isControlled ? open! : internalOpen;
  const contentId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const effectiveDelay = delayDuration ?? provider.delayDuration;

  function setOpen(next: boolean) {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  }

  return (
    <TooltipContext.Provider
      value={{
        open: currentOpen,
        setOpen,
        triggerRef: triggerRef as React.RefObject<HTMLElement | null>,
        contentId,
        delayDuration: effectiveDelay,
      }}
    >
      {children}
    </TooltipContext.Provider>
  );
}

/**
 * Interactive element that anchors the tooltip.
 *
 * Clones its single `children` element and wires hover/focus handlers.
 * The native `title` attribute is suppressed to avoid the browser tooltip.
 *
 * @example
 * ```tsx
 * <Tooltip>
 *   <TooltipTrigger>
 *     <button className="icon-btn"><i className="fa-solid fa-info" /></button>
 *   </TooltipTrigger>
 *   <TooltipContent>More info</TooltipContent>
 * </Tooltip>
 * ```
 */
export const TooltipTrigger = forwardRef<HTMLElement, TooltipTriggerProps>(
  ({ children, asChild: _asChild, onMouseEnter, onMouseLeave, onFocus, onBlur, ...props }, forwardedRef) => {
    const { open, setOpen, triggerRef, contentId, delayDuration } = useTooltipContext();
    const openTimeout = useRef<number | null>(null);
    const closeTimeout = useRef<number | null>(null);

    function clearTimers() {
      if (openTimeout.current) window.clearTimeout(openTimeout.current);
      if (closeTimeout.current) window.clearTimeout(closeTimeout.current);
    }

    function handleEnter() {
      clearTimers();
      openTimeout.current = window.setTimeout(() => setOpen(true), open ? 0 : delayDuration);
    }

    function handleLeave() {
      clearTimers();
      closeTimeout.current = window.setTimeout(() => setOpen(false), 80);
    }

    useEffect(() => () => clearTimers(), []);

    if (!isValidElement(children)) return null;

    const child = children as ReactElement<Record<string, unknown>>;

    return cloneElement(child as ReactElement<Record<string, unknown>>, {
      ref: (node: HTMLElement | null) => {
        (triggerRef as React.RefObject<HTMLElement | null>).current = node;
        const childRef = (child as unknown as { ref?: unknown }).ref;
        if (typeof childRef === "function") {
          (childRef as unknown as (n: HTMLElement | null) => void)(node);
        } else if (
          childRef &&
          typeof childRef === "object" &&
          "current" in (childRef as object)
        ) {
          (childRef as React.RefObject<HTMLElement | null>).current = node;
        }
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef && typeof forwardedRef === "object" && "current" in forwardedRef) {
          (forwardedRef as React.RefObject<HTMLElement | null>).current = node;
        }
      },
      "aria-describedby": open ? contentId : undefined,
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
        (child.props as { onMouseEnter?: (e: React.MouseEvent<HTMLElement>) => void }).onMouseEnter?.(e);
        onMouseEnter?.(e as unknown as React.MouseEvent<HTMLElement>);
        handleEnter();
      },
      onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
        (child.props as { onMouseLeave?: (e: React.MouseEvent<HTMLElement>) => void }).onMouseLeave?.(e);
        onMouseLeave?.(e as unknown as React.MouseEvent<HTMLElement>);
        handleLeave();
      },
      onFocus: (e: React.FocusEvent<HTMLElement>) => {
        (child.props as { onFocus?: (e: React.FocusEvent<HTMLElement>) => void }).onFocus?.(e);
        onFocus?.(e as unknown as React.FocusEvent<HTMLElement>);
        handleEnter();
      },
      onBlur: (e: React.FocusEvent<HTMLElement>) => {
        (child.props as { onBlur?: (e: React.FocusEvent<HTMLElement>) => void }).onBlur?.(e);
        onBlur?.(e as unknown as React.FocusEvent<HTMLElement>);
        handleLeave();
      },
      ...props,
    } as Record<string, unknown>);
  },
);
TooltipTrigger.displayName = "TooltipTrigger";

/**
 * Floating content rendered in a portal, positioned relative to the trigger.
 *
 * Handles `side`/`align`/`sideOffset`/`alignOffset`, viewport clamping,
 * arrow rendering, and Tailwind-styled appearance that matches the ZForge
 * design system (`--bg-elevated`, `--border-strong`, `--text-soft`).
 *
 * Must be a child of `Tooltip` alongside `TooltipTrigger`.
 *
 * @example
 * ```tsx
 * <Tooltip>
 *   <TooltipTrigger><button>Save</button></TooltipTrigger>
 *   <TooltipContent side="right" sideOffset={8} align="center">
 *     Save changes <span className="text-(--muted)">Ctrl+S</span>
 *   </TooltipContent>
 * </Tooltip>
 * ```
 */
export const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  (
    {
      children,
      className,
      side = "top",
      sideOffset = 8,
      align = "center",
      alignOffset = 0,
      hideArrow = false,
      style,
      ...props
    },
    forwardedRef,
  ) => {
    const { open, triggerRef, contentId } = useTooltipContext();
    const innerRef = useRef<HTMLDivElement | null>(null);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
      if (!open) return;
      function update() {
        const trigger = triggerRef.current;
        const content = innerRef.current;
        if (!trigger || !content) return;
        const t = trigger.getBoundingClientRect();
        const c = content.getBoundingClientRect();
        const gap = sideOffset;
        let top = 0;
        let left = 0;

        if (side === "top") top = t.top - c.height - gap;
        else if (side === "bottom") top = t.bottom + gap;
        else if (side === "left") left = t.left - c.width - gap;
        else if (side === "right") left = t.right + gap;

        if (side === "top" || side === "bottom") {
          if (align === "center") left = t.left + t.width / 2 - c.width / 2;
          else if (align === "start") left = t.left + alignOffset;
          else if (align === "end") left = t.right - c.width - alignOffset;
        } else {
          if (align === "center") top = t.top + t.height / 2 - c.height / 2;
          else if (align === "start") top = t.top + alignOffset;
          else if (align === "end") top = t.bottom - c.height - alignOffset;
        }

        if (side === "top" || side === "bottom") {
          left = Math.max(8, Math.min(left, window.innerWidth - c.width - 8));
        } else {
          top = Math.max(8, Math.min(top, window.innerHeight - c.height - 8));
        }

        setPos({ top, left });
      }
      update();
      window.addEventListener("scroll", update, true);
      window.addEventListener("resize", update);
      return () => {
        window.removeEventListener("scroll", update, true);
        window.removeEventListener("resize", update);
      };
    }, [open, side, sideOffset, align, alignOffset, triggerRef]);

    if (!mounted || !open) return null;

    const arrowSide: Record<TooltipSide, string> = {
      top: "bottom-[-4px]",
      bottom: "top-[-4px]",
      left: "right-[-4px]",
      right: "left-[-4px]",
    };

    const arrowAlign: Record<TooltipAlign, string> = {
      center: "left-1/2 -translate-x-1/2",
      start: "left-3",
      end: "right-3 left-auto translate-x-0",
    };

    const verticalAlign: Record<TooltipAlign, string> = {
      center: "top-1/2 -translate-y-1/2",
      start: "top-3",
      end: "bottom-3 top-auto translate-y-0",
    };

    const isVertical = side === "top" || side === "bottom";

    const contentNode = (
      <div
        ref={(node) => {
          innerRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef && typeof forwardedRef === "object" && forwardedRef !== null && "current" in forwardedRef) {
            (forwardedRef as React.RefObject<HTMLDivElement | null>).current = node;
          }
        }}
        id={contentId}
        role="tooltip"
        data-side={side}
        data-align={align}
        className={[
          "fixed z-9999 max-w-[320px] rounded-lg border border-(--border-strong) bg-(--bg-elevated) px-3 py-1.5 text-xs font-medium leading-relaxed text-(--text-soft) shadow-lg backdrop-blur-xl",
          "animate-[fadeIn_0.15s_ease,popIn_0.15s_ease]",
          "pointer-events-none select-none",
          className ?? "",
        ].join(" ")}
        style={{
          top: pos ? `${pos.top}px` : "-9999px",
          left: pos ? `${pos.left}px` : "-9999px",
          opacity: pos ? 1 : 0,
          ...style,
        }}
        {...props}
      >
        {children}
        {!hideArrow ? (
          <div
            aria-hidden
            className={[
              "absolute h-2 w-2 rotate-45 bg-(--bg-elevated) border-(--border-strong)",
              side === "top" ? "border-r border-b" : "",
              side === "bottom" ? "border-l border-t" : "",
              side === "left" ? "border-r border-t" : "",
              side === "right" ? "border-l border-b" : "",
              arrowSide[side],
              isVertical ? arrowAlign[align] : verticalAlign[align],
            ].join(" ")}
          />
        ) : null}
      </div>
    );

    return createPortal(contentNode, document.body);
  },
);
TooltipContent.displayName = "TooltipContent";

/**
 * Convenience wrapper that combines `Tooltip` + `TooltipTrigger` + `TooltipContent`
 * for the common single-content use case. Use the primitive composition above
 * when you need full control over `side`/`align`/styling.
 *
 * @example
 * ```tsx
 * // Simple
 * <TooltipSimple content="Delete game" side="top">
 *   <button className="ghost-btn"><i className="fa-solid fa-trash" /></button>
 * </TooltipSimple>
 *
 * // Primitive (full control)
 * <Tooltip>
 *   <TooltipTrigger><button>Hover</button></TooltipTrigger>
 *   <TooltipContent side="right" align="start" className="max-w-[260px]">
 *     Custom <span className="text-(--accent)">content</span>
 *   </TooltipContent>
 * </Tooltip>
 * ```
 */
export function TooltipSimple({
  children,
  content,
  side = "top",
  align = "center",
  sideOffset = 8,
  delayDuration,
  hideArrow = false,
  contentClassName,
}: {
  children: ReactElement;
  content: ReactNode;
  side?: TooltipSide;
  align?: TooltipAlign;
  sideOffset?: number;
  delayDuration?: number;
  hideArrow?: boolean;
  contentClassName?: string;
}) {
  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger>{children}</TooltipTrigger>
      <TooltipContent side={side} align={align} sideOffset={sideOffset} hideArrow={hideArrow} className={contentClassName}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}