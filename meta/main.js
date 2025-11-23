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

// Load CSV
const data = await d3.csv(csvPath, d => {
  const [h, m, s] = d.time.split(":").map(Number);
  return {
    id: d.commit + "_" + d.line,   // unique id per line
    file: d.file,
    type: d.type,
    commit: d.commit,
    line: +d.line,
    date: new Date(d.date),
    minutes: h * 60 + m + s / 60,
    lines: +d.length
  };
});

// Scales
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
  .attr("class", "x-axis")
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
  .attr("class", "y-axis")
  .call(yAxis)
  .append("text")
  .attr("x", -innerH / 2)
  .attr("y", -60)
  .attr("transform", "rotate(-90)")
  .attr("fill", "black")
  .attr("text-anchor", "middle")
  .attr("font-size", "14px")
  .text("Time (HH:MM)");

// Circle radius based on commit count
const commitCount = d3.rollup(data, v => v.length, d => d.commit);
const radius = d => Math.sqrt(commitCount.get(d.commit) || 1) * 2;

// Draw circles container
const dots = g.append("g").attr("class", "dots");

function renderCircles(commits) {
  const sortedCommits = d3.sort(commits, d => -d.lines);

  dots.selectAll("circle")
    .data(sortedCommits, d => d.id) // stable circles
    .join(
      enter => enter.append("circle")
                    .attr("r", 0) // start radius for transition
                    .style("transition", "r 300ms")
                    .call(enter => enter.transition().attr("r", d => radius(d))),
      update => update,
      exit => exit.remove()
    )
    .attr("cx", d => x(d.date))
    .attr("cy", d => y(d.minutes))
    .attr("fill", d => color(d.type))
    .attr("opacity", 0.8)
    .on("mouseover", (e, d) => {
      tooltip.style("opacity", 1)
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
}

// Function to update axes
function updateAxes(commits) {
  x.domain(d3.extent(commits, d => d.date));
  y.domain(d3.extent(commits, d => d.minutes));

  g.select("g.x-axis").call(xAxis);
  g.select("g.y-axis").call(yAxis);
}

// File display with unit visualization
function updateFileDisplay(filteredCommits) {
  const files = d3.groups(filteredCommits, d => d.file)
    .map(([name, lines]) => ({ name, lines }));

  const filesContainer = d3.select("#files")
    .selectAll("div")
    .data(files, d => d.name)
    .join(
      enter => enter.append("div").call(div => {
        div.append("dt").append("code");
        div.append("dd");
      }),
      update => update,
      exit => exit.remove()
    );

  // File name and total lines
  filesContainer.select("dt > code")
    .html(d => `${d.name} <small>(${d.lines.length} lines)</small>`);

  // Unit visualization: one div per line
  filesContainer.select("dd")
    .selectAll("div.loc")
    .data(d => d.lines, d => d.line)
    .join(
      enter => enter.append("div").attr("class", "loc"),
      update => update,
      exit => exit.remove()
    );
}

// Selection summary
function updateSelectionSummary(filteredCommits) {
  const lineTotals = d3.rollup(
    filteredCommits,
    v => d3.sum(v, d => d.lines),
    d => d.type
  );

  const overall = d3.sum(filteredCommits, d => d.lines);

  let html = `<div><strong>${filteredCommits.length} commits selected</strong></div><br><div style="display:flex;gap:40px;">`;

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

// Slider
const slider = d3.select("#commit-progress");
const commitTimeDisplay = d3.select("#commit-time");

slider.on("input", function() {
  const commitProgress = +this.value;
  const minDate = d3.min(data, d => d.date);
  const maxDate = d3.max(data, d => d.date);
  const commitMaxTime = new Date(minDate.getTime() + (maxDate - minDate) * (commitProgress / 100));

  commitTimeDisplay.text(commitMaxTime.toDateString());

  const filteredCommits = data.filter(d => d.date <= commitMaxTime);

  updateAxes(filteredCommits);
  renderCircles(filteredCommits);
  updateFileDisplay(filteredCommits);
  updateSelectionSummary(filteredCommits);
});

// Initial render
renderCircles(data);
updateFileDisplay(data);
updateSelectionSummary(data);

// Summary
const filesSet = new Set(data.map(d => d.file));
const langsSet = new Set(data.map(d => d.type));
summaryBox.html(`
  <h2>Summary</h2>
  Files: ${filesSet.size}<br>
  Languages: ${langsSet.size}<br>
  Total Commits: ${data.length}
`);
