import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
let query = '';
let selectedYear = null;

function filterProjects() {
  return projects.filter(p => {
    const matchesQuery = Object.values(p).join(' ').toLowerCase().includes(query.toLowerCase());
    const matchesYear = selectedYear ? p.year === selectedYear : true;
    return matchesQuery && matchesYear;
  });
}

function renderFilteredProjects() {
  const filtered = filterProjects();
  renderProjects(filtered, projectsContainer, 'h2');
  const titleEl = document.querySelector('.projects-title');
  if (titleEl) titleEl.textContent = `Projects (${filtered.length})`;
}

const searchInput = document.querySelector('.searchBar');
searchInput.addEventListener('input', (e) => {
  query = e.target.value;
  renderFilteredProjects();
  renderPieChart();
});

function renderPieChart() {
  const svg = d3.select('#projects-pie-plot');
  const legend = d3.select('.legend');
  svg.selectAll('*').remove();
  legend.selectAll('*').remove();

  const dataProjects = filterProjects();
  const yearCounts = d3.rollups(dataProjects, v => v.length, d => d.year).sort((a,b)=>a[0]-b[0]);
  const data = yearCounts.map(([year, value]) => ({ year, value }));

  const yearColors = {};
  const allYears = [...new Set(projects.map(p => p.year))].sort();
  const colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(allYears);
  allYears.forEach(y => yearColors[y] = colorScale(y));

  const pie = d3.pie().value(d => d.value);
  const arcs = pie(data);

  const arcGen = d3.arc().innerRadius(0).outerRadius(100);
  const g = svg.append('g').attr('transform', 'translate(0,0)');

  g.selectAll('path')
    .data(arcs)
    .enter()
    .append('path')
    .attr('d', arcGen)
    .attr('fill', d => yearColors[d.data.year])
    .attr('stroke', 'white')
    .attr('stroke-width', 0.5)
    .style('cursor', 'pointer')
    .classed('selected', d => d.data.year === selectedYear)
    .on('click', (event, d) => {
      selectedYear = selectedYear === d.data.year ? null : d.data.year;
      renderFilteredProjects();
      renderPieChart();
    });

  legend.selectAll('li')
    .data(data)
    .enter()
    .append('li')
    .attr('style', d => `--color:${yearColors[d.year]}`)
    .classed('selected', d => d.year === selectedYear)
    .html(d => `<span class="swatch"></span> ${d.year} <em>(${d.value})</em>`);
}

renderFilteredProjects();
renderPieChart();
