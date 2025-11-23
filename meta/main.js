import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const csvPath = "./loc.csv";

// -----------------------------
// SVG SETUP
// -----------------------------
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

// -----------------------------
// LOAD CSV
// -----------------------------
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

// -----------------------------
// SLIDER SETUP
// -----------------------------
const commitTimeScale = d3.scaleTime()
  .domain(d3.extent(data, d => d.date))
  .range([0, 100]);

let commitProgress = 100;
let commitMaxTime = commitTimeScale.invert(commitProgress);

const slider = document.getElementById("commit-progress");
const timeDisplay = document.getElementById("commit-time");

function updateTimeDisplay() {
  commitProgress = +slider.value;
  commitMaxTime = commitTimeScale.invert(commitProgress);

  timeDisplay.textContent = commitMaxTime.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short"
  });
}

// Initialize display
updateTimeDisplay();

// Update on slider move
slider.addEventListener("input", updateTimeDisplay);

// -----------------------------
// SCALES & AXES
// -----------------------------
const commitCount = d3.rollup(data, v => v.length, d => d.commit);
const radius = d => Math.sqrt(commitCount.get(d.commit) || 1) * 2;

const x = d3.scaleTime()
  .domain(d3.extent(data, d => d.date))
  .range([0, innerW])
  .nice();

const y = d3.scaleLinear()
  .domain(d3.extent(data, d => d.minutes))
  .range([innerH, 0])
  .nice();

const color = d3.scaleOrdinal(d3.schemeTableau10);

// Axes
const xAxis = d3.axisBottom(x).tickFormat(d3.timeFormat("%b %d"));
const yAxis = d3.axisLeft(y).tickFormat(d => {
  const hh = Math.floor(d / 60);
  const mm = Math.floor(d % 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
});

g.append("g")
  .attr("transform", `translate(0,${innerH})`)
  .call(xAxis)
  .append("text")
  .attr("x", innerW / 2)
  .attr("y", 40)
  .attr("fill", "black")
  .attr("text-anchor", "middle")
  .attr("font-size", "14px")
  .text("Date");

g.append("g")
  .call(yAxis)
  .append("text")
  .attr("x", -innerH / 2)
  .attr("y", -60)
  .attr("transform", "rotate(-90)")
  .attr("fill", "black")
  .attr("text-anchor", "middle")
  .attr("font-size", "14px")
  .text("Time (HH:MM)");

// -----------------------------
// DRAW CIRCLES
// -----------------------------
const circles = g.selectAll("circle")
  .data(data)
  .enter()
  .append("circle")
  .attr("cx", d => x(d.date))
  .attr("cy", d => y(d.minutes))
  .attr("r", d => radius(d))
  .attr("fill", d => color(d.type))
  .attr("opacity", 0.8)
  .on("mouseover", (e, d) => {
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
      .style("left", e.pageX + 15 + "px")
      .style("top", e.pageY + "px");
  })
  .on("mouseout", () => tooltip.style("opacity", 0));

// -----------------------------
// BRUSH
// -----------------------------
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

// -----------------------------
// SUMMARY
// -----------------------------
const files = new Set(data.map(d => d.file));
const langs = new Set(data.map(d => d.type));

summaryBox.html(`
  <h2>Summary</h2>
  Files: ${files.size}<br>
  Languages: ${langs.size}<br>
  Total Commits: ${data.length}
`);
