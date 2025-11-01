import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const titleEl = document.querySelector('.projects-title');

renderProjects(projects, projectsContainer, 'h2');
if (titleEl && projects) {
  titleEl.textContent = `Projects (${projects.length})`;
}

let query = '';
const searchBar = document.createElement('input');
searchBar.type = 'search';
searchBar.placeholder = '🔍 Search projects…';
searchBar.className = 'searchBar';
titleEl.insertAdjacentElement('afterend', searchBar);

searchBar.addEventListener('input', (event) => {
  query = event.target.value.toLowerCase();
  const filteredProjects = projects.filter(project => {
    const values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query);
  });
  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(filteredProjects);
});

function renderPieChart(projectsGiven) {
  const rolledData = d3.rollups(
    projectsGiven,
    v => v.length,
    d => d.year
  );

  const data = rolledData.map(([year, count]) => ({ value: count, label: year }));

  const svg = d3.select('#projects-pie-plot');
  svg.selectAll('path').remove();

  const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  const pieGenerator = d3.pie().value(d => d.value);
  const arcs = pieGenerator(data);

  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  arcs.forEach((d, i) => {
    svg.append('path')
      .attr('d', arcGenerator(d))
      .attr('fill', colors(i))
      .style('cursor', 'pointer')
      .on('click', () => {
        const filteredByYear = projects.filter(p => p.year === d.data.label);
        const finalFiltered = filteredByYear.filter(project => {
          const values = Object.values(project).join('\n').toLowerCase();
          return values.includes(query);
        });

        renderProjects(finalFiltered, projectsContainer, 'h2');
        renderPieChart(finalFiltered);
      });
  });

  const legend = d3.select('.legend');
  legend.selectAll('li').remove();
  data.forEach((d, i) => {
    legend.append('li')
      .attr('style', `--color:${colors(i)}`)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });
}

renderPieChart(projects);

const categories = {};
projects.forEach(p => {
  const category = p.category || 'Other';
  categories[category] = (categories[category] || 0) + 1;
});

const labels = Object.keys(categories);
const data = Object.values(categories);

const ctx = document.getElementById('projectsChart');
if (ctx) {
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Projects by Category',
        data: data,
        backgroundColor: 'oklch(70% 30% 320 / 0.8)',
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Projects by Category' }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}
