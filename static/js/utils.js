// Nexus School Management System - utils.js
// Gemini 3 Pro Preview - Phase A.1 (Initial Version)
// This file will contain shared JavaScript utility functions.

"use strict";

/**
 * Displays a SweetAlert2 notification.
 * @param {string} title - The title of the alert.
 * @param {string} text - The main text/content of the alert.
 * @param {string} icon - Type of icon (e.g., 'success', 'error', 'warning', 'info', 'question').
 * @param {string} confirmButtonText - Text for the confirm button.
 */
function showNexusNotification(title, text, icon = 'info', confirmButtonText = 'OK') {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: title,
            html: text, // Use html to allow for simple HTML tags in text
            icon: icon,
            confirmButtonText: confirmButtonText,
            customClass: {
                confirmButton: 'btn btn-primary px-4 nexus-swal-button', // Custom class for BS styling
                popup: 'nexus-swal-popup',
                title: 'nexus-swal-title',
                htmlContainer: 'nexus-swal-html-container',
            },
            buttonsStyling: false // Use custom Bootstrap styling via customClass
        });
    } else {
        // Fallback to standard alert if SweetAlert2 is not loaded
        alert(title + (text ? '\n\n' + text : ''));
        console.warn('SweetAlert2 (Swal) is not defined. Using native alert as fallback.');
    }
}

/**
 * Performs an asynchronous POST request with JSON data.
 * @param {string} url - The URL to send the POST request to.
 * @param {object} data - The JavaScript object to send as JSON.
 * @returns {Promise<object>} - A promise that resolves with the JSON response.
 * @throws {Error} - Throws an error if the network response is not ok or if parsing fails.
 */
