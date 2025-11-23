import * as d3 from "https://cdn.skypack.dev/d3@7";

// Load CSV
const commitsData = await d3.csv("loc.csv", d3.autoType);

// Group lines by commit
const commitsMap = d3.groups(commitsData, d => d.commit).map(([commit, lines]) => {
  return {
    id: commit,
    datetime: new Date(lines[0].datetime),
    hourFrac: lines[0].time.split(":")[0] + Number(lines[0].time.split(":")[1])/60, // optional
    lines: lines.map(d => ({ file: d.file, lineNumber: d.line })),
  };
});

let filteredCommits = commitsMap;

// --- SCATTERPLOT SETUP ---
const svg = d3.select("#scatterplot");
const width = 900, height = 300;
svg.attr("width", width).attr("height", height);

const xScale = d3.scaleTime()
  .domain(d3.extent(filteredCommits, d => d.datetime))
  .range([50, width-50]);

const yScale = d3.scaleLinear()
  .domain([0, 24])
  .range([height-20, 20]);

// Axes
svg.append("g").call(d3.axisBottom(xScale)).attr("transform", `translate(0,${height-20})`);
svg.append("g").call(d3.axisLeft(yScale)).attr("transform", `translate(50,0)`);

// Circles
const dots = svg.append("g").attr("class", "dots");

function renderScatterPlot() {
  dots.selectAll("circle")
    .data(filteredCommits, d => d.id)
    .join("circle")
    .attr("cx", d => xScale(d.datetime))
    .attr("cy", d => yScale(d.hourFrac))
    .attr("r", 5)
    .style("fill", "steelblue");
}

renderScatterPlot();

// --- FILE / UNIT VISUALIZATION ---
function updateFileDisplay(commits) {
  const lines = commits.flatMap(d => d.lines);
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

  filesContainer.select("dt > code")
    .text(d => `${d.name} (${d.lines.length})`);

  filesContainer.select("dd")
    .selectAll("div")
    .data(d => d.lines)
    .join("div")
    .attr("class", "loc");
}

updateFileDisplay(filteredCommits);

// --- SLIDER ---
const slider = d3.select("#commit-progress");

slider.on("input", function() {
  const maxPercent = +this.value;
  const maxIndex = Math.floor(filteredCommits.length * maxPercent / 100);
  const visibleCommits = filteredCommits.slice(0, maxIndex);
  renderScatterPlot(visibleCommits);
  updateFileDisplay(visibleCommits);
});
