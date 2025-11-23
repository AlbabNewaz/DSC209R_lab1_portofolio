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
const dotsGroup = g.append("g").attr("class", "dots");

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
const filesContainer = d3.select("#files");

// Load CSV
const data = await d3.csv(csvPath, d => {
  const [h, m, s] = d.time.split(":").map(Number);
  return {
    id: d.commit, // unique commit id
    file: d.file,
    type: d.type,
    commit: d.commit,
    date: new Date(d.date),
    minutes: h * 60 + m + s / 60,
    lines: +d.length
  };
});

// Scales
const x = d3.scaleTime().range([0, innerW]);
const y = d3.scaleLinear()
  .domain(d3.extent(data, d => d.minutes))
  .range([innerH, 0])
  .nice();

const color = d3.scaleOrdinal(d3.schemeTableau10);

// Axes
const xAxisGroup = g.append("g")
  .attr("transform", `translate(0,${innerH})`)
  .attr("class", "x-axis");

const yAxisGroup = g.append("g")
  .call(d3.axisLeft(y).tickFormat(d => {
    const hh = Math.floor(d / 60);
    const mm = Math.floor(d % 60);
    return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`;
  }))
  .attr("class", "y-axis");

yAxisGroup.append("text")
  .attr("x", -innerH / 2)
  .attr("y", -60)
  .attr("transform", "rotate(-90)")
  .attr("fill", "black")
  .attr("text-anchor", "middle")
  .attr("font-size", "14px")
  .text("Time (HH:MM)");

xAxisGroup.append("text")
  .attr("x", innerW / 2)
  .attr("y", 40)
  .attr("fill", "black")
  .attr("text-anchor", "middle")
  .attr("font-size", "14px")
  .text("Date");

// --- SLIDER SETUP ---
const slider = d3.select("#commit-progress");
const commitTimeDisplay = d3.select("#commit-time");
let filteredCommits = [...data];

function updateScatterPlot(commits) {
  // Update x scale
  x.domain(d3.extent(commits, d => d.date));
  const xAxis = d3.axisBottom(x).tickFormat(d3.timeFormat("%b %d"));
  xAxisGroup.selectAll("*:not(text)").remove(); // keep label
  xAxisGroup.call(xAxis);

  // Circle radius based on commit lines
  const minLines = d3.min(commits, d => d.lines);
  const maxLines = d3.max(commits, d => d.lines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 12]);

  // Bind data with key for stability
  const sortedCommits = commits.sort((a, b) => b.lines - a.lines);
  const circles = dotsGroup.selectAll("circle")
    .data(sortedCommits, d => d.id)
    .join(
      enter => enter.append("circle")
        .attr("cx", d => x(d.date))
        .attr("cy", d => y(d.minutes))
        .attr("r", 0)
        .attr("fill", d => color(d.type))
        .style("fill-opacity", 0.7)
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
        .call(enter => enter.transition().duration(300).attr("r", d => rScale(d.lines))),
      update => update
        .transition().duration(300)
        .attr("cx", d => x(d.date))
        .attr("cy", d => y(d.minutes))
        .attr("r", d => rScale(d.lines)),
      exit => exit.transition().duration(300).attr("r", 0).remove()
    );
}

function updateFileDisplay(commits) {
  const files = d3.groups(commits, d => d.file).map(([name, lines]) => ({ name, lines }));

  const container = filesContainer.selectAll("div")
    .data(files, d => d.name)
    .join(
      enter => enter.append("div").call(div => {
        div.append("dt").append("code");
        div.append("dd");
      })
    );

  container.select("dt > code").text(d => d.name);
  container.select("dd").text(d => `${d.lines.length} lines`);
}

// Slider change handler
function onTimeSliderChange() {
  const sliderValue = +slider.property("value");
  const minDate = d3.min(data, d => d.date);
  const maxDate = d3.max(data, d => d.date);
  const commitMaxTime = new Date(minDate.getTime() + ((maxDate - minDate) * sliderValue) / 100);

  commitTimeDisplay.text(commitMaxTime.toLocaleString());
  filteredCommits = data.filter(d => d.date <= commitMaxTime);

  updateScatterPlot(filteredCommits);
  updateFileDisplay(filteredCommits);
}

slider.on("input", onTimeSliderChange);

// Initial render
onTimeSliderChange();

// --- Summary ---
summaryBox.html(`
  <h2>Summary</h2>
  Files: ${new Set(data.map(d => d.file)).size}<br>
  Languages: ${new Set(data.map(d => d.type)).size}<br>
  Total Commits: ${data.length}
`);
