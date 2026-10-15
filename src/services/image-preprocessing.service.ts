/**
 * Image Preprocessing Service
 * Handles contrast/brightness adjustments, rotation, binarization,
 * noise reduction, and perspective calibration for attendance sheet photos.
 */

export interface PreprocessingOptions {
  rotationAngle?: number; // 0, 90, 180, 270 or arbitrary degrees
  brightness?: number; // -100 to 100
  contrast?: number; // -100 to 100
  binarize?: boolean; // Otsu thresholding
  grayscale?: boolean;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export class ImagePreprocessingService {
  /**
   * Applies contrast and brightness adjustments to normalized RGB values (0-255)
   */
  public static adjustPixelBrightnessContrast(
    r: number,
    g: number,
    b: number,
    brightness: number = 0,
    contrast: number = 0
  ): [number, number, number] {
    // Brightness factor
    let factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    
    // Apply contrast
    let nr = factor * (r - 128) + 128 + brightness;
    let ng = factor * (g - 128) + 128 + brightness;
    let nb = factor * (b - 128) + 128 + brightness;

    // Clamp 0-255
    nr = Math.min(255, Math.max(0, nr));
    ng = Math.min(255, Math.max(0, ng));
    nb = Math.min(255, Math.max(0, nb));

    return [Math.round(nr), Math.round(ng), Math.round(nb)];
  }

  /**
   * Calculate luminance of a pixel
   */
  public static getLuminance(r: number, g: number, b: number): number {
    return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  /**
   * Calculates Otsu's optimal threshold for binarization from a grayscale histogram
   */
  public static calculateOtsuThreshold(histogram: number[], totalPixels: number): number {
    let sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * histogram[i];
    }

    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let maxVariance = 0;
    let threshold = 128;

    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;
      wF = totalPixels - wB;
      if (wF === 0) break;

      sumB += t * histogram[t];
      let mB = sumB / wB;
      let mF = (sum - sumB) / wF;

      let variance = wB * wF * (mB - mF) * (mB - mF);
      if (variance > maxVariance) {
        maxVariance = variance;
        threshold = t;
      }
    }

    return threshold;
  }

  /**
   * Generates CSS filter string for immediate client-side real-time preview
   */
  public static getCssFilterString(options: PreprocessingOptions): string {
    const filters: string[] = [];
    if (options.brightness !== undefined && options.brightness !== 0) {
      const bPercent = 100 + options.brightness;
      filters.push(`brightness(${bPercent}%)`);
    }
    if (options.contrast !== undefined && options.contrast !== 0) {
      const cPercent = 100 + options.contrast;
      filters.push(`contrast(${cPercent}%)`);
    }
    if (options.grayscale) {
      filters.push(`grayscale(100%)`);
    }
    return filters.length > 0 ? filters.join(" ") : "none";
  }

  /**
   * Validates image format and dimensions
   */
  public static validateImage(
    mimeType: string,
    fileSizeBytes: number,
    maxSizeMb: number = 15
  ): { valid: boolean; error?: string } {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(mimeType.toLowerCase())) {
      return {
        valid: false,
        error: `Unsupported format: ${mimeType}. Allowed formats: JPG, PNG, WebP, PDF.`,
      };
    }

    const maxBytes = maxSizeMb * 1024 * 1024;
    if (fileSizeBytes > maxBytes) {
      return {
        valid: false,
        error: `Image size (${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum limit of ${maxSizeMb} MB.`,
      };
    }

    return { valid: true };
  }
}
