import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

const titleEl = document.querySelector('.projects-title');
if (titleEl) {
  titleEl.textContent = `Projects (${projects.length})`;
}

let query = '';
const searchInput = document.querySelector('.searchBar');

function filterProjects(projectsArray) {
  return projectsArray.filter(p => {
    const values = Object.values(p).join(' ').toLowerCase();
    return values.includes(query.toLowerCase());
  });
}

searchInput.addEventListener('input', () => {
  query = searchInput.value;
  const filtered = filterProjects(projects);
  renderProjects(filtered, projectsContainer, 'h2');
  window.dispatchEvent(new CustomEvent('projectsFiltered', { detail: filtered }));
});
