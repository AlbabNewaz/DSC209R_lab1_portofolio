import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

async function init() {
  // Load CSV
  const data = await d3.csv("loc.csv", d3.autoType);

  // Group by commit
  const commitsMap = d3.groups(data, d => d.commit).map(([id, lines]) => ({
    id,
    datetime: new Date(lines[0].datetime),
    hourFrac: +lines[0].time.split(":")[0] + lines[0].time.split(":")[1] / 60,
    lines
  }));

  let filteredCommits = commitsMap;

  // --- Scatterplot setup ---
  const svg = d3.select("#scatterplot");
  const width = 900, height = 300;
  svg.attr("width", width).attr("height", height);

  const xScale = d3.scaleTime()
    .domain(d3.extent(filteredCommits, d => d.datetime))
    .range([50, width - 50]);

  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - 20, 20]);

  // Axes
  svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height-20})`)
    .call(d3.axisBottom(xScale));

  svg.append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(50,0)`)
    .call(d3.axisLeft(yScale));

  // Circles container
  const dots = svg.append("g").attr("class", "dots");

  function renderScatterPlot(commits) {
    dots.selectAll("circle")
      .data(commits, d => d.id)
      .join(
        enter => enter.append("circle")
          .attr("cx", d => xScale(d.datetime))
          .attr("cy", d => yScale(d.hourFrac))
          .attr("r", 0)
          .style("fill", "steelblue")
          .call(enter => enter.transition().attr("r", 5)),
        update => update.transition().attr("cx", d => xScale(d.datetime))
                               .attr("cy", d => yScale(d.hourFrac)),
        exit => exit.transition().attr("r", 0).remove()
      );
  }

  // --- File / unit visualization ---
  function updateFileDisplay(commits) {
    const lines = commits.flatMap(d => d.lines);
    const files = d3.groups(lines, d => d.file).map(([name, lines]) => ({ name, lines }));

    const filesContainer = d3.select("#files")
      .selectAll("div.file")
      .data(files, d => d.name)
      .join(enter => {
        const div = enter.append("div").attr("class", "file");
        div.append("dt").append("code");
        div.append("dd");
        return div;
      });

    filesContainer.select("dt > code")
      .text(d => `${d.name} (${d.lines.length})`);

    filesContainer.select("dd")
      .selectAll("div.loc")
      .data(d => d.lines)
      .join("div")
      .attr("class", "loc");
  }

  // --- Initial render ---
  renderScatterPlot(filteredCommits);
  updateFileDisplay(filteredCommits);

  // --- Slider interaction ---
  d3.select("#commit-progress").on("input", function() {
    const percent = +this.value;
    const maxIndex = Math.floor(filteredCommits.length * percent / 100);
    const visible = filteredCommits.slice(0, maxIndex);
    renderScatterPlot(visible);
    updateFileDisplay(visible);

    // Update time label
    if (visible.length > 0) {
      d3.select("#commit-time").text(visible[visible.length - 1].datetime.toLocaleString());
    } else {
      d3.select("#commit-time").text("");
    }
  });
}

init();
