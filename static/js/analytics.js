/**
 * Nexus Actionable Intelligence Engine
 * 
 * This module provides a lightweight, event-driven analytics framework.
 * It's designed to be privacy-conscious and backend-agnostic.
 * 
 * Usage from HTML/Jinja:
 * <button onclick="NexusAnalytics.trackEvent('social_post_created', { club_id: 123, character_count: 280 })">Post</button>
 */
const NexusAnalytics = (function() {
    'use strict';

    // --- Configuration ---
    const config = {
        apiEndpoint: '/api/analytics/log', // The backend endpoint to send data to.
        enabled: true, // Master switch to enable/disable all tracking.
        debug: false, // Set to true to log events to the console instead of sending them.
        batchInterval: 5000, // Send batched events every 5 seconds.
        maxBatchSize: 20 // Send batch if it reaches this size before the interval.
    };

    let eventQueue = [];
    let isInitialized = false;

    /**
     * Sends analytics data to the backend.
     * @param {Array<Object>} batch - The batch of event objects to send.
     */
    function sendData(batch) {
        if (!config.enabled) return;
        if (batch.length === 0) return;

        if (config.debug) {
            console.log('--- Analytics Event Batch ---');
            console.table(batch);
            return;
        }

        const payload = {
            events: batch,
            client_timestamp: new Date().toISOString(),
            url: window.location.href
        };

        // Use navigator.sendBeacon for reliable background sending if available.
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            navigator.sendBeacon(config.apiEndpoint, blob);
        } else {
            // Fallback to fetch for older browsers.
            fetch(config.apiEndpoint, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
                keepalive: true // Attempt to continue request even if page unloads.
            }).catch(error => console.error('Nexus Analytics Error:', error));
        }
    }
    
    /**
     * Processes the event queue, sending batches of events.
     */
    function processQueue() {
        if (eventQueue.length > 0) {
            const batch = eventQueue.slice(0, config.maxBatchSize);
            eventQueue = eventQueue.slice(config.maxBatchSize);
            sendData(batch);
        }
    }

    /**
     * Initializes the analytics engine.
     * Sets up automatic batch processing and tracks the initial page view.
     */
    function init(userConfig = {}) {
        if (isInitialized) {
            console.warn('NexusAnalytics already initialized.');
            return;
        }

        // Merge user config with defaults.
        Object.assign(config, userConfig);

        // Start the batch processing interval.
        setInterval(processQueue, config.batchInterval);

        // Track initial page view.
        trackEvent('page_view', { 
            title: document.title,
            path: window.location.pathname
        });
        
        // Add a handler to send any remaining events when the page is closed.
        window.addEventListener('beforeunload', () => {
            processQueue();
        });

        isInitialized = true;
        if(config.debug) console.log('Nexus Analytics Initialized.');
    }

    /**
     * Public method to track a custom event.
     * @param {string} eventName - The name of the event (e.g., 'button_click').
     * @param {Object} [eventData={}] - A key-value object of custom data.
     */
    function trackEvent(eventName, eventData = {}) {
        if (!isInitialized || !config.enabled) return;

        if (typeof eventName !== 'string' || eventName.trim() === '') {
            console.error('Nexus Analytics: eventName must be a non-empty string.');
            return;
        }

        const event = {
            name: eventName,
            data: eventData,
            timestamp: new Date().toISOString()
        };

        eventQueue.push(event);

        // If the queue has reached max size, send immediately.
        if (eventQueue.length >= config.maxBatchSize) {
            processQueue();
        }
    }

    // --- Public API ---
    return {
        init: init,
        trackEvent: trackEvent
    };
})();

// Automatically initialize on script load.
// Configuration can be overridden by calling NexusAnalytics.init({ ... }) later.
NexusAnalytics.init({
    // In production, you might set debug: false
    // debug: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
});