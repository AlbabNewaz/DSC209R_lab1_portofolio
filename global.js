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

const BASE_PATH =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? '/'
    : '/DSC209R_lab1_portofolio/';

const nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  if (!url.startsWith('http')) {
    url = BASE_PATH + url;
  }

  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;

  a.classList.toggle(
    'current',
    a.host === location.host && a.pathname === location.pathname
  );

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

const select = document.querySelector('.color-scheme select');

function setColorScheme(value) {
  document.documentElement.style.setProperty('color-scheme', value);
  select.value = value;
  localStorage.setItem('colorScheme', value);
}

if ('colorScheme' in localStorage) {
  setColorScheme(localStorage.colorScheme);
}

select.addEventListener('input', (event) => {
  setColorScheme(event.target.value);
});
