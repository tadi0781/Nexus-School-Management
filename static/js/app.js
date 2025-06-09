/**
 * app.js - Main Application Entrypoint
 * This file imports and initializes all core JavaScript modules for the Nexus platform.
 */
"use strict";

// Import core modules
import { initializeGlobalUI } from './modules/ui.js';
import { initializeNexusSocial } from './modules/social.js';
import { initializeNexusTasks } from './modules/tasks.js';
import { initializeNexusRequests }from './modules/requests.js';
import { initializeNexusTalentClub } from './modules/talent_club.js';
import { initializeNexusRealtime } from './modules/socket_client.js';

// --- Main Application Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded. Initializing Nexus modules...');

    // 1. Initialize global UI components (tooltips, modals, datepickers, etc.)
    initializeGlobalUI();

    // 2. Initialize the real-time connection manager
    initializeNexusRealtime();
    
    // 3. Initialize feature-specific modules based on the current page
    // This ensures we only run the JS needed for the page the user is on.
    
    // FIX: This now explicitly calls the correct initializers for each feature.
    if (document.getElementById('globalFeedContainer')) {
        initializeNexusSocial('globalFeedContainer');
    }
    if (document.getElementById('taskCreateForm') || document.getElementById('userTaskDetailContainer')) {
        initializeNexusTasks();
    }
    if (document.querySelector('#submitRequestForm, #reviewRequestForm')) {
        initializeNexusRequests();
    }
    if (document.querySelector('.talent-club-page-marker')) { // Add this class to TC page body tags
        initializeNexusTalentClub();
    }
    
    console.log('Nexus Platform JS Core is active.');
});