async function postData(url = '', data = {}) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    const headers = {
        'Content-Type': 'application/json',
    };
    if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });

        const responseData = await response.json(); // Attempt to parse JSON regardless of status for error messages

        if (!response.ok) {
            console.error('Fetch error (postData):', response.status, responseData);
            // Prefer error message from server response if available
            const errorMessage = responseData.error || responseData.message || `HTTP error! Status: ${response.status}`;
            throw new Error(errorMessage);
        }
        return responseData;
    } catch (error) {
        console.error('Error in postData:', error.message);
        // Show a user-friendly error, but also throw for calling code to handle
        showNexusNotification('Request Failed', `An error occurred: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Performs an asynchronous GET request.
 * @param {string} url - The URL to send the GET request to.
 * @returns {Promise<object>} - A promise that resolves with the JSON response.
 * @throws {Error} - Throws an error if the network response is not ok or if parsing fails.
 */
async function getData(url = '') {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                // CSRF typically not needed for GET, but include if your setup requires it for some reason
                // 'X-CSRFToken': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
            }
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('Fetch error (getData):', response.status, responseData);
            const errorMessage = responseData.error || responseData.message || `HTTP error! Status: ${response.status}`;
            throw new Error(errorMessage);
        }
        return responseData;
    } catch (error) {
        console.error('Error in getData:', error.message);
        showNexusNotification('Request Failed', `An error occurred: ${error.message}`, 'error');
        throw error;
    }
}


/**
 * Debounce function to limit the rate at which a function can fire.
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The delay in milliseconds.
 * @returns {Function} - The debounced function.
 */
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}
// In static/js/utils.js

// ... (existing functions like showNexusNotification, postData, getData, debounce) ...

// --- Chart.js Analytics Display Functions ---
const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Allows setting height via CSS or container
    plugins: {
        legend: {
            position: 'top',
            labels: {
                font: { family: "'Open Sans', sans-serif", size: 12 },
                color: getComputedStyle(document.documentElement).getPropertyValue('--nexus-text-secondary').trim() || '#5a6268'
            }
        },
        tooltip: {
            bodyFont: { family: "'Open Sans', sans-serif" },
            titleFont: { family: "'Poppins', sans-serif", weight: '500' },
            backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--nexus-dark').trim() || '#212529',
            titleColor: getComputedStyle(document.documentElement).getPropertyValue('--nexus-light').trim() || '#f8f9fa',
            bodyColor: getComputedStyle(document.documentElement).getPropertyValue('--nexus-light').trim() || '#f8f9fa',
            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--nexus-border-color').trim(),
            borderWidth: 1,
            padding: 10,
            boxPadding: 4
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            ticks: {
                font: { family: "'Open Sans', sans-serif", size: 11 },
                color: getComputedStyle(document.documentElement).getPropertyValue('--nexus-text-secondary').trim()
            },
            grid: {
                color: getComputedStyle(document.documentElement).getPropertyValue('--nexus-border-color').trim(),
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--nexus-text-secondary').trim()
            }
        },
        x: {
            ticks: {
                font: { family: "'Open Sans', sans-serif", size: 11 },
                color: getComputedStyle(document.documentElement).getPropertyValue('--nexus-text-secondary').trim()
            },
            grid: {
                display: false, // Often cleaner to hide x-axis grid lines for bar/line
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--nexus-text-secondary').trim()
            }
        }
    }
};

// Global storage for chart instances to prevent duplicates and allow updates/destruction
window.nexusCharts = window.nexusCharts || {};

/**
 * Fetches analytics data and renders a Chart.js chart.
 * @param {string} analyticsType - The type/endpoint for analytics data (e.g., 'attendance', 'performance').
 * @param {string} chartTitle - The title to be used for the chart legend/dataset label.
 * @param {string} chartContainerId - The ID of the div element that will contain the canvas.
 * @param {string} [defaultChartType='bar'] - The default Chart.js type (e.g., 'bar', 'line', 'pie', 'doughnut').
 */
async function fetchAndDisplayAnalytics(analyticsType, chartTitle, chartContainerId, defaultChartType = 'bar') {
    const chartContainer = document.getElementById(chartContainerId);
    const canvasId = chartContainerId.replace('Container', ''); // e.g., attendanceChart

    if (!chartContainer) {
        console.error(`Chart container #${chartContainerId} not found for analytics type: ${analyticsType}`);
        return;
    }

    // Clear previous chart or placeholder and recreate canvas
    if (window.nexusCharts[canvasId]) {
        window.nexusCharts[canvasId].destroy();
    }
    chartContainer.innerHTML = `<canvas id="${canvasId}"></canvas>`; // Recreate canvas to ensure clean state
    const canvasElement = document.getElementById(canvasId);
    if (!canvasElement) {
        console.error(`Canvas element #${canvasId} could not be created.`);
        chartContainer.innerHTML = `<div class="text-center text-danger p-3"><i class="bi bi-x-octagon-fill fs-2"></i><p>Chart canvas error.</p></div>`;
        return;
    }
    const ctx = canvasElement.getContext('2d');

    // Show loading state
    chartContainer.innerHTML = `
        <div class="content-placeholder d-flex flex-column justify-content-center align-items-center" style="min-height: 200px;">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2 text-muted small">Loading ${chartTitle}...</p>
        </div>`;

    try {
        const data = await getData(`/analytics/${analyticsType}`); // getData from utils.js

        if (data.error) {
            throw new Error(data.error);
        }

        if (data.labels && (data.data || data.datasets)) {
            let chartType = data.chart_type || defaultChartType;
            let specificChartOptions = JSON.parse(JSON.stringify(commonChartOptions)); // Deep clone

            // Type-specific option overrides
            if (chartType === 'doughnut' || chartType === 'pie') {
                specificChartOptions.plugins.legend.position = 'right';
                delete specificChartOptions.scales.x; // No x-axis for pie/doughnut
                delete specificChartOptions.scales.y; // No y-axis
            } else if (chartType === 'line') {
                 specificChartOptions.scales.x.grid.display = true; // Show x-grid for line usually
            }
            
            // Update colors in options based on current theme (if needed dynamically)
            specificChartOptions.plugins.legend.labels.color = getComputedStyle(document.documentElement).getPropertyValue('--nexus-text-secondary').trim();
            specificChartOptions.plugins.tooltip.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--nexus-dark').trim(); // Note: tooltip bg might be better fixed
            specificChartOptions.plugins.tooltip.titleColor = getComputedStyle(document.documentElement).getPropertyValue('--nexus-light').trim();
            specificChartOptions.plugins.tooltip.bodyColor = getComputedStyle(document.documentElement).getPropertyValue('--nexus-light').trim();
            specificChartOptions.plugins.tooltip.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--nexus-border-color').trim();

            if (specificChartOptions.scales.y) {
                specificChartOptions.scales.y.ticks.color = getComputedStyle(document.documentElement).getPropertyValue('--nexus-text-secondary').trim();
                specificChartOptions.scales.y.grid.color = getComputedStyle(document.documentElement).getPropertyValue('--nexus-border-color').trim();
                specificChartOptions.scales.y.grid.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--nexus-text-secondary').trim();
            }
            if (specificChartOptions.scales.x) {
                specificChartOptions.scales.x.ticks.color = getComputedStyle(document.documentElement).getPropertyValue('--nexus-text-secondary').trim();
                 specificChartOptions.scales.x.grid.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--nexus-text-secondary').trim();
            }


            // Re-clear container and add canvas back for Chart.js
            chartContainer.innerHTML = `<canvas id="${canvasId}"></canvas>`;
            const finalCtx = document.getElementById(canvasId).getContext('2d');

            // Define some color palettes for charts
            const nexusColorPalette = [
                'rgba(13, 71, 161, 0.7)',   // Primary
                'rgba(0, 121, 107, 0.7)',  // Info (Teal)
                'rgba(255, 193, 7, 0.7)',  // Warning
                'rgba(25, 118, 210, 0.7)', // Secondary
                'rgba(220, 53, 69, 0.7)',  // Danger
                'rgba(108, 117, 125, 0.7)' // Dark Grey (Bootstrap Dark)
            ];
            const nexusBorderPalette = [
                'rgb(13, 71, 161)',
                'rgb(0, 121, 107)',
                'rgb(255, 193, 7)',
                'rgb(25, 118, 210)',
                'rgb(220, 53, 69)',
                'rgb(108, 117, 125)'
            ];


            let chartDataStructure;
            if (data.datasets) { // For multi-dataset charts like grouped bar or multiple lines
                chartDataStructure = {
                    labels: data.labels,
                    datasets: data.datasets.map((dataset, index) => ({
                        ...dataset, // Spread existing dataset properties (label, data)
                        backgroundColor: dataset.backgroundColor || nexusColorPalette[index % nexusColorPalette.length],
                        borderColor: dataset.borderColor || nexusBorderPalette[index % nexusBorderPalette.length],
                        borderWidth: dataset.borderWidth || (chartType === 'line' ? 2 : 1),
                        fill: dataset.fill !== undefined ? dataset.fill : (chartType === 'line' ? false : undefined), // Line charts often not filled by default
                        tension: chartType === 'line' ? 0.4 : undefined, // Smooth lines
                    }))
                };
            } else { // For single dataset charts
                chartDataStructure = {
                    labels: data.labels,
                    datasets: [{
                        label: chartTitle,
                        data: data.data,
                        backgroundColor: (chartType === 'doughnut' || chartType === 'pie') ? nexusColorPalette : nexusColorPalette[0],
                        borderColor: (chartType === 'doughnut' || chartType === 'pie') ? '#fff' : nexusBorderPalette[0],
                        borderWidth: (chartType === 'doughnut' || chartType === 'pie') ? 2 : 1,
                        tension: chartType === 'line' ? 0.4 : undefined,
                    }]
                };
            }

            window.nexusCharts[canvasId] = new Chart(finalCtx, {
                type: chartType,
                data: chartDataStructure,
                options: specificChartOptions
            });
        } else {
            chartContainer.innerHTML = `<div class="text-center text-muted p-3 content-placeholder"><i class="bi bi-bar-chart-fill fs-2"></i><p class="mt-2">No data available to display for ${chartTitle}.</p></div>`;
        }
    } catch (error) {
        console.error(`Error loading ${analyticsType} analytics for chart ${canvasId}:`, error);
        chartContainer.innerHTML = `<div class="text-center text-danger p-3 content-placeholder"><i class="bi bi-wifi-off fs-2"></i><p class="mt-2">Could not load ${chartTitle}.</p><small>${error.message}</small></div>`;
    }
}