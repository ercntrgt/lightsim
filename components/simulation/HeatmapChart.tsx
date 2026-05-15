"use client";

import { useMemo } from "react";
import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js-dist-min";
import type { SimulationResult } from "@/types";

const Plot = createPlotlyComponent(Plotly);

/** 2D lüks heatmap'i (Plotly). dynamic(ssr:false) ile yüklenir. */
export default function HeatmapChart({
  result,
}: {
  result: SimulationResult;
}) {
  const { z, x, y } = useMemo(() => {
    const { cols, rows, spacing, origin, grid } = result;
    const z: (number | null)[][] = Array.from({ length: rows }, () =>
      new Array(cols).fill(null)
    );
    for (const g of grid) {
      const ci = Math.round((g.x - origin.x - spacing / 2) / spacing);
      const ri = Math.round((g.y - origin.y - spacing / 2) / spacing);
      if (ci >= 0 && ci < cols && ri >= 0 && ri < rows) z[ri][ci] = g.lux;
    }
    const x = Array.from(
      { length: cols },
      (_, i) => +(origin.x + (i + 0.5) * spacing).toFixed(2)
    );
    const y = Array.from(
      { length: rows },
      (_, i) => +(origin.y + (i + 0.5) * spacing).toFixed(2)
    );
    return { z, x, y };
  }, [result]);

  return (
    <Plot
      data={[
        {
          z,
          x,
          y,
          type: "heatmap",
          colorscale: "Viridis",
          zsmooth: "best",
          colorbar: { title: { text: "lüks" }, thickness: 12 },
          hovertemplate:
            "x=%{x} m<br>y=%{y} m<br>%{z:.0f} lx<extra></extra>",
        },
      ]}
      layout={{
        margin: { l: 44, r: 10, t: 10, b: 40 },
        xaxis: { title: { text: "x (m)" }, scaleanchor: "y" },
        yaxis: { title: { text: "y (m)" } },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        autosize: true,
      }}
      config={{ displaylogo: false, responsive: true }}
      style={{ width: "100%", height: "100%" }}
      useResizeHandler
    />
  );
}
