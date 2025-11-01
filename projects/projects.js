import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const searchInput = document.querySelector('.searchBar');
const titleEl = document.querySelector('.projects-title');
const ctx = document.getElementById('projectsChart');
let chart;

function updateTitle(list) {
  if (titleEl) titleEl.textContent = `Projects (${list.length})`;
}

function renderChart(list) {
  const categories = {};
  list.forEach(p => {
    const category = p.category || 'Other';
    categories[category] = (categories[category] || 0) + 1;
  });
  const labels = Object.keys(categories);
  const data = Object.values(categories);
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Projects by Category', data, backgroundColor: 'oklch(70% 30% 320 / 0.8)'}] },
    options: { responsive: true, plugins: { legend: { display: false }, title: { display: true, text: 'Projects by Category' } }, scales: { y: { beginAtZero: true } } }
  });
}

function filterProjects(query) {
  return projects.filter(project => {
    const values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });
}

function renderFilteredProjects() {
  const filtered = filterProjects(searchInput.value);
  renderProjects(filtered, projectsContainer, 'h2');
  renderChart(filtered);
  updateTitle(filtered);
}

searchInput.addEventListener('input', renderFilteredProjects);

renderFilteredProjects();
