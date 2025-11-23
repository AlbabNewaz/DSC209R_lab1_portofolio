import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const csvPath = "./loc.csv";

let commitProgress = 100;

// SVG setup
const svg = d3.select("#scatterplot");
const width = 900;
const height = 500;
svg.attr("width", width).attr("height", height);

const margin = { top: 20, right: 20, bottom: 60, left: 80 };
const innerW = width - margin.left - margin.right;
const innerH = height - margin.top - margin.bottom;

// Main group
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
    id: d.commit, // unique key
    file: d.file,
    type: d.type,
    commit: d.commit,
    date: new Date(d.date),
    minutes: h * 60 + m + s / 60,
    lines: +d.length
  };
});

// X and Y scales
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
  return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`;
});

// Append axes groups
svg.append("g")
  .attr("transform", `translate(${margin.left},${innerH + margin.top})`)
  .attr("class", "x-axis")
  .call(xAxis);

svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`)
  .attr("class", "y-axis")
  .call(yAxis);

// Draw initial scatterplot
const dotsGroup = svg.append("g").attr("class", "dots").attr("transform", `translate(${margin.left},${margin.top})`);
updateScatterPlot(data, data);

// Slider
const slider = d3.select("#commit-progress");
const timeDisplay = d3.select("#commit-time");

// Scale to map 0-100 slider to actual dates
const timeScale = d3.scaleTime()
  .domain(d3.extent(data, d => d.date))
  .range([0, 100]);

function onTimeSliderChange() {
  commitProgress = +slider.node().value;
  const commitMaxTime = timeScale.invert(commitProgress);

  // Update time display
  timeDisplay.text(commitMaxTime.toLocaleString({ dateStyle: "long", timeStyle: "short" }));

  // Filter commits
  const filteredCommits = data.filter(d => d.date <= commitMaxTime);

  // Update scatterplot
  updateScatterPlot(data, filteredCommits);
}

// Attach event listener
slider.on("input", onTimeSliderChange);

// Call once to initialize display
onTimeSliderChange();

// Update scatterplot function
function updateScatterPlot(data, filteredCommits) {
  const xAxisGroup = svg.select("g.x-axis");
  xAxisGroup.selectAll("*").remove();
  xAxisGroup.call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b %d")));

  const [minLines, maxLines] = d3.extent(filteredCommits, d => d.lines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 20]);

  const sortedCommits = filteredCommits.sort((a, b) => b.lines - a.lines);

  const circles = dotsGroup.selectAll("circle")
    .data(sortedCommits, d => d.id);

  // EXIT
  circles.exit()
    .transition()
    .duration(300)
    .attr("r", 0)
    .remove();

  // UPDATE
  circles.transition()
    .duration(300)
    .attr("cx", d => x(d.date))
    .attr("cy", d => y(d.minutes))
    .attr("r", d => rScale(d.lines));

  // ENTER
  circles.enter()
    .append("circle")
    .attr("cx", d => x(d.date))
    .attr("cy", d => y(d.minutes))
    .attr("r", 0)
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
    .on("mouseout", () => tooltip.style("opacity", 0))
    .transition()
    .duration(300)
    .attr("r", d => rScale(d.lines));
}

// Optional: add summary counts
const files = new Set(data.map(d => d.file));
const langs = new Set(data.map(d => d.type));
summaryBox.html(`
  <h2>Summary</h2>
  Files: ${files.size}<br>
  Languages: ${langs.size}<br>
  Total Commits: ${data.length}
`);
