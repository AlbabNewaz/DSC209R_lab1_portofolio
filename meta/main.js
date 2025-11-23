import * as d3 from "https://cdn.skypack.dev/d3";

// ----------------------
// Data Loading & Init
// ----------------------
let commits = []; // will hold all commits
let filteredCommits = []; // commits filtered by slider

let xScale, yScale;
let commitMaxTime;

// Load CSV or JSON data
d3.json('loc.csv').then((data) => {
  commits = data.map((d) => ({
    ...d,
    datetime: new Date(d.datetime),
    hourFrac: +d.hourFrac,
    totalLines: +d.totalLines,
    id: d.id,
    lines: d.lines // array of {file, lineNumber}
  }));

  // Initial scales
  xScale = d3.scaleTime().range([50, 950]);
  yScale = d3.scaleLinear().range([10, 590]);

  commitMaxTime = d3.max(commits, (d) => d.datetime);
  filteredCommits = commits;

  renderScatterPlot(commits);
  updateFileDisplay(filteredCommits);
  setupSlider();
});

// ----------------------
// Scatterplot
// ----------------------
function renderScatterPlot(commits) {
  const svg = d3.select('#scatterplot')
    .attr('width', 1000)
    .attr('height', 600);

  xScale.domain(d3.extent(commits, (d) => d.datetime));
  yScale.domain([0, 24]);

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale);

  svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, 590)`)
    .call(xAxis);

  svg.append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(50, 0)`)
    .call(yAxis);

  svg.append('g').attr('class', 'dots');

  updateScatterPlot(commits);
}

function updateScatterPlot(commits) {
  const svg = d3.select('#scatterplot');

  xScale.domain(d3.extent(commits, (d) => d.datetime));
  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  // Update x-axis
  const xAxis = d3.axisBottom(xScale);
  svg.select('g.x-axis').call(xAxis);

  // Bind dots
  const dots = svg.select('g.dots');
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  dots.selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
    });
}

// ----------------------
// Slider Filtering
// ----------------------
function setupSlider() {
  const slider = d3.select('#commit-progress');
  const timeLabel = d3.select('#commit-time');

  slider.on('input', (event) => {
    const pct = +event.target.value / 100;
    const times = d3.extent(commits, (d) => d.datetime);
    commitMaxTime = new Date(times[0].getTime() + pct * (times[1] - times[0]));

    filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);

    updateScatterPlot(filteredCommits);
    updateFileDisplay(filteredCommits);

    const formatted = commitMaxTime.toLocaleString();
    timeLabel.text(formatted);
  });

  // Initialize label
  timeLabel.text(d3.max(commits, (d) => d.datetime).toLocaleString());
}

// ----------------------
// File Unit Visualization
// ----------------------
function updateFileDisplay(filteredCommits) {
  const lines = filteredCommits.flatMap((d) => d.lines);

  const files = d3.groups(lines, (d) => d.file)
    .map(([name, lines]) => ({ name, lines }));

  const filesContainer = d3.select('#files')
    .selectAll('div')
    .data(files, (d) => d.name)
    .join(
      (enter) => enter.append('div').call((div) => {
        div.append('dt').append('code');
        div.append('dd');
      }),
    );

  filesContainer.select('dt > code')
    .html((d) => `${d.name} <small>${d.lines.length} lines</small>`);

  filesContainer.select('dd')
    .selectAll('div')
    .data((d) => d.lines)
    .join('div')
    .attr('class', 'loc');
}
