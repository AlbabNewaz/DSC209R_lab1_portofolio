import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const searchInput = document.querySelector('.searchBar');

let filteredProjects = [...projects];

renderProjects(filteredProjects, projectsContainer, 'h2');
renderPieChart(filteredProjects);

const titleEl = document.querySelector('.projects-title');
if (titleEl) {
  titleEl.textContent = `Projects (${filteredProjects.length})`;
}

searchInput.addEventListener('input', (event) => {
  const query = event.target.value.toLowerCase();
  filteredProjects = projects.filter(project =>
    Object.values(project).join(' ').toLowerCase().includes(query)
  );

  renderProjects(filteredProjects, projectsContainer, 'h2');

  if (titleEl) {
    titleEl.textContent = `Projects (${filteredProjects.length})`;
  }

  renderPieChart(filteredProjects);
});

function renderPieChart(projectsData) {
  const svg = d3.select('#projects-pie-plot');
  const legendEl = d3.select('.legend');

  svg.selectAll('*').remove();
  legendEl.selectAll('*').remove();

  const categories = {};
  projectsData.forEach(p => {
    const category = p.category || 'Other';
    categories[category] = (categories[category] || 0) + 1;
  });

  const data = Object.entries(categories).map(([name, value]) => ({ name, value }));
  const radius = 50;

  const pie = d3.pie().value(d => d.value)(data);
  const arc = d3.arc().innerRadius(0).outerRadius(radius);

  const color = d3.scaleOrdinal(d3.schemeTableau10).domain(Object.keys(categories));

  const g = svg.append('g').attr('transform', `translate(${radius},${radius})`);

  g.selectAll('path')
    .data(pie)
    .join('path')
    .attr('d', arc)
    .attr('fill', d => color(d.data.name))
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .on('mouseover', (event, d) => {
      const highlighted = projectsData.filter(p => (p.category || 'Other') === d.data.name);
      renderProjects(highlighted, projectsContainer, 'h2');
    })
    .on('mouseout', () => {
      renderProjects(filteredProjects, projectsContainer, 'h2');
    });

  legendEl.selectAll('li')
    .data(data)
    .join('li')
    .html(d => `<span class="swatch" style="background-color:${color(d.name)}"></span>${d.name} (${d.value})`);
}
