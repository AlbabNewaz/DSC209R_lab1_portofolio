import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const searchInput = document.querySelector('.searchBar');

let query = '';
let selectedYear = null;

function filterProjects() {
  return projects.filter((p) => {
    const matchesQuery = Object.values(p).join('\n').toLowerCase().includes(query.toLowerCase());
    const matchesYear = selectedYear ? p.year === selectedYear : true;
    return matchesQuery && matchesYear;
  });
}

function updateProjectList() {
  const filtered = filterProjects();
  renderProjects(filtered, projectsContainer, 'h2');
}

function renderPieChart() {
  const filtered = projects.filter(p => Object.values(p).join('\n').toLowerCase().includes(query.toLowerCase()));
  const svg = d3.select('#projects-pie-plot');
  const legend = d3.select('.legend');
  svg.selectAll('*').remove();
  legend.selectAll('*').remove();

  const width = 200;
  const height = 200;
  const radius = Math.min(width, height) / 2;

  const yearCounts = Array.from(d3.rollup(filtered, v => v.length, d => d.year), ([year, value]) => ({ year, value }));
  const colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(yearCounts.map(d => d.year));
  const pieGen = d3.pie().value(d => d.value);
  const arcs = pieGen(yearCounts);
  const arcGen = d3.arc().innerRadius(0).outerRadius(radius);

  svg.attr('viewBox', [-radius, -radius, radius*2, radius*2]);

  svg.selectAll('path')
    .data(arcs)
    .enter()
    .append('path')
    .attr('d', arcGen)
    .attr('fill', d => colorScale(d.data.year))
    .attr('stroke', 'white')
    .attr('stroke-width', 0.5)
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      selectedYear = selectedYear === d.data.year ? null : d.data.year;
      updateProjectList();
      renderPieChart();
    });

  legend.selectAll('li')
    .data(yearCounts)
    .enter()
    .append('li')
    .attr('style', d => `--color:${colorScale(d.year)}`)
    .classed('selected', d => d.year === selectedYear)
    .text(d => `${d.year} (${d.value})`)
    .on('click', (event, d) => {
      selectedYear = selectedYear === d.year ? null : d.year;
      updateProjectList();
      renderPieChart();
    });
}

searchInput.addEventListener('input', (e) => {
  query = e.target.value;
  updateProjectList();
  renderPieChart();
});

updateProjectList();
renderPieChart();
