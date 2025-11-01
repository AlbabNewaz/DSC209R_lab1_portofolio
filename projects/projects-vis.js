import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { fetchJSON } from "../global.js";

const svg = d3.select("#projects-pie-plot");
const legend = d3.select(".legend");
const width = 300;
const height = 300;
const radius = Math.min(width, height) / 2;

svg.attr("viewBox", [0, 0, width, height]);

let allProjects = await fetchJSON("../lib/projects.json");
let filteredProjects = allProjects;

const colorScale = d3.scaleOrdinal()
  .domain([...new Set(allProjects.map(p => p.year))])
  .range(d3.schemeTableau10);

function renderPie(projectsToRender) {
  svg.selectAll("*").remove();
  legend.selectAll("*").remove();

  const yearCounts = d3.rollups(
    projectsToRender,
    v => v.length,
    d => d.year
  );

  const data = yearCounts.map(([year, count]) => ({ year, count }));

  const pie = d3.pie()
    .sort(null)
    .value(d => d.count);

  const arcs = pie(data);
  const arcGen = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);

  const g = svg.append("g")
    .attr("transform", `translate(${width/2},${height/2})`);

  g.selectAll("path")
    .data(arcs)
    .enter()
    .append("path")
    .attr("d", arcGen)
    .attr("fill", d => colorScale(d.data.year))
    .attr("stroke", "white")
    .attr("stroke-width", 1)
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      filteredProjects = allProjects.filter(p => p.year === d.data.year);
      window.dispatchEvent(new CustomEvent('projectsFiltered', { detail: filteredProjects }));
    });

  legend.selectAll("li")
    .data(data)
    .enter()
    .append("li")
    .attr("style", d => `--color:${colorScale(d.year)}`)
    .html(d => `<span class="swatch"></span> ${d.year} <em>(${d.count})</em>`);
}

window.addEventListener('projectsFiltered', e => {
  filteredProjects = e.detail;
  renderPie(filteredProjects);
});

renderPie(allProjects);
