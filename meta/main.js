import * as d3 from "https://cdn.skypack.dev/d3@7";

let data = [];
let filteredCommits = [];

// Dimensions
const margin = { top: 20, right: 20, bottom: 40, left: 50 };
const width = 800 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// Parse date/time
const parseDateTime = d3.utcParse("%Y-%m-%dT%H:%M:%S%Z");

// Create scales
const xScale = d3.scaleTime().range([0, width]);
const yScale = d3.scaleLinear().range([height, 0]);

// Create axes
const xAxis = d3.select("#scatterplot")
  .append("g")
  .attr("transform", `translate(0, ${height})`);
const yAxis = d3.select("#scatterplot")
  .append("g");

// Create dots group
const svg = d3.select("#scatterplot")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

const dotsGroup = svg.append("g").attr("class", "dots");

// Load CSV
d3.csv("loc.csv").then(rawData => {
  // Prepare data
  data = rawData.map(d => ({
    file: d.file,
    line: +d.line,
    commit: d.commit,
    author: d.author,
    datetime: parseDateTime(d.datetime),
    hourFrac: +d.time.split(":")[0] + (+d.time.split(":")[1] / 60),
    lines: [{ file: d.file, line: +d.line }]
  }));

  // Initial filter: all commits
  filteredCommits = data;
  updateScatterPlot(filteredCommits);
  updateFileDisplay(filteredCommits);

  // Setup slider
  const slider = d3.select("#commit-progress");
  slider.on("input", function () {
    const percent = +this.value;
    const cutoffIndex = Math.floor(data.length * (percent / 100));
    filteredCommits = data.slice(0, cutoffIndex);
    updateScatterPlot(filteredCommits);
    updateFileDisplay(filteredCommits);

    // Update time display
    const lastCommit = filteredCommits[filteredCommits.length - 1];
    if (lastCommit) {
      d3.select("#commit-time").text(lastCommit.datetime.toISOString());
    } else {
      d3.select("#commit-time").text("");
    }
  });
});

// -------------------------
// Scatterplot update
// -------------------------
function updateScatterPlot(filteredCommits) {
  const sortedCommits = filteredCommits.slice().sort((a, b) => d3.ascending(a.datetime, b.datetime));

  // Update scales
  xScale.domain(d3.extent(sortedCommits, d => d.datetime));
  yScale.domain([0, 24]);

  xAxis.call(d3.axisBottom(xScale));
  yAxis.call(d3.axisLeft(yScale));

  // Join circles using commit id as key
  const dots = dotsGroup.selectAll("circle").data(sortedCommits, d => d.commit);

  dots.join(
    enter => enter.append("circle")
      .attr("cx", d => xScale(d.datetime))
      .attr("cy", d => yScale(d.hourFrac))
      .attr("r", 0)
      .style("fill", "steelblue")
      .transition()
      .duration(300)
      .attr("r", 4),
    update => update.transition().duration(300)
      .attr("cx", d => xScale(d.datetime))
      .attr("cy", d => yScale(d.hourFrac))
      .attr("r", 4),
    exit => exit.transition().duration(300).attr("r", 0).remove()
  );
}

// -------------------------
// File list / unit visualization
// -------------------------
function updateFileDisplay(filteredCommits) {
  const lines = filteredCommits.flatMap(d => d.lines);
  const files = d3.groups(lines, d => d.file).map(([name, lines]) => ({ name, lines }));

  const filesContainer = d3.select("#files")
    .selectAll("div")
    .data(files, d => d.name)
    .join(
      enter => enter.append("div").call(div => {
        div.append("dt").append("code");
        div.append("dd");
      })
    );

  // Update dt with file name and total lines
  filesContainer.select("dt > code")
    .text(d => `${d.name} (total: ${d.lines.length})`);

  // Update dd with one div per line
  const lineDivs = filesContainer.select("dd")
    .selectAll("div")
    .data(d => d.lines, d => d.line);

  lineDivs.join(
    enter => enter.append("div").attr("class", "loc"),
    update => update,
    exit => exit.remove()
  );
}
