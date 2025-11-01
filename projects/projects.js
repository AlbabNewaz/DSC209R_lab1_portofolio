import { fetchJSON } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const searchInput = document.querySelector('.searchBar');

let query = '';
let selectedYear = null;

// define global color mapping for all years
const allYears = [...new Set(projects.map(p => p.year))].sort();
const colors = d3.scaleOrdinal()
  .domain(allYears)
  .range(d3.schemeTableau10);

function renderProjectsWithYear(projectsToRender) {
  projectsContainer.innerHTML = '';
  projectsToRender.forEach(p => {
    const div = document.createElement('div');
    div.className = 'project';
    div.innerHTML = `
      <h2>${p.title} (${p.year})</h2>
      <img src="${p.image}" alt="${p.title}">
      <p>${p.description}</p>
    `;
    projectsContainer.appendChild(div);
  });
}

function filterProjects() {
  return projects.filter(p => {
    const matchesQuery = Object.values(p).join(' ').toLowerCase().includes(query.toLowerCase());
    const matchesYear = selectedYear ? p.year === selectedYear : true;
    return matchesQuery && matchesYear;
  });
}

async function renderPieChart(projectsToRender) {
  const svg = d3.select('#projects-pie-plot');
  const legend = d3.select('.legend');
  svg.selectAll('*').remove();
  legend.selectAll('*').remove();

  const yearCounts = d3.rollups(
    projectsToRender,
    v => v.length,
    d => d.year
  );

  const data = yearCounts.map(([year, count]) => ({ label: year, value: count }));

  const pie = d3.pie().value(d => d.value);
  const arcs = pie(data);
  const arcGen = d3.arc().innerRadius(0).outerRadius(100);

  svg.selectAll('path')
    .data(arcs)
    .enter()
    .append('path')
    .attr('d', arcGen)
    .attr('fill', d => colors(d.data.label))
    .attr('stroke', 'white')
    .attr('stroke-width', 0.5)
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      selectedYear = selectedYear === d.data.label ? null : d.data.label;
      updateProjectList();
    });

  legend.selectAll('li')
    .data(data)
    .enter()
    .append('li')
    .attr('style', d => `--color:${colors(d.label)}`)
    .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
}

function updateProjectList() {
  const filtered = filterProjects();
  renderProjectsWithYear(filtered);
  renderPieChart(filtered);
}

searchInput.addEventListener('input', event => {
  query = event.target.value;
  updateProjectList();
});

updateProjectList();
