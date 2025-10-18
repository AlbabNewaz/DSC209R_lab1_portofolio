console.log("IT'S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'Contact/', title: 'Contact' },
  { url: 'Resume/', title: 'Resume' },
  { url: 'https://github.com/AlbabNewaz', title: 'GitHub' },
];

$$('nav').forEach(nav => nav.remove());

const nav = document.createElement('nav');
document.body.prepend(nav);

const BASE_PATH =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? '/'
    : '/DSC209R_lab1_portofolio/';

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  if (!url.startsWith('http')) {
    url = BASE_PATH + url;
  }

  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;

  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add('current');
  }

  if (a.host !== location.host) {
    a.target = '_blank';
  }

  nav.append(a);
}

document.body.insertAdjacentHTML(
  'afterbegin',
  `
<label class="color-scheme">
  Theme:
  <select>
    <option value="light dark">Automatic</option>
    <option value="light">Light</option>
    <option value="dark">Dark</option>
  </select>
</label>
`
);

const colorSelect = document.querySelector('.color-scheme select');

function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-color-scheme', theme);
  } else {
    document.documentElement.removeAttribute('data-color-scheme');
  }
  localStorage.setItem('theme', theme);
}

colorSelect.value = localStorage.getItem('theme') || 'light dark';
applyTheme(colorSelect.value);

colorSelect.addEventListener('change', () => {
  applyTheme(colorSelect.value);
});
