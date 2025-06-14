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
 * Initializes all FilePond instances on the page.
 * Looks for input elements with class 'filepond-input'.
 * Assumes FilePond CSS and JS are loaded globally from base.html.
 */
function initializeAllFilePondInputs() {
    // Check if the FilePond library is available
    if (typeof FilePond === 'undefined') {
        if (document.querySelectorAll('input.filepond-input').length > 0) {
            console.warn('FilePond library is not loaded, but .filepond-input elements exist.');
        }
        return;
    }

    // Register any plugins you are using globally
    FilePond.registerPlugin(
        FilePondPluginFileValidateType,
        FilePondPluginFileValidateSize,
        FilePondPluginImagePreview
    );

    // Find all file inputs that should be enhanced
    const filePondInputs = document.querySelectorAll('input.filepond-input[type="file"]');
    
    filePondInputs.forEach(inputElement => {
        // Prevent re-initializing an already processed element
        if (inputElement.filepond) {
            return;
        }

        // Create a FilePond instance on the element
        FilePond.create(inputElement, {
            // Read options from data-attributes for flexibility
            labelIdle: `Drag & Drop your file or <span class="filepond--label-action">Browse</span>`,
            maxFileSize: inputElement.dataset.maxFileSize || '3MB',
            acceptedFileTypes: inputElement.dataset.acceptedFileTypes ? JSON.parse(inputElement.dataset.acceptedFileTypes) : null,
            // Add other global FilePond options here if needed
        });
    });

    if (filePondInputs.length > 0) {
        console.log(`Initialized ${filePondInputs.length} FilePond input(s).`);
    }
}

/**
 * Initializes and handles the global file preview modal (#viewFileModal).
 * Listens for the 'show.bs.modal' event to populate content dynamically.
 */
