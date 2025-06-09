"use strict";

/**
 * ===================================================================
 * main.js - Main Application Initialization Script
 * ===================================================================
 * This script runs after the DOM is fully loaded. It's responsible for
 * initializing all core UI components for the Nexus application.
 */
document.addEventListener('DOMContentLoaded', function () {
    console.log('Nexus Core JS Initialized. Version 2.0');

    // --- Call all initialization functions here ---
    
    initializeBootstrapComponents();
    initializeFlatpickr();
    initializeTomSelect();
    setupThemeSwitcher();
    setupSidebarToggle();
    
    // Check for and initialize optional components from other files
    if (typeof initializeAllFilePondInputs === 'function') {
        initializeAllFilePondInputs();
    }
    if (typeof initializeFilePreviewModal === 'function') {
        initializeFilePreviewModal();
    }
});


/**
 * Initializes standard Bootstrap components like Tooltips and Popovers.
 */
function initializeBootstrapComponents() {
    // Tooltips
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    // Popovers
    const popoverTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.forEach(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
}


/**
 * Initializes all elements with Flatpickr classes.
 */
function initializeFlatpickr() {
    flatpickr(".flatpickr-date", {
        altInput: true,
        altFormat: "F j, Y",
        dateFormat: "Y-m-d",
        allowInput: true
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


/**
 * Initializes all elements with the 'tom-select' class.
 */
function initializeTomSelect() {
    const tomSelectElements = document.querySelectorAll('.tom-select');
    tomSelectElements.forEach(el => {
        new TomSelect(el, {
            create: el.dataset.allowCreate === 'true',
            persist: false,
        });
    });
}


/**
 * Manages light/dark mode based on user preference and local storage.
 */
function setupThemeSwitcher() {
    const themeSwitcherButton = document.getElementById('themeSwitcher');
    if (!themeSwitcherButton) return;

    const htmlElement = document.documentElement;

    const getPreferredTheme = () => {
        const storedTheme = localStorage.getItem('nexus-theme');
        if (storedTheme) {
            return storedTheme;
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const updateSwitcherIcon = (theme) => {
        const icon = themeSwitcherButton.querySelector('i.bi');
        if (icon) {
            icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
        }
    };
    
    const setTheme = (theme) => {
        htmlElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('nexus-theme', theme);
        updateSwitcherIcon(theme);
    };

    // Set the initial theme on page load
    setTheme(getPreferredTheme());

    // Add click listener to the button
    themeSwitcherButton.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    });
}


/**
 * Manages the collapsible sidebar, its state, and the mobile overlay/backdrop.
 */
function setupSidebarToggle() {
    const sidebar = document.getElementById('sidebarMenu');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarCloseButton = document.getElementById('sidebarCloseButton');
    const backdrop = document.querySelector('.sidebar-backdrop');
    const body = document.body;
    const SIDEBAR_COLLAPSED_KEY = 'nexusSidebarCollapsedState';

    if (!sidebar || !sidebarToggle) return;

    const setSidebarState = (isCollapsed) => {
        if (isCollapsed) {
            body.classList.add('sidebar-is-collapsed');
        } else {
            body.classList.remove('sidebar-is-collapsed');
        }
        sidebarToggle.setAttribute('aria-expanded', !isCollapsed);
    };

    const toggleSidebar = () => {
        const isCurrentlyCollapsed = body.classList.contains('sidebar-is-collapsed');
        setSidebarState(!isCurrentlyCollapsed);
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(!isCurrentlyCollapsed));
    };

    // Event Listeners
    sidebarToggle.addEventListener('click', (e) => {
        e.preventDefault();
        toggleSidebar();
    });

    if (sidebarCloseButton) {
        sidebarCloseButton.addEventListener('click', () => {
            setSidebarState(true);
            localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'true');
        });
    }
    
    if (backdrop) {
        backdrop.addEventListener('click', () => {
            setSidebarState(true);
            localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'true');
        });
    }

    // Set initial state on page load without animation flash
    const storedState = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    const initiallyCollapsed = (storedState !== null) 
        ? (storedState === 'true') 
        : (window.innerWidth < 768); // Default to collapsed on mobile

    body.style.transition = 'none'; // Temporarily disable transitions on body
    setSidebarState(initiallyCollapsed);
    
    setTimeout(() => {
        body.style.transition = ''; // Re-enable transitions
    }, 50);
}