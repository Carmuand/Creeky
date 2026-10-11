import type { CSSProperties, ReactElement } from "react";

/**
 * Properties accepted by the Ballpit background component.
 */
export interface BallpitProps {
  /** Additional classes applied to the canvas element. */
  className?: string;
  /** Inline styles applied to the canvas element. */
  style?: CSSProperties;
  /** When true the main sphere follows the cursor. @default true */
  followCursor?: boolean;
  /** Number of rendered spheres. @default 200 */
  count?: number;
  /** Palette expressed as hexadecimal numbers. */
  colors?: number[];
  /** Ambient light color as hexadecimal number. */
  ambientColor?: number;
  /** Ambient light intensity. */
  ambientIntensity?: number;
  /** Point light intensity. */
  lightIntensity?: number;
  /** Smallest sphere size. */
  minSize?: number;
  /** Largest sphere size. */
  maxSize?: number;
  /** Gravity applied to the spheres. */
  gravity?: number;
}

/**
 * Interactive 3D ball pit background.
 */
declare const Ballpit: (props: BallpitProps) => ReactElement;

export default Ballpit;
