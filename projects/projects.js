import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');
const titleEl = document.querySelector(".projects-title");
if (titleEl) {
  const projects = await fetchJSON("../lib/projects.json");
  titleEl.textContent = `Projects (${projects.length})`;
}
