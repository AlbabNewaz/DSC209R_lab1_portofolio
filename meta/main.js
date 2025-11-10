import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const csvPath = "./loc.csv";


const svg = d3.select("#scatterplot");
const width = 900;
const height = 500;
svg.attr("width", width).attr("height", height);

const margin = { top: 20, right: 20, bottom: 40, left: 50 };
const innerW = width - margin.left - margin.right;
const innerH = height - margin.top - margin.bottom;

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select("body")
  .append("div")
  .attr("id", "tooltip")
  .style("opacity", 0);

const summaryBox = d3.select("#summary");
const selectionBox = d3.select("#selection-summary");

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


const commitCount = d3.rollup(data, v => v.length, d => d.commit);

const radius = d => Math.sqrt(commitCount.get(d.commit) || 1);

const x = d3.scaleLinear()
  .domain(d3.extent(data, d => d.depth))
  .nice()
  .range([0, innerW]);

const y = d3.scaleLinear()
  .domain(d3.extent(data, d => d.length))
  .nice()
  .range([innerH, 0]);

const color = d3.scaleOrdinal(d3.schemeTableau10);

g.append("g")
  .attr("transform", `translate(0,${innerH})`)
  .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%a %d")));

g.append("g")
  .call(d3.axisLeft(y).tickFormat(d => {
    const h = Math.floor(d / 60);
    const m = Math.floor(d % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }));


const circles = g.selectAll("circle")
  .data(data)
  .enter()
  .append("circle")
  .attr("cx", d => x(d.depth))
  .attr("cy", d => y(d.length))
  .attr("r", d => radius(d))
  .attr("fill", d => color(d.type))
  .attr("opacity", 0.8)
  .on("mouseover", (e, d) => {
    tooltip
      .style("opacity", 1)
      .html(
        `File: ${d.file}<br>` +
        `Language: ${d.type}<br>` +
        `Depth: ${d.depth}<br>` +
        `Length: ${d.length}<br>` +
        `Commit: ${d.commit}`
      )
      .style("left", e.pageX + 15 + "px")
      .style("top", e.pageY + "px");
  })
  .on("mouseout", () => tooltip.style("opacity", 0));

const brush = d3.brush()
  .extent([[0, 0], [innerW, innerH]])
  .on("brush end", brushed);

g.append("g").call(brush);

function brushed({ selection }) {
  if (!selection) {
    circles.attr("opacity", 0.8);
    selectionBox.html("");
    return;
  }

  const [[x0, y0], [x1, y1]] = selection;

  const selected = data.filter(d => {
    const cx = x(d.date);
    const cy = y(d.minutes);
    return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
  });

  circles.attr("opacity", d => {
    const cx = x(d.date);
    const cy = y(d.minutes);
    return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1 ? 1 : 0.15;
  });

  if (!selected.length) {
    selectionBox.html("");
    return;
  }

  const lineTotals = d3.rollup(
    selected,
    v => d3.sum(v, d => d.lines),
    d => d.type
  );

  const overall = d3.sum(selected, d => d.lines);

  let html = `<div><strong>${selected.length} commits selected</strong></div><br><div style="display:flex;gap:40px;">`;

  for (const [lang, total] of lineTotals) {
    const pct = ((total / overall) * 100).toFixed(1);
    html += `
      <div>
        <div style="font-size:22px;font-weight:bold">${lang}</div>
        <div style="font-size:20px">${total} lines</div>
        <div style="font-size:18px">(${pct}%)</div>
      </div>
    `;
  }

  html += `</div>`;
  selectionBox.html(html);
}

const files = new Set(data.map(d => d.file));
const langs = new Set(data.map(d => d.type));

summaryBox.html(
  `<h2>Summary</h2>
   Files: ${files.size}<br>
   Languages: ${langs.size}<br>
   Lines: ${data.length}`
);
