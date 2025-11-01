import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const searchInput = document.querySelector('.searchBar');
const titleEl = document.querySelector('.projects-title');
const svg = d3.select('#projects-pie-plot');
const width = 200;
const height = 200;
const radius = Math.min(width, height) / 2;

svg.attr('viewBox', `-${width/2} -${height/2} ${width} ${height}`);

let currentYearFilter = '';

function updateTitle(list) {
  if (titleEl) titleEl.textContent = `Projects (${list.length})`;
}

function filterProjects(query = '', year = '') {
  return projects.filter(project => {
    const values = Object.values(project).join('\n').toLowerCase();
    const matchesQuery = values.includes(query.toLowerCase());
    const matchesYear = year ? project.year === year : true;
    return matchesQuery && matchesYear;
  });
}

function renderFilteredProjects(year = '') {
  const filtered = filterProjects(searchInput.value, year);
  renderProjects(filtered, projectsContainer, 'h2');
  renderPieChart(filtered);
  updateTitle(filtered);
}

function renderPieChart(list) {
  const yearCounts = {};
  list.forEach(p => {
    if (!p.year) return;
    yearCounts[p.year] = (yearCounts[p.year] || 0) + 1;
  });

  const data = Object.entries(yearCounts).map(([year, count]) => ({ year, count }));

  svg.selectAll('*').remove();

  const pie = d3.pie().value(d => d.count)(data);
  const arc = d3.arc().innerRadius(0).outerRadius(radius);
  const color = d3.scaleOrdinal(d3.schemeCategory10).domain(data.map(d => d.year));

  svg.selectAll('path')
    .data(pie)
    .enter()
    .append('path')
    .attr('d', arc)
    .attr('fill', d => color(d.data.year))
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      currentYearFilter = currentYearFilter === d.data.year ? '' : d.data.year;
      renderFilteredProjects(currentYearFilter);
    });

  const legend = d3.select('.legend');
  legend.selectAll('*').remove();
  const items = legend.selectAll('li').data(data).enter().append('li');
  items.append('span')
    .attr('class', 'swatch')
    .style('background-color', d => color(d.year));
  items.append('span')
    .text(d => `${d.year} (${d.count})`);
}

searchInput.addEventListener('input', () => renderFilteredProjects(currentYearFilter));

renderFilteredProjects();