function initializeFilePreviewModal() {
    const modalElement = document.getElementById('viewFileModal');
    if (!modalElement) return;

    const modalTitle = modalElement.querySelector('#viewFileModalLabel');
    const modalBody = modalElement.querySelector('#viewFileModalBody');
    const downloadBtn = modalElement.querySelector('#filePreviewModalDownloadBtn');

    modalElement.addEventListener('show.bs.modal', function (event) {
        const triggerButton = event.relatedTarget;
        const fileUrl = triggerButton.dataset.fileUrl;
        const fileName = triggerButton.dataset.fileName || 'file';
        const fileMimeType = triggerButton.dataset.fileMimetype || '';

        // Reset and prepare the modal
        modalTitle.textContent = fileName;
        modalBody.innerHTML = `<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>`;
        downloadBtn.href = fileUrl;
        downloadBtn.setAttribute('download', fileName);

        // Generate the correct preview based on file type
        let previewHTML = '';
        if (fileMimeType.startsWith('image/')) {
            previewHTML = `<img src="${fileUrl}" class="img-fluid rounded" alt="Preview of ${fileName}">`;
        } else if (fileMimeType.startsWith('video/')) {
            previewHTML = `<video src="${fileUrl}" class="img-fluid rounded" controls autoplay>Your browser does not support video.</video>`;
        } else if (fileMimeType === 'application/pdf') {
            previewHTML = `<iframe src="${fileUrl}" style="width:100%; height:75vh;" frameborder="0"></iframe>`;
        } else {
            previewHTML = `<div class="p-4 text-center"><i class="bi bi-file-earmark-text-fill display-1 text-secondary"></i><p class="mt-3">No preview available for this file type.</p></div>`;
        }
        modalBody.innerHTML = previewHTML;
    });
    
    // Clear the modal body when it's hidden to stop videos/iframes from playing
    modalElement.addEventListener('hidden.bs.modal', function () {
        modalBody.innerHTML = '';
    });
    
    console.log("Global File Preview Modal Initialized.");
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
    const isFormData = data instanceof FormData;

    const headers = {};
    if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
    }
    // Don't set Content-Type for FormData; the browser does it correctly with the boundary.
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: isFormData ? data : JSON.stringify(data)
        });

        const responseData = await response.json();
        if (!response.ok) {
            // Extract a clean error message from the server's JSON response if possible
            const errorMessage = responseData.error || responseData.message || `HTTP error! Status: ${response.status}`;
            throw new Error(errorMessage);
        }
        return responseData;
    } catch (error) {
        // Re-throw the error so the calling function's .catch() block can handle it
        console.error(`Error in postData to ${url}:`, error);
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
// Add towards the end of utils.js

/**
 * Initializes all FilePond instances on the page.
 * Looks for input elements with class 'filepond-input'.
 * Assumes FilePond CSS and JS are loaded globally.
 */
function initializeAllFilePondInputs() {
    const filePondInputs = document.querySelectorAll('input.filepond-input[type="file"]');
    if (typeof FilePond === 'undefined') {
        if (filePondInputs.length > 0) {
            console.warn('FilePond library is not loaded, but .filepond-input elements exist.');
        }
        return;
    }

    // Register FilePond plugins (examples, adjust as needed for your project)
    // FilePond.registerPlugin(
    //     FilePondPluginFileValidateType,
    //     FilePondPluginImagePreview,
    //     FilePondPluginImageExifOrientation,
    //     FilePondPluginFileValidateSize,
    //     FilePondPluginImageEdit // if you plan to use it
    // );

    filePondInputs.forEach(inputElement => {
        const options = {
            labelIdle: `Drag & Drop your files or <span class="filepond--label-action">Browse</span>`,
            // Example: Set name attribute for the field if FilePond doesn't pick it up from input
            // name: inputElement.name || 'filepond',
            allowMultiple: inputElement.hasAttribute('multiple'),
            maxFiles: inputElement.hasAttribute('multiple') ? (inputElement.dataset.maxFiles || 5) : 1,
            // Server-side validation is primary, but client-side hints are good UX
            // maxFileSize: inputElement.dataset.maxFileSize || '3MB', // e.g. '3MB', '500KB'
            // acceptedFileTypes: inputElement.dataset.acceptedFileTypes ? JSON.parse(inputElement.dataset.acceptedFileTypes) : null, // e.g. ['image/png', 'image/jpeg']
            // fileValidateTypeDetectType: (source, type) => new Promise((resolve, reject) => { /* more robust type detection */ resolve(type); })
        };

        // If FilePond is used for direct server uploads (less common with WTForms, usually prepares for main form)
        // options.server = {
        //     url: '/api/filepond/upload', // Your backend endpoint for FilePond uploads
        //     process: {
        //         headers: {
        //             'X-CSRFToken': getCsrfToken() // Assuming getCsrfToken() exists in utils.js
        //         },
        //         onload: (response) => {
        //             // response is the server response for the uploaded file (e.g., its ID or path)
        //             // inputElement.value = response; // Set hidden input or actual input value
        //             return response;
        //         },
        //         onerror: (response) => {
        //             showNexusNotification('Upload Error', 'Failed to upload file.', 'error');
        //             return null;
        //         }
        //     },
        //     revert: (uniqueFileId, load, error) => {
        //         // Logic to tell the server to remove the uploaded file
        //         // postData('/api/filepond/revert', { fileId: uniqueFileId })
        //         //    .then(() => load())
        //         //    .catch(err => error('Could not revert file'));
        //         console.warn('FilePond revert not fully implemented for server.', uniqueFileId);
        //         load(); // Call load to indicate revert is done client-side
        //     }
        // };
        
        const pond = FilePond.create(inputElement, options);

        // If using FilePond with a standard form that also has other fields,
        // you typically don't use FilePond's server. Instead, FilePond prepares
        // the file data, and it gets submitted with the main form.
        // If the input has a 'name' attribute, FilePond will often use that.
        // For WTForms, ensure the input element's name matches the FileField name.
    });
    if (filePondInputs.length > 0) {
        console.log(`Initialized ${filePondInputs.length} FilePond input(s).`);
    }
}

// Assuming getCsrfToken is defined or will be:
function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
}
// In DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', function () {
    // ... other initializations ...

    if (typeof initializeFilePreviewModal === 'function') {
        initializeFilePreviewModal(); // Call the new function
    } else {
        console.warn('initializeFilePreviewModal function not found. File previews in modal will not work.');
    }
    
    // ... rest of main.js ...
});
// static/js/utils.js

// ... (existing content of utils.js) ...

/**
 * Initializes and handles the global file preview modal.
 */
