// Nexus School Management System - main.js
// Gemini 3 Pro Preview - Phase A.1 (Initial Version)

"use strict";

document.addEventListener('DOMContentLoaded', function () {
    console.log('Nexus Core JS Initialized. Version 1.0');

    // Initialize Bootstrap Components
    initializeBootstrapComponents();

    // Initialize Flatpickr instances
    initializeFlatpickr();

    // Initialize TomSelect instances (if any on the page)
    initializeTomSelect();

    // Setup Theme Switcher
    setupThemeSwitcher();

    // Sidebar toggle listener (if using a custom button beyond Bootstrap's navbar-toggler)
    // setupCustomSidebarToggle();

    // Add CSRF token to AJAX requests if using jQuery (example)
    // setupJQueryAjaxCsrf();

    // Display a welcome message (example using custom alert)
    // showNexusNotification('Welcome to Nexus!', 'System is initializing...', 'success');
});

function initializeBootstrapComponents() {
    // Tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Toasts (if used, example initialization)
    // const toastElList = [].slice.call(document.querySelectorAll('.toast'));
    // toastElList.map(function (toastEl) {
    //   return new bootstrap.Toast(toastEl, { /* options */ });
    // });
}

function initializeFlatpickr() {
    flatpickr(".flatpickr-date", {
        altInput: true,
        altFormat: "F j, Y",
        dateFormat: "Y-m-d",
        allowInput: true // Allows manual typing
    });

    flatpickr(".flatpickr-datetime", {
        enableTime: true,
        altInput: true,
        altFormat: "F j, Y H:i",
        dateFormat: "Y-m-d H:i",
        time_24hr: true,
        allowInput: true
    });

    flatpickr(".flatpickr-time", {
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        time_24hr: true,
        allowInput: true
    });
}

function initializeTomSelect() {
    // Generic TomSelect initialization for elements with class 'tom-select'
    // Specific configurations can be done per-page or via data-attributes
    const tomSelectElements = document.querySelectorAll('.tom-select');
    tomSelectElements.forEach(el => {
        new TomSelect(el, {
            create: el.dataset.allowCreate === 'true', // Allow creating new options if data-attribute is set
            // Add other common options or allow data-attributes to configure
            // persist: false, // Example
        });
    });
}


function setupThemeSwitcher() {
    const themeSwitcherButton = document.getElementById('themeSwitcher');
    const htmlElement = document.documentElement;

    const getPreferredTheme = () => {
        const storedTheme = localStorage.getItem('nexus-theme');
        if (storedTheme) {
            return storedTheme;
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const setTheme = (theme) => {
        if (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            htmlElement.setAttribute('data-bs-theme', 'dark');
        } else {
            htmlElement.setAttribute('data-bs-theme', theme);
        }
        updateSwitcherIcon(theme);
    };

    const updateSwitcherIcon = (theme) => {
        if (themeSwitcherButton) {
            const icon = themeSwitcherButton.querySelector('i.bi');
            if (icon) {
                if (theme === 'dark') {
                    icon.classList.remove('bi-moon-stars-fill');
                    icon.classList.add('bi-sun-fill');
                } else {
                    icon.classList.remove('bi-sun-fill');
                    icon.classList.add('bi-moon-stars-fill');
                }
            }
        }
    };

    const currentTheme = getPreferredTheme();
    setTheme(currentTheme); // Set initial theme

    if (themeSwitcherButton) {
        themeSwitcherButton.addEventListener('click', () => {
            let newTheme = htmlElement.getAttribute('data-bs-theme') === 'light' ? 'dark' : 'light';
            localStorage.setItem('nexus-theme', newTheme);
            setTheme(newTheme);
        });
    }

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        const storedTheme = localStorage.getItem('nexus-theme');
        if (storedTheme !== 'light' && storedTheme !== 'dark') { // Only if not manually overridden
            setTheme(getPreferredTheme());
        }
    });
}

