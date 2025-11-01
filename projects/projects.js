import { fetchJSON, renderProjects } from '../global.js';

const projectsContainer = document.querySelector('.projects');
const searchInput = document.querySelector('.searchBar');
const svg = d3.select('#projects-pie-plot');
const legend = d3.select('.legend');

let projects = await fetchJSON('../lib/projects.json');
let query = '';
let selectedYear = null;

const yearColors = {};
const uniqueYears = [...new Set(projects.map(p => p.year))];
const colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(uniqueYears);
uniqueYears.forEach(year => (yearColors[year] = colorScale(year)));

function getFilteredProjects() {
  return projects.filter(p => {
    const text = Object.values(p).join(' ').toLowerCase();
    const matchesSearch = text.includes(query.toLowerCase());
    const matchesYear = selectedYear ? p.year === selectedYear : true;
    return matchesSearch && matchesYear;
  });
}

function renderFilteredProjects() {
  renderProjects(getFilteredProjects(), projectsContainer, 'h2');
}

function renderPieChart() {
  const filtered = getFilteredProjects();
  const yearCounts = d3.rollups(
    filtered,
    v => v.length,
    d => d.year
  );

  const data = yearCounts.map(([year, value]) => ({ year, value }));

  svg.selectAll('*').remove();
  legend.selectAll('*').remove();

  const pie = d3.pie().value(d => d.value);
  const arcs = pie(data);
  const arcGen = d3.arc().innerRadius(0).outerRadius(80);

  svg
    .selectAll('path')
    .data(arcs)
    .enter()
    .append('path')
    .attr('d', arcGen)
    .attr('fill', d => yearColors[d.data.year])
    .attr('stroke', 'white')
    .attr('stroke-width', 0.5)
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      selectedYear = selectedYear === d.data.year ? null : d.data.year;
      renderFilteredProjects();
      renderPieChart();
    });

  legend
    .selectAll('li')
    .data(data)
    .enter()
    .append('li')
    .attr('style', d => `--color:${yearColors[d.year]}`)
    .html(d => `<span class="swatch"></span> ${d.year} <em>(${d.value})</em>`)
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      selectedYear = selectedYear === d.year ? null : d.year;
      renderFilteredProjects();
      renderPieChart();
    });
}

searchInput.addEventListener('input', e => {
  query = e.target.value;
  renderFilteredProjects();
  renderPieChart();
});

renderFilteredProjects();
renderPieChart();
