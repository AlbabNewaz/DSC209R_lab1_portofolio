import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { projects, projectsContainer } from './projects.js';

let query = '';
let selectedYear = null;

const searchBar = document.createElement('input');
searchBar.type = 'search';
searchBar.className = 'searchBar';
searchBar.placeholder = '🔍 Search projects…';
searchBar.setAttribute('aria-label', 'Search projects');
document.body.insertBefore(searchBar, projectsContainer);

const svg = d3.select('#projects-pie-plot');
const legendContainer = d3.select('.legend');

const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
const colors = d3.scaleOrdinal(d3.schemeTableau10);

function getFilteredProjects() {
  return projects.filter(project => {
    const values = Object.values(project).join('\n').toLowerCase();
    const matchesQuery = values.includes(query.toLowerCase());
    const matchesYear = selectedYear ? project.year === selectedYear : true;
    return matchesQuery && matchesYear;
  });
}

function renderPieChart(projectsGiven) {
  const rolledData = d3.rollups(
    projectsGiven,
    v => v.length,
    d => d.year
  );

  const data = rolledData.map(([year, count]) => ({ label: year, value: count }));

  const pie = d3.pie().value(d => d.value);
  const arcsData = pie(data);

  svg.selectAll('path').remove();
  legendContainer.selectAll('li').remove();

  arcsData.forEach((d, i) => {
    svg.append('path')
      .attr('d', arcGenerator(d))
      .attr('fill', colors(i))
      .attr('class', selectedYear === d.data.label ? 'selected' : null)
      .style('cursor', 'pointer')
      .on('click', () => {
        selectedYear = selectedYear === d.data.label ? null : d.data.label;
        updateVisualization();
      });
    
    legendContainer.append('li')
      .attr('style', `--color:${colors(i)}`)
      .attr('class', selectedYear === d.data.label ? 'selected' : null)
      .html(`<span class="swatch"></span> ${d.data.label} <em>(${d.data.value})</em>`)
      .on('click', () => {
        selectedYear = selectedYear === d.data.label ? null : d.data.label;
        updateVisualization();
      });
  });
}

function updateVisualization() {
  const filteredProjects = getFilteredProjects();
  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(filteredProjects);
}

searchBar.addEventListener('input', (event) => {
  query = event.target.value;
  updateVisualization();
});

updateVisualization();
