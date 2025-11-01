import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');
const titleEl = document.querySelector('.projects-title');
if (titleEl && projects) {
  titleEl.textContent = `Projects (${projects.length})`;
}
const categories = {};
projects.forEach(p => {
  const category = p.category || 'Other';
  categories[category] = (categories[category] || 0) + 1;
});

const labels = Object.keys(categories);
const data = Object.values(categories);

const ctx = document.getElementById('projectsChart');

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
