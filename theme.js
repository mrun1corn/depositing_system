document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
    const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');

    const setIconVisibility = () => {
        if (document.body.classList.contains('dark-mode')) {
            themeToggleLightIcon.classList.remove('d-none');
            themeToggleLightIcon.classList.add('d-block');
            themeToggleDarkIcon.classList.remove('d-block');
            themeToggleDarkIcon.classList.add('d-none');
        } else {
            themeToggleDarkIcon.classList.remove('d-none');
            themeToggleDarkIcon.classList.add('d-block');
            themeToggleLightIcon.classList.remove('d-none');
            themeToggleLightIcon.classList.add('d-block');
            themeToggleDarkIcon.classList.remove('d-block');
            themeToggleDarkIcon.classList.add('d-none');
        }
    };

    // On page load or when changing themes, best to add inline to avoid FOUC
    if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    setIconVisibility(); // Set initial icon visibility

    themeToggle.addEventListener('click', () => {
        // toggle class on body
        document.body.classList.toggle('dark-mode');

        // set localStorage
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('color-theme', 'dark');
        } else {
            localStorage.setItem('color-theme', 'light');
        }
        setIconVisibility(); // Update icon visibility after toggle
    });
});