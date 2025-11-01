import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const titleEl = document.querySelector('.projects-title');

let query = '';

renderProjects(projects, projectsContainer, 'h2');
if (titleEl) titleEl.textContent = `Projects (${projects.length})`;

const searchInput = document.createElement('input');
searchInput.type = 'search';
searchInput.className = 'searchBar';
searchInput.placeholder = '🔍 Search projects…';
searchInput.setAttribute('aria-label', 'Search projects');
projectsContainer.parentNode.insertBefore(searchInput, projectsContainer);

searchInput.addEventListener('input', (event) => {
  query = event.target.value.toLowerCase();
  const filteredProjects = projects.filter((project) => {
    const values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query);
  });

  renderProjects(filteredProjects, projectsContainer, 'h2');
  if (titleEl) titleEl.textContent = `Projects (${filteredProjects.length})`;

  renderPieChart(filteredProjects);
});

// --- Step 5: Pie chart ---
const svg = d3.select('#projects-pie-plot');
const legendEl = d3.select('.legend');
const radius = 50;

function renderPieChart(projectsGiven) {
  svg.selectAll('*').remove();
  legendEl.selectAll('*').remove();

  // Roll up projects by category
  const categories = {};
  projectsGiven.forEach((p) => {
    const cat = p.category || 'Other';
    categories[cat] = (categories[cat] || 0) + 1;
  });

  const data = Object.entries(categories).map(([key, value]) => ({
    category: key,
    count: value,
  }));

  const pie = d3.pie().value((d) => d.count);
  const arcs = pie(data);

  const arcGenerator = d3.arc().innerRadius(0).outerRadius(radius);

  svg.attr('viewBox', '-50 -50 100 100');

  svg
    .selectAll('path')
    .data(arcs)
    .join('path')
    .attr('d', arcGenerator)
    .attr('fill', (d, i) => d3.schemeCategory10[i % 10])
    .attr('stroke', '#fff')
    .attr('stroke-width', 1)
    .on('mouseover', function (event, d) {
      d3.select(this).transition().attr('opacity', 0.7);
      const filtered = projectsGiven.filter((p) => (p.category || 'Other') === d.data.category);
      renderProjects(filtered, projectsContainer, 'h2');
    })
    .on('mouseout', function () {
      d3.select(this).transition().attr('opacity', 1);
      const filteredProjects = projects.filter((project) => {
        const values = Object.values(project).join('\n').toLowerCase();
        return values.includes(query);
      });
      renderProjects(filteredProjects, projectsContainer, 'h2');
    });

  const legendItems = legendEl.selectAll('li').data(data).join('li');
  legendItems
    .append('span')
    .attr('class', 'swatch')
    .style('background-color', (d, i) => d3.schemeCategory10[i % 10]);
  legendItems.append('span').text((d) => `${d.category} (${d.count})`);
}

renderPieChart(projects);
