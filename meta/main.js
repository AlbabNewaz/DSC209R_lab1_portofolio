import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const svg = d3.select("#scatterplot");
const summaryBox = d3.select("#summary");
const dropdown = d3.select("#type-select");
const filesBox = d3.select("#selection-summary");

const width = 900;
const height = 500;
const margin = { top: 20, right: 20, bottom: 50, left: 70 };

svg.attr("width", width).attr("height", height);

d3.csv("loc.csv").then(data => {
  data.forEach(d => {
    d.datetime = new Date(d.datetime);
    d.length = +d.length;
  });

  const types = [...new Set(data.map(d => d.type))];

  dropdown.selectAll("option")
    .data(["All", ...types])
    .enter()
    .append("option")
    .text(d => d);

  updateSummary(data);
  drawScatter(data);

  dropdown.on("change", () => {
    const selected = dropdown.node().value;

    const filtered =
      selected === "All" ? data : data.filter(d => d.type === selected);

    updateSummary(filtered);
    drawScatter(filtered);
  });
});


function updateSummary(rows) {
  const total = rows.length;
  const counts = d3.rollup(rows, v => v.length, d => d.type);

  let html = `Showing <b>${total}</b> commits<br><br>`;

  counts.forEach((count, type) => {
    const pct = ((count / total) * 100).toFixed(1);
    html += `${type}: <b>${pct}%</b><br>`;
  });

  summaryBox.html(html);
}


function drawScatter(rows) {
  svg.selectAll("*").remove();

  const x = d3.scaleTime()
    .domain(d3.extent(rows, d => d.datetime))
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(rows, d => d.length)])
    .range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  svg.selectAll(".point")
    .data(rows)
    .enter()
    .append("circle")
    .attr("class", "point")
    .attr("cx", d => x(d.datetime))
    .attr("cy", d => y(d.length))
    .attr("r", 5)
    .attr("fill", "steelblue")
    .on("mouseenter", (_, d) => {
      filesBox.html(`
        <b>File:</b> ${d.file}<br>
        <b>Lines changed:</b> ${d.length}<br>
        <b>Type:</b> ${d.type}<br>
        <b>Date:</b> ${d.datetime.toLocaleDateString()}
      `);
    })
    .on("mouseleave", () => {
      filesBox.html("");
    });
}