function initializeFilePreviewModal() {
    const modalElement = document.getElementById('viewFileModal');
    if (!modalElement) {
        console.warn('File preview modal element #viewFileModal not found.');
        return;
    }

    const modalTitleElement = modalElement.querySelector('#filePreviewModalLabel');
    const modalBodyElement = modalElement.querySelector('#filePreviewModalBody');
    const downloadButton = modalElement.querySelector('#filePreviewModalDownloadBtn');
    const modalInfoElement = modalElement.querySelector('#filePreviewModalInfo');


    modalElement.addEventListener('show.bs.modal', function (event) {
        const triggerElement = event.relatedTarget;
        if (!triggerElement) return;

        const fileUrl = triggerElement.dataset.fileUrl;
        const fileMimetype = (triggerElement.dataset.fileMimetype || '').toLowerCase();
        const fileName = triggerElement.dataset.fileName || 'File';
        const fileSize = triggerElement.dataset.fileSize; // In bytes

        if (modalTitleElement) modalTitleElement.textContent = fileName;
        if (modalBodyElement) modalBodyElement.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading preview...</span></div>';
        if (modalInfoElement) modalInfoElement.textContent = '';


        if (downloadButton) {
            downloadButton.href = fileUrl || '#';
            downloadButton.download = fileName;
            let downloadText = 'Download';
            if (fileSize) {
                const sizeInBytes = parseInt(fileSize);
                let displaySize;
                if (sizeInBytes > 1024 * 1024) {
                    displaySize = (sizeInBytes / (1024 * 1024)).toFixed(2) + ' MB';
                } else if (sizeInBytes > 1024) {
                    displaySize = (sizeInBytes / 1024).toFixed(1) + ' KB';
                } else {
                    displaySize = sizeInBytes + ' Bytes';
                }
                // Update button text (assuming <i> is first child)
                const iconEl = downloadButton.querySelector('i.bi-download');
                if(iconEl && iconEl.nextSibling) iconEl.nextSibling.textContent = `Download (${displaySize})`;
                else downloadButton.textContent = `Download (${displaySize})`;

                if(modalInfoElement) modalInfoElement.textContent = `Type: ${fileMimetype || 'Unknown'} - Size: ${displaySize}`;

            } else {
                 const iconEl = downloadButton.querySelector('i.bi-download');
                if(iconEl && iconEl.nextSibling) iconEl.nextSibling.textContent = `Download`;
                else downloadButton.textContent = `Download`;

                if(modalInfoElement) modalInfoElement.textContent = `Type: ${fileMimetype || 'Unknown'}`;
            }
        }

        if (!fileUrl) {
            if (modalBodyElement) modalBodyElement.innerHTML = '<p class="text-danger my-auto">File URL not provided.</p>';
            return;
        }
        
        let previewHTML = '';
        if (fileMimetype.startsWith('image/')) {
            previewHTML = `<img src="${fileUrl}" class="img-fluid rounded" alt="Preview of ${fileName}" style="max-height: 75vh; object-fit: contain;">`;
        } else if (fileMimetype.startsWith('video/')) {
            previewHTML = `<video controls class="img-fluid rounded" style="max-height: 75vh; max-width: 100%;">
                               <source src="${fileUrl}" type="${fileMimetype}">
                               Your browser does not support the video tag.
                           </video>`;
        } else if (fileMimetype.startsWith('audio/')) {
            previewHTML = `<div class="my-auto w-100 px-3">
                                <p class="text-center mb-2"><i class="bi bi-file-earmark-music-fill display-3 text-secondary"></i></p>
                                <audio controls class="w-100 mt-2">
                                    <source src="${fileUrl}" type="${fileMimetype}">
                                    Your browser does not support the audio element.
                                </audio>
                           </div>`;
        } else if (fileMimetype === 'application/pdf') {
            // Using an iframe for better PDF rendering control within the modal
            previewHTML = `<iframe src="${fileUrl}" width="100%" style="min-height: 70vh; border: none;" title="PDF Preview: ${fileName}">
                               <p class="text-muted mt-3">PDF preview not available. 
                                  <a href="${fileUrl}" target="_blank" rel="noopener noreferrer" download="${fileName}">Download PDF directly</a>.
                               </p>
                           </iframe>`;
        } else {
            previewHTML = `<div class="p-4 text-center my-auto">
                               <i class="bi bi-file-earmark-text-fill display-1 text-secondary mb-3"></i>
                               <p class="lead">No direct preview available for this file type.</p>
                               <p class="text-muted">Filename: ${fileName}</p>
                           </div>`;
        }
        if (modalBodyElement) {
            // A slight delay for large PDF objects to prevent modal jumpiness
            if (fileMimetype === 'application/pdf') {
                setTimeout(() => { modalBodyElement.innerHTML = previewHTML; }, 100);
            } else {
                modalBodyElement.innerHTML = previewHTML;
            }
        }
    });

     modalElement.addEventListener('hidden.bs.modal', function () {
        // Clear body when modal is hidden to free resources (e.g. video/pdf objects)
        if (modalBodyElement) modalBodyElement.innerHTML = '<p class="text-muted">Loading preview...</p>';
        if (modalTitleElement) modalTitleElement.textContent = 'File Preview';
        if (modalInfoElement) modalInfoElement.textContent = '';
        if (downloadButton) {
            const iconEl = downloadButton.querySelector('i.bi-download');
            if(iconEl && iconEl.nextSibling) iconEl.nextSibling.textContent = `Download`;
            else downloadButton.textContent = `Download`;
            downloadButton.href = '#';
        }
    });

    console.log("Nexus File Preview Modal Initialized.");
}
// Add this function to utils.js if it's not already there.

async function deleteData(url = '') {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    const headers = {};
    if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
    }

    try {
        const response = await fetch(url, {
            method: 'DELETE', // Use the DELETE HTTP method
            headers: headers,
        });

        // Handle cases where the response might not have a body (e.g., 204 No Content)
        if (response.status === 204) {
            return { success: true };
        }

        const responseData = await response.json();
        if (!response.ok) {
            const errorMessage = responseData.error || responseData.message || `HTTP error! Status: ${response.status}`;
            throw new Error(errorMessage);
        }
        return responseData;
    } catch (error) {
        console.error(`Error in deleteData to ${url}:`, error);
        throw error;
    }
}
// Add the call to this new initializer in main.js