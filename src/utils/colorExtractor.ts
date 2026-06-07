export const extractColors = (imageUrl: string): Promise<string[]> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = imageUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(['#000000', '#1a1a1a']);
                return;
            }

            canvas.width = 50;
            canvas.height = 50;
            ctx.drawImage(img, 0, 0, 50, 50);

            const imageData = ctx.getImageData(0, 0, 50, 50).data;
            const colorCounts: Record<string, number> = {};

            for (let i = 0; i < imageData.length; i += 4) {
                const r = imageData[i];
                const g = imageData[i + 1];
                const b = imageData[i + 2];
                const a = imageData[i + 3];

                if (a < 128) continue;

                // Quantize colors to reduce noise
                const qr = Math.floor(r / 32) * 32;
                const qg = Math.floor(g / 32) * 32;
                const qb = Math.floor(b / 32) * 32;
                const hex = `#${qr.toString(16).padStart(2, '0')}${qg.toString(16).padStart(2, '0')}${qb.toString(16).padStart(2, '0')}`;

                colorCounts[hex] = (colorCounts[hex] || 0) + 1;
            }

            const sortedColors = Object.entries(colorCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([color]) => color);

            // Filter out overly dark or bright if necessary, or just take top 2
            const topColors = sortedColors.slice(0, 2);
            if (topColors.length < 2) topColors.push('#1a1a1a');

            resolve(topColors);
        };
        img.onerror = () => {
            resolve(['#000000', '#1a1a1a']);
        };
    });
};

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  rgb: {
    primary: { r: number; g: number; b: number };
    secondary: { r: number; g: number; b: number };
    accent: { r: number; g: number; b: number };
  };
}

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
};

export const getPalette = async (imageUrl: string): Promise<ColorPalette | null> => {
  try {
    const colors = await extractColors(imageUrl);
    const primary = colors[0] || '#ffffff';
    const secondary = colors[1] || '#cccccc';
    // Generate accent as a lighter version of primary
    const accent = colors[2] || secondary;
    return {
      primary,
      secondary,
      accent,
      rgb: {
        primary: hexToRgb(primary),
        secondary: hexToRgb(secondary),
        accent: hexToRgb(accent),
      },
    };
  } catch {
    return null;
  }
};
