import * as d3 from "https://cdn.skypack.dev/d3@7";

// Load CSV
const csvPath = "loc.csv";
let commits = [];

d3.csv(csvPath, d3.autoType).then((data) => {
  commits = data;
  commits.forEach(d => {
    d.datetime = new Date(d.datetime);
    d.hourFrac = d.datetime.getHours() + d.datetime.getMinutes()/60;
  });

  updateSlider();
  updateScatterPlot(commits);
  updateFileDisplay(commits);
});

// -----------------------------
// Slider logic
// -----------------------------
const slider = d3.select("#commit-progress");
const timeLabel = d3.select("#commit-time");

slider.on("input", () => {
  const percent = +slider.node().value;
  const cutoff = new Date(
    d3.quantile(
      commits.map(d => d.datetime).sort(d3.ascending),
      percent / 100
    )
  );

  const filteredCommits = commits.filter(d => d.datetime <= cutoff);
  timeLabel.text(d3.timeFormat("%Y-%m-%d %H:%M")(cutoff));

  updateScatterPlot(filteredCommits);
  updateFileDisplay(filteredCommits);
});

function updateSlider() {
  const latest = d3.max(commits, d => d.datetime);
  timeLabel.text(d3.timeFormat("%Y-%m-%d %H:%M")(latest));
}

// -----------------------------
// Scatterplot
// -----------------------------
const svg = d3.select("#scatterplot");
const margin = { top: 20, right: 20, bottom: 30, left: 50 };
let width = 900 - margin.left - margin.right;
let height = 400 - margin.top - margin.bottom;

svg
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom);

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

const xScale = d3.scaleTime().range([0, width]);
const yScale = d3.scaleLinear().range([height, 0]);

const xAxis = g.append("g").attr("transform", `translate(0,${height})`);
const yAxis = g.append("g");

const dotsGroup = g.append("g").attr("class", "dots");

function updateScatterPlot(filteredCommits) {
  xScale.domain(d3.extent(filteredCommits, d => d.datetime));
  yScale.domain([0, 24]);

  xAxis.call(d3.axisBottom(xScale));
  yAxis.call(d3.axisLeft(yScale));

  const dots = dotsGroup.selectAll("circle").data(filteredCommits, d => d.commit);

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
      .attr("cy", d => yScale(d.hourFrac)),
    exit => exit.transition().duration(300).attr("r", 0).remove()
  );
}

// -----------------------------
// File/unit visualization
// -----------------------------
function updateFileDisplay(filteredCommits) {
  // Flatten lines per commit
  const lines = filteredCommits.flatMap(d => ({
    file: d.file,
    commit: d.commit
  }));

  const files = d3.groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }));

  const filesContainer = d3.select("#files")
    .selectAll("div")
    .data(files, d => d.name)
    .join(
      enter => enter.append("div")
        .call(div => {
          div.append("dt").append("code");
          div.append("dd");
        })
    );

  // Update file name and count
  filesContainer.select("dt > code")
    .html(d => `${d.name} <small>${d.lines.length} lines</small>`);

  // Add one div per line
  filesContainer.select("dd")
    .selectAll("div")
    .data(d => d.lines)
    .join("div")
    .attr("class", "loc");
}
