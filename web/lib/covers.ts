export const COVER_COLORS: { id: string; css: string }[] = [
  { id: "mist", css: "linear-gradient(135deg, #d9e4f5 0%, #c5d4ea 100%)" },
  { id: "blush", css: "linear-gradient(120deg, #f6e4e8 0%, #e7cfd6 100%)" },
  { id: "sage", css: "linear-gradient(120deg, #e3eee6 0%, #c5dbcc 100%)" },
  { id: "sand", css: "linear-gradient(120deg, #f3ece3 0%, #e4d5c3 100%)" },
  { id: "dusk", css: "linear-gradient(135deg, #dde5f4 0%, #b7c6de 100%)" },
  { id: "slate", css: "linear-gradient(135deg, #3d4554 0%, #252a33 100%)" },
  { id: "rose", css: "linear-gradient(135deg, #f7d6e0 0%, #e8b4c4 100%)" },
  { id: "ink", css: "linear-gradient(135deg, #2c333a 0%, #1b1f24 100%)" },
];

export const COVER_IMAGES: { id: string; src: string; name: string }[] = [
  { id: "img:ridge", src: "/covers/ridge.jpg", name: "Ridge" },
  { id: "img:coast", src: "/covers/coast.jpg", name: "Coast" },
  { id: "img:dunes", src: "/covers/dunes.jpg", name: "Dunes" },
  { id: "img:forest", src: "/covers/forest.jpg", name: "Forest" },
  { id: "img:night", src: "/covers/night.jpg", name: "Night" },
  { id: "img:peaks", src: "/covers/peaks.jpg", name: "Peaks" },
  { id: "img:bloom", src: "/covers/bloom.jpg", name: "Bloom" },
  { id: "img:desk", src: "/covers/desk.jpg", name: "Desk" },
];

export type CoverPaint =
  | { kind: "color"; css: string }
  | { kind: "image"; src: string };

export function resolveCover(value: string | null | undefined): CoverPaint | null {
  if (!value) return null;
  const color = COVER_COLORS.find((preset) => preset.id === value);
  if (color) return { kind: "color", css: color.css };
  const image = COVER_IMAGES.find((preset) => preset.id === value);
  if (image) return { kind: "image", src: image.src };
  if (
    value.startsWith("data:image/") ||
    value.startsWith("https://") ||
    value.startsWith("http://")
  ) {
    return { kind: "image", src: value };
  }
  return null;
}

export function readCoverFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.onload = () => {
      const source = String(reader.result || "");
      const image = new Image();
      image.onload = () => {
        const max = 1600;
        const scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          resolve(source);
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = () => reject(new Error("Could not read image"));
      image.src = source;
    };
    reader.readAsDataURL(file);
  });
}
