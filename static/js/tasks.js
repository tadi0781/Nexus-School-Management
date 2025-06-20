/**
 * tasks.js - Handles dynamic interactions for the Task System.
 */
"use strict";

document.addEventListener('DOMContentLoaded', () => {
    // This will run on any page, but the forms will only be found on user_task_detail.html.
    if (document.getElementById('updateUserTaskStatusForm') || document.getElementById('reviewUserTaskStatusForm')) {
        initializeTaskDetailInteractions();
    }
});

/**
 * Initializes a modern, unified assignee picker using TomSelect.
 * This is called from an inline script on the task creation page.
 * @param {object} options - Configuration options {pickerId, hiddenInputId, searchUrl}.
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
        // Custom rendering for dropdown options
        render: {
            option: function(data, escape) {
                let icon = '';
                if (data.type === 'user') icon = '<i class="bi bi-person-fill text-primary me-2"></i>';
                else if (data.type === 'role') icon = '<i class="bi bi-people-fill text-info me-2"></i>';
                else if (data.type === 'grade_section') icon = '<i class="bi bi-easel2-fill text-success me-2"></i>';
                else if (data.type === 'subject') icon = '<i class="bi bi-journal-bookmark-fill text-warning me-2"></i>';
                
                return `<div class="d-flex align-items-center">${icon}<div><div class="text-dark">${escape(data.text)}</div><div class="text-muted small">${escape(data.subtext)}</div></div></div>`;
            },
            item: function(data, escape) {
                let icon = '';
                if (data.type === 'user') icon = '<i class="bi bi-person-fill me-1"></i>';
                else if (data.type === 'role') icon = '<i class="bi bi-people-fill me-1"></i>';
                else if (data.type === 'grade_section') icon = '<i class="bi bi-easel2-fill me-1"></i>';
                else if (data.type === 'subject') icon = '<i class="bi bi-journal-bookmark-fill me-1"></i>';
                
                return `<div class="d-flex align-items-center" title="${escape(data.subtext)}">${icon}<span>${escape(data.text)}</span></div>`;
            }
        },
        // Fetch data from our API as the user types
        load: function(query, callback) {
            if (!query.length || query.length < 2) return callback();
            fetch(`${options.searchUrl}?q=${encodeURIComponent(query)}`)
                .then(response => response.json())
                .then(json => callback(json))
                .catch(() => callback());
        },
        // When the selection changes, update the hidden input field
        onChange: function(value) {
            // value is an array of IDs like ["user:1", "role:teacher"]
            hiddenInputElement.value = value.join(',');
        },
    });
}

/**
 * Handles the AJAX submission for the status update and review forms.
 */
async function handleTaskFormSubmit(event, formType) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton && submitButton.disabled) return;

    const formData = new FormData(form);

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Processing...`;
    }

    try {
        const response = await fetch(form.action, { method: 'POST', body: formData, headers: {'X-Requested-With': 'XMLHttpRequest'} });
        const data = await response.json();
        
        if (data.success) {
            showNexusNotification(`${formType} submitted successfully! Refreshing...`, 'success');
            setTimeout(() => { window.location.href = data.redirect_url; }, 1000);
        } else {
            const errorMsg = data.errors ? Object.values(data.errors).flat().join('<br>') : (data.error || 'An unknown error occurred.');
            showNexusNotification('Submission Failed', errorMsg, 'danger');
            if (submitButton) submitButton.disabled = false; // Re-enable button on validation error
        }
    } catch (error) {
        console.error(`Error submitting task ${formType.toLowerCase()}:`, error);
        showNexusNotification('A network or server error occurred. Please try again.', 'danger');
        if (submitButton) submitButton.disabled = false;
    }
}

/**
 * Attaches event listeners to forms on the task detail page.
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