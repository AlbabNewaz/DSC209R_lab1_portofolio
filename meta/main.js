import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import scrollama from "https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm";

const csvPath = "./loc.csv";

// --- 1. SETUP DIMENSIONS & SVG ---
const width = 1000;
const height = 600;
const margin = { top: 10, right: 10, bottom: 30, left: 20 };

const usableArea = {
  top: margin.top,
  right: width - margin.right,
  bottom: height - margin.bottom,
  left: margin.left,
  width: width - margin.left - margin.right,
  height: height - margin.top - margin.bottom,
};

const svg = d3.select("#scatterplot")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .style("overflow", "visible");

// --- 2. SCALES & TOOLTIP ---
// We initialize scales, but domains will be set after data loads
const xScale = d3.scaleTime().range([usableArea.left, usableArea.right]);
const yScale = d3.scaleLinear().range([usableArea.bottom, usableArea.top]);
const rScale = d3.scaleSqrt().range([2, 30]);
const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

const tooltip = d3.select("body").append("div")
  .attr("id", "tooltip")
  .style("opacity", 0)
  .style("position", "absolute")
  .style("background", "white")
  .style("padding", "8px")
  .style("border", "1px solid #ccc")
  .style("border-radius", "4px")
  .style("pointer-events", "none")
  .style("z-index", 1000); // Ensure tooltip sits on top

// --- 3. DATA LOADING & PROCESSING ---
const data = await d3.csv(csvPath, (row) => {
  return {
    ...row,
    line: Number(row.line), 
    datetime: new Date(row.date), // Standardize property name
    commit: row.commit,
    type: row.type, 
  };
});

// Augment data with extra properties for visualization
data.forEach((d) => {
  // Calculate time of day (0 to 24 hours)
  d.hourFrac = d.datetime.getHours() + d.datetime.getMinutes() / 60;
  
  // Calculate lines per commit (for circle radius)
  // Note: This assumes your CSV has multiple rows per commit. 
  d.totalLines = data.filter(r => r.commit === d.commit).length;
});

// Important: Sort data chronologically for the story to make sense
data.sort((a, b) => a.datetime - b.datetime);

// --- 4. SET SCALE DOMAINS & DRAW STATIC AXES ---
xScale.domain(d3.extent(data, d => d.datetime));
yScale.domain([0, 24]); // 0 to 24 hours
rScale.domain(d3.extent(data, d => d.totalLines));

// Draw X Axis
svg.append("g")
  .attr("class", "x-axis")
  .attr("transform", `translate(0, ${usableArea.bottom})`)
  .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%b %d")));

// Draw Y Axis
svg.append("g")
  .attr("class", "y-axis")
  .attr("transform", `translate(${usableArea.left}, 0)`)
  .call(d3.axisLeft(yScale).tickFormat(d => String(d).padStart(2, '0') + ':00'));


// --- 5. UPDATE FUNCTIONS ---

/**
 * Updates the scatterplot dots based on the filtered data.
 */
function updateScatterPlot(filteredData) {
  
  // Sort data by size so small dots are on top of large ones
  const sortedData = d3.sort(filteredData, d => -d.totalLines);

  svg.selectAll("circle")
    .data(sortedData, d => d.commit + d.file) // Unique Key: Commit ID + Filename
    .join("circle")
    .attr("cx", d => xScale(d.datetime))
    .attr("cy", d => yScale(d.hourFrac))
    .attr("r", d => rScale(d.totalLines))
    .attr("fill", d => colorScale(d.type))
    .style("fill-opacity", 0.7)
    // CSS Variable for smooth radius transition
    .style("--r", d => rScale(d.totalLines)) 
    .on("mouseenter", (event, d) => {
      d3.select(event.currentTarget).style("fill-opacity", 1).style("stroke", "black");
      tooltip.style("opacity", 1)
        .html(`
          <strong>Commit:</strong> ${d.commit}<br>
          <strong>Date:</strong> ${d.datetime.toLocaleDateString()}<br>
          <strong>Time:</strong> ${d.datetime.toLocaleTimeString()}<br>
          <strong>File:</strong> ${d.file}<br>
          <strong>Lines:</strong> ${d.totalLines}
        `);
    })
    .on("mousemove", (event) => {
      tooltip.style("left", (event.pageX + 15) + "px")
             .style("top", (event.pageY + 15) + "px");
    })
    .on("mouseleave", (event) => {
      d3.select(event.currentTarget).style("fill-opacity", 0.7).style("stroke", "none");
      tooltip.style("opacity", 0);
    });
}

/**
 * Updates the Unit Visualization (File dots) based on filtered data.
 */
function updateFileVisualization(filteredData) {
  // 1. Group data by file
  let files = d3.groups(filteredData, d => d.file)
    .map(([name, lines]) => ({ name, lines }));
  
  // 2. Sort files by number of lines (descending)
  files.sort((a, b) => b.lines.length - a.lines.length);

  // 3. Bind data to the DL container
  const filesContainer = d3.select("#files")
    .selectAll("div")
    .data(files, d => d.name)
    .join("div");

  // 4. Append/Update File Names (DT)
  filesContainer.selectAll("dt")
    .data(d => [d])
    .join("dt")
    .html(d => `<code>${d.name}</code><br><small>${d.lines.length} lines</small>`);

  // 5. Append/Update DD container
  const dd = filesContainer.selectAll("dd")
    .data(d => [d])
    .join("dd");

  // 6. Append/Update the individual line dots
  dd.selectAll("div")
    .data(d => d.lines)
    .join("div")
    .attr("class", "line-dot")
    .style("--color", d => colorScale(d.type)); 
    
  // Update summary text
  d3.select("#selection-count").text(
    `${filteredData.length} lines across ${files.length} files`
  );
}


// --- 6. SCROLLYTELLING LOGIC ---

// A. Create the scroll steps (the text on the left)
const storyContainer = d3.select('#scatter-story');

// We group data by commit so we don't have 1000 steps for 1000 lines
// This creates one text block per commit
const commits = d3.groups(data, d => d.commit).map(([commit, lines]) => {
  return {
    commit,
    datetime: lines[0].datetime,
    lines: lines
  };
});

storyContainer
  .selectAll('.step')
  .data(commits)
  .join("div")
  .attr("class", "step")
  .html(d => {
    return `
      <p class="step-date">${d.datetime.toLocaleDateString(undefined, {dateStyle: "full"})}</p>
      <p>
        I made a commit affecting <strong>${d.lines.length} lines</strong>.
        ${d.lines.length > 10 ? "It was a big update!" : "Just a small tweak."}
      </p>
    `;
  });

// B. Initialize Scrollama
const scroller = scrollama();

function handleStepEnter(response) {
  // response.element is the specific <div class="step"> that scrolled into view
  const stepData = response.element.__data__;

  // Filter the MAIN data to show everything up to this commit's time
  const filteredData = data.filter(d => d.datetime <= stepData.datetime);

  // Update the charts
  updateScatterPlot(filteredData);
  updateFileVisualization(filteredData);
}

scroller
  .setup({
    container: '#scrolly-1', // The wrapper div in HTML
    step: '.step',           // The text elements
    offset: 0.6,             // Trigger when element is 60% down the screen
    debug: false             // Set to true to see the debug lines
  })
  .onStepEnter(handleStepEnter);

// Initial render (optional, to show empty state or full state)
// updateScatterPlot([]);