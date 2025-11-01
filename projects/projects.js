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

let currentFilter = '';

function updateTitle(list) {
  if (titleEl) titleEl.textContent = `Projects (${list.length})`;
}


function filterProjects(query = '', category = '') {
  return projects.filter(project => {
    const values = Object.values(project).join('\n').toLowerCase();
    const matchesQuery = values.includes(query.toLowerCase());
    const matchesCategory = category ? (project.category || 'Other') === category : true;
    return matchesQuery && matchesCategory;
  });
}

function renderFilteredProjects(category = '') {
  const filtered = filterProjects(searchInput.value, category);
  renderProjects(filtered, projectsContainer, 'h2');
  renderPieChart(filtered);
  updateTitle(filtered);
}

function renderPieChart(list) {
  const categories = {};
  list.forEach(p => {
    const category = p.category || 'Other';
    categories[category] = (categories[category] || 0) + 1;
  });

  const data = Object.entries(categories).map(([category, count]) => ({ category, count }));

  svg.selectAll('*').remove();

  const pie = d3.pie().value(d => d.count)(data);
  const arc = d3.arc().innerRadius(0).outerRadius(radius);

  const color = d3.scaleOrdinal(d3.schemeCategory10).domain(data.map(d => d.category));

  const slices = svg.selectAll('path').data(pie).enter()
    .append('path')
    .attr('d', arc)
    .attr('fill', d => color(d.data.category))
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      currentFilter = currentFilter === d.data.category ? '' : d.data.category;
      renderFilteredProjects(currentFilter);
    });

  const legend = d3.select('.legend');
  legend.selectAll('*').remove();
  const items = legend.selectAll('li').data(data).enter().append('li');
  items.append('span')
    .attr('class', 'swatch')
    .style('background-color', d => color(d.category));
  items.append('span')
    .text(d => `${d.category} (${d.count})`);
}

searchInput.addEventListener('input', () => renderFilteredProjects(currentFilter));

renderFilteredProjects();
