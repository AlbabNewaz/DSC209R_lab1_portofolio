import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const csvPath = "./loc.csv";

// SVG setup
const svg = d3.select("#scatterplot");
const width = 900;
const height = 500;
svg.attr("width", width).attr("height", height);

const margin = { top: 20, right: 20, bottom: 60, left: 80 };
const innerW = width - margin.left - margin.right;
const innerH = height - margin.top - margin.bottom;

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

// Tooltip
const tooltip = d3.select("body")
  .append("div")
  .attr("id", "tooltip")
  .style("opacity", 0)
  .style("position", "absolute")
  .style("background-color", "#fff")
  .style("padding", "8px")
  .style("border", "1px solid #ccc")
  .style("border-radius", "4px")
  .style("pointer-events", "none");

// Summary boxes
const summaryBox = d3.select("#summary");
const selectionBox = d3.select("#selection-summary");
const commitTimeLabel = d3.select("#commit-time");

// Load CSV
const data = await d3.csv(csvPath, d => {
  const [h, m, s] = d.time.split(":").map(Number);
  return {
    file: d.file,
    type: d.type,
    commit: d.commit,
    date: new Date(d.date),
    minutes: h * 60 + m + s / 60,
    lines: +d.length
  };
});

// Circle radius
const commitCount = d3.rollup(data, v => v.length, d => d.commit);
const radius = d => Math.sqrt(commitCount.get(d.commit) || 1) * 2;

// Scales
const x = d3.scaleTime().range([0, innerW]).nice();
const y = d3.scaleLinear().range([innerH, 0]).nice();
const color = d3.scaleOrdinal(d3.schemeTableau10);

// Axes groups
g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${innerH})`);
g.append("g").attr("class", "y-axis");

// Initial domain
x.domain(d3.extent(data, d => d.date));
y.domain(d3.extent(data, d => d.minutes));

// Draw axes
g.select(".x-axis").call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b %d")));
g.select(".y-axis").call(d3.axisLeft(y).tickFormat(d => {
  const hh = Math.floor(d / 60);
  const mm = Math.floor(d % 60);
  return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`;
}));

// Draw circles group
const dots = g.append("g").attr("class", "dots");

// Tooltip events
function showTooltip(event, d) {
  tooltip
    .style("opacity", 1)
    .html(`
      <strong>File:</strong> ${d.file}<br>
      <strong>Language:</strong> ${d.type}<br>
      <strong>Date:</strong> ${d.date.toLocaleDateString()}<br>
      <strong>Time:</strong> ${Math.floor(d.minutes/60).toString().padStart(2,"0")}:${Math.floor(d.minutes%60).toString().padStart(2,"0")}<br>
      <strong>Lines:</strong> ${d.lines}<br>
      <strong>Commit:</strong> ${d.commit}
    `)
    .style("left", event.pageX + 15 + "px")
    .style("top", event.pageY + "px");
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}

// Slider filter
const slider = d3.select("#commit-progress");
let commitMaxTime = d3.max(data, d => d.date);

slider.on("input", () => {
  const percent = +slider.node().value / 100;
  const dates = d3.extent(data, d => d.date);
  const range = dates[1] - dates[0];
  commitMaxTime = new Date(dates[0].getTime() + percent * range);

  commitTimeLabel.text(commitMaxTime.toLocaleDateString());
  const filtered = data.filter(d => d.date <= commitMaxTime);
  updateScatterPlot(filtered);
});

// Initial label
commitTimeLabel.text(commitMaxTime.toLocaleDateString());

// Function to update scatterplot
function updateScatterPlot(filteredData) {
  // Update scales
  x.domain(d3.extent(filteredData, d => d.date));
  y.domain(d3.extent(filteredData, d => d.minutes));

  // Update axes
  g.select(".x-axis")
    .transition().duration(300)
    .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b %d")));

  g.select(".y-axis")
    .transition().duration(300)
    .call(d3.axisLeft(y).tickFormat(d => {
      const hh = Math.floor(d / 60);
      const mm = Math.floor(d % 60);
      return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
    }));

  // Update circles
  const c = dots.selectAll("circle").data(filteredData, d => d.commit);

  c.join(
    enter => enter.append("circle")
                  .attr("cx", d => x(d.date))
                  .attr("cy", d => y(d.minutes))
                  .attr("r", 0)
                  .attr("fill", d => color(d.type))
                  .style("opacity", 0.7)
                  .on("mouseover", showTooltip)
                  .on("mouseout", hideTooltip)
                  .transition().duration(300)
                  .attr("r", d => radius(d)),

    update => update.transition().duration(300)
                    .attr("cx", d => x(d.date))
                    .attr("cy", d => y(d.minutes))
                    .attr("r", d => radius(d)),

    exit => exit.transition().duration(300)
                .attr("r", 0)
                .remove()
  );
}

// Initial render
updateScatterPlot(data);

// Summary
const files = new Set(data.map(d => d.file));
const langs = new Set(data.map(d => d.type));
summaryBox.html(`
  <h2>Summary</h2>
  Files: ${files.size}<br>
  Languages: ${langs.size}<br>
  Total Commits: ${data.length}
`);
