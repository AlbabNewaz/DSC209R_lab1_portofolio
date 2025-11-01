import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const searchInput = document.createElement('input');
searchInput.type = 'search';
searchInput.className = 'searchBar';
searchInput.placeholder = '🔍 Search projects…';
projectsContainer.parentNode.insertBefore(searchInput, projectsContainer);

let query = '';
let activeYear = null;

function filterProjects() {
  return projects.filter((p) => {
    let values = Object.values(p).join('\n').toLowerCase();
    let matchesQuery = values.includes(query.toLowerCase());
    let matchesYear = activeYear ? p.year === activeYear : true;
    return matchesQuery && matchesYear;
  });
}

function renderPieChart(projectsData) {
  const svg = d3.select('#projects-pie-plot');
  svg.selectAll('*').remove();
  const legend = d3.select('.legend');
  legend.selectAll('*').remove();

  const width = 200;
  const height = 200;
  const radius = Math.min(width, height) / 2;
  const g = svg.attr('viewBox', [-width/2, -height/2, width, height]).append('g');

  const dataMap = d3.rollups(
    projectsData,
    v => v.length,
    d => d.year
  );

  const color = d3.scaleOrdinal()
    .domain(dataMap.map(d => d[0]))
    .range(d3.schemeCategory10);

  const pie = d3.pie()
    .value(d => d[1]);

  const arcs = pie(dataMap);

  const arcGen = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);

  g.selectAll('path')
    .data(arcs)
    .join('path')
    .attr('d', arcGen)
    .attr('fill', d => color(d.data[0]))
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .on('click', (event, d) => {
      if (activeYear === d.data[0]) activeYear = null;
      else activeYear = d.data[0];
      update();
    });

  legend.selectAll('li')
    .data(dataMap)
    .join('li')
    .html(d => `<span class="swatch" style="background-color:${color(d[0])}"></span>${d[0]} (${d[1]})`)
    .on('click', (event, d) => {
      if (activeYear === d[0]) activeYear = null;
      else activeYear = d[0];
      update();
    });
}

function update() {
  const filtered = filterProjects();
  renderProjects(filtered, projectsContainer, 'h2');
  const titleEl = document.querySelector('.projects-title');
  titleEl.textContent = `Projects (${filtered.length})`;
  renderPieChart(filtered);
}

searchInput.addEventListener('input', (e) => {
  query = e.target.value;
  update();
});

update();