// Optional: Custom sidebar toggle if Bootstrap's default is not sufficient
// function setupCustomSidebarToggle() {
//     const sidebar = document.getElementById('sidebarMenu');
//     const sidebarToggler = document.querySelector('[data-bs-target="#sidebarMenu"]'); // Standard Bootstrap toggler
//
//     if (sidebar && sidebarToggler) {
//         // You can listen to Bootstrap's events if more complex logic is needed
//         // sidebar.addEventListener('shown.bs.collapse', function () { ... });
//         // sidebar.addEventListener('hidden.bs.collapse', function () { ... });
//     }
// }

// CSRF setup for jQuery AJAX (if jQuery is used and Flask-WTF CSRF is active)
// function setupJQueryAjaxCsrf() {
//     if (typeof jQuery !== 'undefined') {
//         const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
//         if (csrfToken) {
//             jQuery.ajaxSetup({
//                 beforeSend: function(xhr, settings) {
//                     if (!/^(GET|HEAD|OPTIONS|TRACE)$/i.test(settings.type) && !this.crossDomain) {
//                         xhr.setRequestHeader("X-CSRFToken", csrfToken);
//                     }
//                 }
//             });
//         }
//     }
// }

// utils.js will contain helper functions like showNexusNotification, postData etc.
// For now, main.js calls them assuming they will be in utils.js or this file.
// Let's move showNexusNotification and postData to utils.js for better organization later.
// --- START: Sidebar Toggle Script ---
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebarMenu');
    const sidebarToggle = document.getElementById('sidebarToggle'); // Hamburger in navbar
    const sidebarCloseButton = document.getElementById('sidebarCloseButton'); // 'X' in sidebar
    const body = document.body;

    if (!sidebar) {
        if (sidebarToggle) {
            sidebarToggle.style.display = 'none';
        }
        return;
    }
    if (!sidebarToggle && !sidebarCloseButton && !sidebar) { // if no sidebar at all, or no toggles
        return; 
    }


    const SIDEBAR_COLLAPSED_KEY = 'nexusSidebarCollapsedState';

    function setSidebarState(isCollapsed) {
        if (!sidebar) return; // Defensive check

        if (isCollapsed) {
            sidebar.classList.add('collapsed');
            body.classList.add('sidebar-is-collapsed');
            if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', 'false');
        } else {
            sidebar.classList.remove('collapsed');
            body.classList.remove('sidebar-is-collapsed');
            if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', 'true');
        }
    }

    function toggleSidebar() {
        if (!sidebar) return; // Defensive check
        const isCurrentlyCollapsed = sidebar.classList.contains('collapsed');
        const newStateIsCollapsed = !isCurrentlyCollapsed;
        setSidebarState(newStateIsCollapsed);
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newStateIsCollapsed));
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            toggleSidebar();
        });
    }

    if (sidebarCloseButton) {
        sidebarCloseButton.addEventListener('click', function() {
            setSidebarState(true);
            localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'true');
        });
    }

    // --- Initial state on page load ---
    if (sidebar) { // Only apply initial state if sidebar exists
        let initiallyCollapsed;
        const storedState = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);

        if (storedState !== null) {
            initiallyCollapsed = (storedState === 'true');
        } else {
            // Default behavior:
            // Collapsed on small screens, visible on larger screens
            initiallyCollapsed = window.innerWidth < 768;
        }
        // Apply initial state directly without transition for the first load to prevent flash
        sidebar.style.transition = 'none'; // Disable transition temporarily
        body.style.transition = 'none'; // Disable transition on body for margin changes
        
        setSidebarState(initiallyCollapsed);
        
        // Force reflow/repaint before re-enabling transitions
        // This helps ensure the initial state is applied without animation
        void sidebar.offsetWidth; 
        void body.offsetWidth;

        // Re-enable transitions after a very short delay
        setTimeout(() => {
            sidebar.style.transition = ''; // Revert to CSS defined transition
            body.style.transition = '';    // Revert to CSS defined transition
        }, 50); // 50ms should be enough
    }
});
// --- END: Sidebar Toggle Script ---