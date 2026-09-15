(function () {
    const root = document.documentElement;
    const toggleBtn = document.getElementById('themeToggle');
 
    // Some browsers block localStorage on file:// pages and throw here —
    // wrap it so a storage failure can't stop the toggle from working.
    function getSavedTheme() {
        try {
            return localStorage.getItem('theme');
        } catch (err) {
            return null;
        }
    }
 
    function saveTheme(value) {
        try {
            localStorage.setItem('theme', value);
        } catch (err) {
            // ignore — theme just won't persist across reloads
        }
    }
 
    const saved = getSavedTheme();
    if (saved === 'dark') {
        root.setAttribute('data-theme', 'dark');
        toggleBtn.textContent = 'Light mode';
    }
 
    toggleBtn.addEventListener('click', function () {
        const isDark = root.getAttribute('data-theme') === 'dark';
 
        if (isDark) {
            root.removeAttribute('data-theme');
            toggleBtn.textContent = 'Dark mode';
            saveTheme('light');
        } else {
            root.setAttribute('data-theme', 'dark');
            toggleBtn.textContent = 'Light mode';
            saveTheme('dark');
        }
    });
})();