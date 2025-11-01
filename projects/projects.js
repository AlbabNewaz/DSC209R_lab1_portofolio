import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const searchInput = document.querySelector('.searchBar');
let query = '';
let selectedYear = null;

function filterProjects() {
  let filtered = projects.filter(p =>
    Object.values(p).join('\n').toLowerCase().includes(query.toLowerCase())
  );
  if (selectedYear) filtered = filtered.filter(p => p.year === selectedYear);
  return filtered;
}

function updateProjects() {
  const filtered = filterProjects();
  renderProjects(filtered, projectsContainer, 'h2');
  renderPieChart(filtered);
}

function renderPieChart(filteredProjects) {
  const svg = d3.select('#projects-pie-plot');
  svg.selectAll('*').remove();

  const width = 250;
  const height = 250;
  const radius = Math.min(width, height) / 2;

  svg.attr('viewBox', `0 0 ${width} ${height}`)
     .style('width', '250px')
     .style('height', '250px');

  const g = svg.append('g').attr('transform', `translate(${width/2}, ${height/2})`);

  const rolledData = d3.rollups(filteredProjects, v => v.length, d => d.year);
  if (!rolledData.length) return;
  const data = rolledData.map(([year, count]) => ({ year, count }));

  const pie = d3.pie().value(d => d.count);
  const arc = d3.arc().innerRadius(0).outerRadius(radius);
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  g.selectAll('path')
   .data(pie(data))
   .join('path')
   .attr('d', arc)
   .attr('fill', d => color(d.data.year))
   .style('cursor', 'pointer')
   .on('click', d => {
     selectedYear = d.data.year === selectedYear ? null : d.data.year;
     updateProjects();
   });

  const legend = d3.select('.legend');
  legend.selectAll('*').remove();
  legend.selectAll('li')
    .data(data)
    .join('li')
    .html(d => `<span class="swatch" style="background-color:${color(d.year)}"></span>${d.year} (${d.count})`);
}

searchInput.addEventListener('input', e => {
  query = e.target.value;
  updateProjects();
});

updateProjects();
