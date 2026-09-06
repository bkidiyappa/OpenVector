function fileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `openvector-${slug || "chart"}.png`;
}

export function downloadChartPng(container: HTMLElement, title: string): void {
  const svg = container.querySelector("svg.recharts-surface, svg");
  if (!(svg instanceof SVGSVGElement)) {
    return;
  }
  const { width, height } = svg.getBoundingClientRect();
  if (width < 8 || height < 8) {
    return;
  }

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  if (!clone.getAttribute("viewBox")) {
    clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  const source = new XMLSerializer().serializeToString(clone);
  const image = new Image();
  image.onload = () => {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName(title);
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
}
