import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import scrollama from "https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm";

const csvPath = "./loc.csv";

/* -------------------------
   SVG / layout setup
   -------------------------*/
const svgEl = d3.select("#scatterplot");
const container = document.getElementById("scatterplot");
const width = Math.max(700, container.clientWidth || 900);
const height = container.clientHeight || 420;

svgEl.attr("viewBox", `0 0 ${width} ${height}`).attr("preserveAspectRatio", "xMidYMid meet");

const margin = { top: 20, right: 20, bottom: 60, left: 70 };
const innerW = width - margin.left - margin.right;
const innerH = height - margin.top - margin.bottom;

const svg = svgEl.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

/* Tooltip */
const tooltip = d3
  .select("body")
  .append("div")
  .attr("id", "tooltip")
  .style("position", "absolute")
  .style("pointer-events", "none")
  .style("opacity", 0)
  .style("background", "#fff")
  .style("padding", "8px")
  .style("border", "1px solid #ccc")
  .style("border-radius", "4px");

/* containers */
const axesG = svg.append("g");
const dotsG = svg.append("g").attr("class", "dots");
const brushG = svg.append("g").attr("class", "brush");

/* controls */
const slider = d3.select("#commit-progress");
const timeLabel = d3.select("#commit-time");
const typeSelect = d3.select("#type-select");
const summaryBox = d3.select("#summary");
const selectionBox = d3.select("#selection-summary");
const legendBox = d3.select("#legend");
const filesDl = d3.select("#files");
const story = d3.select("#scatter-story");

/* scales (will set domains after data load) */
let xScale = d3.scaleTime().range([0, innerW]);
let yScale = d3.scaleLinear().range([innerH, 0]);
const color = d3.scaleOrdinal(d3.schemeTableau10);
let rScale = d3.scaleSqrt().range([3, 20]);

/* state */
let allCommits = []; // array of commit objects {id, datetime, totalLines, hourFrac, lines: [{file,type,length,minutes}]}
let processTimeScale; // 0-100 -> date
let commitMaxTime = null;
let filteredCommits = [];

/* -------------------------
   Data load & processing
   -------------------------*/
const raw = await d3.csv(csvPath, (d) => {
  // expected csv: file,type,commit,date,time,length
  const [hh, mm, ss] = (d.time || "00:00:00").split(":").map(Number);
  // parse date; combine with time to datetime
  const datePart = d.date || "";
  const dt = new Date(`${datePart}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss || 0).padStart(2, "0")}`);
  const minutes = hh * 60 + mm + (ss || 0) / 60;
  return {
    file: d.file,
    type: d.type || "other",
    commit: d.commit,
    date: d.date,
    time: d.time,
    datetime: dt,
    minutes: minutes,
    lines: +d.length || 1
  };
});

// group rows by commit id
const grouped = d3.groups(raw, (d) => d.commit);

allCommits = grouped.map(([id, rows]) => {
  const datetime = d3.min(rows, (r) => r.datetime); // commit time
  const lines = rows.map((r) => ({ file: r.file, type: r.type, length: r.lines, minutes: r.minutes }));
  const totalLines = d3.sum(lines, (l) => l.length);
  // hour fraction 0..1 for y-scale (we keep using minutes but normalized option)
  const hourFrac = d3.mean(rows, (r) => (r.minutes) / (24 * 60));
  return { id, datetime, totalLines, hourFrac, lines, rows };
});

// sort commits by datetime ascending
allCommits.sort((a, b) => d3.ascending(a.datetime, b.datetime));

/* initialize scales using full data */
xScale.domain(d3.extent(allCommits, (d) => d.datetime)).nice();
yScale.domain([0, 24 * 60]).nice(); // minutes in day
rScale.domain(d3.extent(allCommits, (d) => d.totalLines)).nice();

processTimeScale = d3.scaleTime().domain(d3.extent(allCommits, (d) => d.datetime)).range([0, 100]);

// populate type dropdown and legend
const types = Array.from(new Set(raw.map((d) => d.type || "other")));
typeSelect.selectAll("option.type")
  .data(["all", ...types])
  .join("option")
  .attr("value", d => d)
  .text(d => (d === "all" ? "All types" : d));

legendBox.selectAll("item")
  .data(types)
  .join("div")
  .style("display", "flex")
  .style("align-items", "center")
  .style("gap", "0.5rem")
  .html(d => `<span class="swatch" style="--color:${color(d)}; width:1em;height:1em;display:inline-block;border-radius:.25rem;"></span><span style="font-size:0.95rem">${d}</span>`);

/* initial filtered set (everything) */
commitMaxTime = d3.max(allCommits, (d) => d.datetime);
filteredCommits = allCommits.slice();

/* -------------------------
   Render initial axes and elements
   -------------------------*/
const xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(d3.timeFormat("%b %d"));
const yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(d => {
  const hh = Math.floor(d / 60);
  const mm = Math.floor(d % 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
});

// create axis groups with classes so update can replace
axesG.append("g").attr("class", "x-axis").attr("transform", `translate(0, ${innerH})`).call(xAxis)
  .append("text")
  .attr("x", innerW / 2)
  .attr("y", 40)
  .attr("fill", "black")
  .attr("text-anchor", "middle")
  .attr("font-size", "14px")
  .text("Date");

axesG.append("g").attr("class", "y-axis").call(yAxis)
  .append("text")
  .attr("transform", `rotate(-90)`)
  .attr("x", -innerH / 2)
  .attr("y", -50)
  .attr("fill", "black")
  .attr("text-anchor", "middle")
  .attr("font-size", "14px")
  .text("Time (HH:MM)");

/* CSS starting style for newly entered circles:
   We set an inline style attr --r and let CSS handle r transition.
*/
svg.append("style").text(`
  .dots circle {
    transition: cx 400ms ease, cy 400ms ease, r 300ms ease, opacity 200ms ease;
    stroke: rgba(0,0,0,0.06);
  }
  .dots circle.starting {
    r: 0px;
    opacity: 0;
  }
`);

/* draw initial circles */
function renderScatterPlot(commits) {
  // domain updates for x and r
  xScale.domain(d3.extent(commits, d => d.datetime)).nice();
  rScale.domain(d3.extent(commits, d => d.totalLines)).nice();

  // update axes
  axesG.select("g.x-axis").transition().duration(300).call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.timeFormat("%b %d")));
  axesG.select("g.y-axis").transition().duration(300).call(yAxis);

  // keyed join by id so circles are stable
  const circles = dotsG.selectAll("circle").data(commits, d => d.id);

  // exit
  circles.exit().transition().duration(250).attr("r", 0).style("opacity", 0).remove();

  // enter
  const enter = circles.enter().append("circle")
    .attr("class", "starting")
    .attr("cx", d => xScale(d.datetime))
    .attr("cy", d => yScale(d3.mean(d.rows, r => r.minutes)))
    .attr("r", 0)
    .attr("fill", d => color(d.lines[0]?.type ?? "other"))
    .attr("opacity", 0);

  // merge + transition to target attributes
  enter.merge(circles)
    .transition()
    .duration(400)
    .attr("cx", d => xScale(d.datetime))
    .attr("cy", d => yScale(d3.mean(d.rows, r => r.minutes)))
    .attr("r", d => rScale(d.totalLines))
    .attr("fill", d => color(d.lines[0]?.type ?? "other"))
    .style("opacity", 0.85)
    .on("end", function() { d3.select(this).classed("starting", false); });

  // attach interaction
  dotsG.selectAll("circle")
    .on("mouseenter", (event, d) => {
      tooltip
        .style("opacity", 1)
        .html(`
          <strong>Commit:</strong> ${d.id}<br/>
          <strong>Date:</strong> ${d.datetime.toLocaleString()}<br/>
          <strong>Lines changed:</strong> ${d.totalLines}<br/>
          <strong>Files:</strong> ${d.lines.length}
        `);
    })
    .on("mousemove", (event) => {
      tooltip.style("left", (event.pageX + 12) + "px").style("top", (event.pageY + 12) + "px");
    })
    .on("mouseleave", () => tooltip.style("opacity", 0));
}

/* -------------------------
   Update function (used by slider & scroll)
   -------------------------*/
function updateScatterPlot(commits) {
  // sort commits for consistent order (largest on top)
  const sorted = commits.slice().sort((a, b) => d3.descending(a.totalLines, b.totalLines));

  // domain updates
  xScale.domain(d3.extent(sorted, d => d.datetime)).nice();
  rScale.domain(d3.extent(sorted, d => d.totalLines)).nice();

  // update axes
  axesG.select("g.x-axis").transition().duration(300).call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.timeFormat("%b %d")));
  axesG.select("g.y-axis").transition().duration(300).call(yAxis);

  // join
  const circles = dotsG.selectAll("circle").data(sorted, d => d.id);

  // exit
  circles.exit().transition().duration(250).attr("r", 0).style("opacity", 0).remove();

  // enter
  const enter = circles.enter().append("circle")
    .attr("class", "starting")
    .attr("cx", d => xScale(d.datetime))
    .attr("cy", d => yScale(d3.mean(d.rows, r => r.minutes)))
    .attr("r", 0)
    .attr("fill", d => color(d.lines[0]?.type ?? "other"))
    .attr("opacity", 0);

  // update + merge
  enter.merge(circles)
    .transition()
    .duration(400)
    .attr("cx", d => xScale(d.datetime)
