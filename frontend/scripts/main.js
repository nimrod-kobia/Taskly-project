document.addEventListener("DOMContentLoaded", () => {
  fetch('components/navbar.html') // <-- your navbar file path
    .then(response => response.text())
    .then(html => {
      document.getElementById('navbar-placeholder').innerHTML = html;
    })
    .catch(err => console.error('Navbar load error:', err));
});
