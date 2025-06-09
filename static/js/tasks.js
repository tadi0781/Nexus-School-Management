/**
 * tasks.js - Handles dynamic interactions for the Task System.
 * - Assignee picker for task creation.
 * - AJAX form submissions for status updates and reviews.
 */

/**
 * Initializes a modern, unified assignee picker using TomSelect.
 * This is used on the task creation page.
 * @param {object} options - Configuration options.
 */
function initializeModernAssigneePicker(options) {
    const pickerElement = document.getElementById(options.pickerId);
    const hiddenInputElement = document.getElementById(options.hiddenInputId);

    if (!pickerElement || !hiddenInputElement) {
        console.error('Assignee picker or hidden input element not found.');
        return;
    }

    new TomSelect(pickerElement, {
        valueField: 'id',
        labelField: 'text',
        searchField: 'text',
        optgroupField: 'group',
        lockOptgroupColumns: true,
        plugins: ['remove_button', 'optgroup_columns'],
        render: {
            option: function(data, escape) {
                let icon = '';
                if (data.type === 'user') icon = '<i class="bi bi-person-fill text-primary me-2"></i>';
                else if (data.type === 'role') icon = '<i class="bi bi-people-fill text-info me-2"></i>';
                else if (data.type === 'grade_section') icon = '<i class="bi bi-easel2-fill text-success me-2"></i>';
                return `<div class="d-flex align-items-center">
                            ${icon}
                            <div>
                                <div class="text-dark">${escape(data.text)}</div>
                                <div class="text-muted small">${escape(data.subtext)}</div>
                            </div>
                        </div>`;
            },
            item: function(data, escape) {
                let icon = '';
                if (data.type === 'user') icon = '<i class="bi bi-person-fill text-primary me-2"></i>';
                else if (data.type === 'role') icon = '<i class="bi bi-people-fill text-info me-2"></i>';
                else if (data.type === 'grade_section') icon = '<i class="bi bi-easel2-fill text-success me-2"></i>';
                return `<div class="d-flex align-items-center" title="${escape(data.subtext)}">${icon}<span>${escape(data.text)}</span></div>`;
            }
        },
        load: function(query, callback) {
            if (!query.length || query.length < 2) return callback();
            // Assumes fetchData is defined in utils.js
            fetchData(`${options.searchUrl}?q=${encodeURIComponent(query)}`)
                .then(json => callback(json))
                .catch(() => callback());
        },
        onChange: function(value) {
            const selectedItems = this.items.map(itemId => {
                const itemData = this.options[itemId];
                return `${itemData.type}:${itemData.id}`;
            });
            hiddenInputElement.value = selectedItems.join(',');
        },
    });
}


// --- FIX: ADDED NEW FUNCTIONS FOR TASK DETAIL PAGE ---

/**
 * Handles the AJAX submission for a form on the task detail page.
 * @param {Event} event - The form submission event.
 * @param {string} formType - A string to describe the form for logging (e.g., 'Status Update').
 */
async function handleTaskFormSubmit(event, formType) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);

    // Disable button to prevent double-submission
    if (submitButton) submitButton.disabled = true;

    try {
        // Assumes postData helper from utils.js is available
        const data = await postData(form.action, formData);
        
        if (data.success) {
            showNexusNotification(`${formType} submitted successfully! Refreshing page...`, 'success');
            // Backend provides a redirect URL on success
            setTimeout(() => {
                window.location.href = data.redirect_url;
            }, 1000); // Small delay to let user see success message
        } else {
            // Handle form validation errors returned from the server
            const errorMsg = data.errors ? Object.values(data.errors).flat().join(' ') : 'An unknown error occurred.';
            showNexusNotification(errorMsg, 'danger');
        }
    } catch (error) {
        console.error(`Error submitting task ${formType.toLowerCase()}:`, error);
        showNexusNotification('A network or server error occurred. Please try again.', 'danger');
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}

/**
 * Initializes event listeners for the task detail page forms.
 */
function initializeTaskDetailInteractions() {
    const updateForm = document.getElementById('updateUserTaskStatusForm');
    if (updateForm) {
        updateForm.addEventListener('submit', (event) => handleTaskFormSubmit(event, 'Status Update'));
    }

    const reviewForm = document.getElementById('reviewUserTaskStatusForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', (event) => handleTaskFormSubmit(event, 'Review'));
    }
}

// Global initializer
document.addEventListener('DOMContentLoaded', () => {
    // This will run on any page, but the forms will only be found on user_task_detail.html.
    initializeTaskDetailInteractions();
    
    // Note: initializeModernAssigneePicker is called from an inline script in create.html
    // where its specific options (like searchUrl) are available from the backend.
});