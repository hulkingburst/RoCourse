"use client";

import * as React from "react";

/**
 * Turns the rendered certificate SVG into a print-ready PNG download. The same
 * pipeline is shared by the personal certificate page and the public shared
 * page so both produce byte-identical output.
 */
export function useCertificateDownload(
  svgRef: React.RefObject<SVGSVGElement | null>,
  fileName: string
) {
  const [downloading, setDownloading] = React.useState(false);

  const handleDownload = React.useCallback(async () => {
    const node = svgRef.current;
    if (!node) return;
    setDownloading(true);
    try {
      const xml = new XMLSerializer().serializeToString(node);
      const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Could not render certificate"));
        image.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = 3200;
      canvas.height = 2200;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const pngBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!pngBlob) throw new Error("Could not create PNG");

      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(pngBlob);
      anchor.download = fileName;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(anchor.href), 10_000);
    } catch (error) {
      console.error(error);
    } finally {
      setDownloading(false);
    }
  }, [svgRef, fileName]);

  return { downloading, handleDownload };
}