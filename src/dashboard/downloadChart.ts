function fileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `openvector-${slug || "chart"}.png`;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(next).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}

export function downloadChartPng(card: HTMLElement, title: string): void {
  const svg = card.querySelector("svg.recharts-surface, svg");
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

  const heading = card.querySelector("h2")?.textContent?.trim() || title;
  const hint = card.querySelector("h2 + p")?.textContent?.trim() ?? "";
  const footnote = card.querySelector(":scope > p")?.textContent?.trim() ?? "";

  const source = new XMLSerializer().serializeToString(clone);
  const image = new Image();
  image.onload = () => {
    const scale = 2;
    const pad = 20;
    const measure = document.createElement("canvas").getContext("2d");
    if (!measure) {
      return;
    }
    const textWidth = width - pad * 2;
    measure.font = "600 14px Segoe UI, system-ui, sans-serif";
    const titleLines = wrapText(measure, heading, textWidth);
    measure.font = "12px Segoe UI, system-ui, sans-serif";
    const hintLines = hint ? wrapText(measure, hint, textWidth) : [];
    const footnoteLines = footnote ? wrapText(measure, footnote, textWidth) : [];
    const headerHeight = 16 + titleLines.length * 20 + hintLines.length * 16 + (hintLines.length ? 8 : 0);
    const footerHeight = footnoteLines.length ? 16 + footnoteLines.length * 18 : 0;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round((width + pad * 2) * scale);
    canvas.height = Math.round((headerHeight + height + footerHeight + pad * 2) * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0f172a";
    ctx.font = "600 14px Segoe UI, system-ui, sans-serif";
    let y = pad + 14;
    for (const line of titleLines) {
      ctx.fillText(line, pad, y);
      y += 20;
    }
    if (hintLines.length) {
      y += 4;
      ctx.fillStyle = "#64748b";
      ctx.font = "12px Segoe UI, system-ui, sans-serif";
      for (const line of hintLines) {
        ctx.fillText(line, pad, y);
        y += 16;
      }
    }
    y += 12;
    ctx.drawImage(image, pad, y, width, height);
    y += height + 16;
    if (footnoteLines.length) {
      ctx.fillStyle = "#64748b";
      ctx.font = "12px Segoe UI, system-ui, sans-serif";
      for (const line of footnoteLines) {
        ctx.fillText(line, pad, y);
        y += 18;
      }
    }
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
