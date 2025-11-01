import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const searchInput = document.querySelector('.searchBar');
const svg = d3.select('#projects-pie-plot');
const legendContainer = d3.select('.legend');

let query = '';
let selectedYear = null;
let colorScale;

function filterProjects() {
  return projects.filter(project => {
    let values = Object.values(project).join('\n').toLowerCase();
    let matchesQuery = values.includes(query.toLowerCase());
    let matchesYear = selectedYear ? project.year === selectedYear : true;
    return matchesQuery && matchesYear;
  });
}

function render() {
  const visibleProjects = filterProjects();
  renderProjects(visibleProjects, projectsContainer, 'h2');
  renderPieChart(visibleProjects);
}

function renderPieChart(projectsGiven) {
  svg.selectAll('*').remove();
  legendContainer.selectAll('*').remove();

  const rolledData = d3.rollups(
    projectsGiven,
    v => v.length,
    d => d.year
  );

  const data = rolledData.map(([year, count]) => ({ year, count }));
  const width = 200;
  const height = 200;
  const radius = Math.min(width, height) / 2;

  colorScale = d3.scaleOrdinal()
    .domain(data.map(d => d.year))
    .range(d3.schemeCategory10);

  const pie = d3.pie().value(d => d.count)(data);
  const arc = d3.arc().innerRadius(0).outerRadius(radius);

  const g = svg.attr('viewBox', '-100 -100 200 200')
               .selectAll('g')
               .data(pie)
               .join('g');

  g.append('path')
   .attr('d', arc)
   .attr('fill', d => colorScale(d.data.year))
   .attr('cursor', 'pointer')
   .on('click', (event, d) => {
     selectedYear = selectedYear === d.data.year ? null : d.data.year;
     render();
   });

  const legend = legendContainer.selectAll('li')
    .data(data)
    .join('li')
    .attr('class', d => selectedYear === d.year ? 'selected' : '')
    .on('click', (event, d) => {
      selectedYear = selectedYear === d.year ? null : d.year;
      render();
    });

  legend.append('span')
    .attr('class', 'swatch')
    .style('background-color', d => colorScale(d.year));

  legend.append('span').text(d => `${d.year} (${d.count})`);
}

searchInput.addEventListener('input', e => {
  query = e.target.value;
  render();
});

render();
