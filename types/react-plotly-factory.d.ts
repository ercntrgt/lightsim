declare module "react-plotly.js/factory" {
  import type { ComponentType } from "react";
  import type { PlotParams } from "react-plotly.js";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createPlotlyComponent: (plotly: any) => ComponentType<PlotParams>;
  export default createPlotlyComponent;
}
declare module "plotly.js-dist-min";
