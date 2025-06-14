// In mergedjs.txt, this is the new app.js

/**
 * app.js - Main Application Entrypoint
 * This file initializes all core JavaScript modules for the Nexus platform.
 */
"use strict";

// --- Main Application Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded. Initializing Nexus modules...');

    // Initialize the social feed if the container exists on the page
    if (document.getElementById('globalFeedContainer')) {
        if (typeof nexusSocial !== 'undefined' && typeof nexusSocial.initGlobalFeed === 'function') {
            console.log('Found globalFeedContainer, initializing nexusSocial...');
            nexusSocial.initGlobalFeed({
                feedContainerId: 'globalFeedContainer',
                loadingPlaceholderId: 'globalFeedLoadingPlaceholder',
                emptyPlaceholderId: 'globalFeedEmptyPlaceholder',
                loadMoreTriggerId: 'loadMoreGlobalPostsTrigger',
                createFormId: 'globalPostCreateForm'
            });
        } else {
            console.error('nexusSocial object or initGlobalFeed function not found. Ensure social.js is loaded correctly before app.js.');
        }
    }
    
    // --- Other initializers can be added here in the future ---

    console.log('Nexus Platform JS Core is active.');
});