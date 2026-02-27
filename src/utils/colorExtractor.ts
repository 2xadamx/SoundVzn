/**
 * Utility to extract the dominant vibrant color from an image URL.
 * Uses a hidden canvas to analyze image pixels.
 */

export async function getDominantColor(imageUrl: string): Promise<string | null> {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(null), 3000);
        const img = new Image();
        img.crossOrigin = "Anonymous";

        img.onload = () => {
            clearTimeout(timeout);
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(null);

            canvas.width = img.width;
            canvas.height = img.height;

            try {
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                let r = 0, g = 0, b = 0;
                let count = 0;
                const sampleSize = 10;

                for (let i = 0; i < imageData.length; i += 4 * sampleSize) {
                    r += imageData[i];
                    g += imageData[i + 1];
                    b += imageData[i + 2];
                    count++;
                }

                if (count === 0) return resolve(null);

                r = Math.floor(r / count);
                g = Math.floor(g / count);
                b = Math.floor(b / count);

                const hsv = rgbToHsv(r, g, b);
                if (hsv.s < 0.3) hsv.s = 0.6;
                if (hsv.v < 0.3) hsv.v = 0.5;
                const energeticRgb = hsvToRgb(hsv.h, hsv.s, hsv.v);

                resolve(`rgb(${energeticRgb.r}, ${energeticRgb.g}, ${energeticRgb.b})`);
            } catch (e) {
                // This usually happens on Tainted Canvas due to CORS
                console.warn("🎨 Color extraction blocked by CORS or other issue:", imageUrl);
                resolve(null);
            }
        };

        img.onerror = () => {
            clearTimeout(timeout);
            resolve(null);
        };
        img.src = imageUrl;
    });
}

function rgbToHsv(r: number, g: number, b: number) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h, s, v };
}

function hsvToRgb(h: number, s: number, v: number) {
    let r = 0, g = 0, b = 0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}
