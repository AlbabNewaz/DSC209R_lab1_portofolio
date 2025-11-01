import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { fetchJSON } from "../global.js";

async function renderPieChart() {
  const projects = await fetchJSON("../lib/projects.json");

  const svg = d3.select("#projects-pie-plot");
  const legend = d3.select(".legend");

  svg.selectAll("*").remove();
  legend.selectAll("*").remove();

  const yearCounts = d3.rollups(
    projects,
    (v) => v.length,
    (d) => d.year
  );

  const data = yearCounts.map(([year, count]) => ({
    label: year,
    value: count,
  }));

  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  const pie = d3.pie().value((d) => d.value);
  const arcs = pie(data);

  const arcGen = d3.arc().innerRadius(0).outerRadius(50);

  svg
    .selectAll("path")
    .data(arcs)
    .enter()
    .append("path")
    .attr("d", arcGen)
    .attr("fill", (d, i) => colors(i))
    .attr("stroke", "white")
    .attr("stroke-width", 0.5);

  legend
    .selectAll("li")
    .data(data)
    .enter()
    .append("li")
    .attr("style", (d, i) => `--color:${colors(i)}`)
    .html((d) => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
}

renderPieChart();

let query = '';
const searchInput = document.querySelector('.searchBar');

