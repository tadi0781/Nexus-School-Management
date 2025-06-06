// Nexus School Management System - requests.js
// Gemini 3 Pro Preview - Phase H.1 (Initial Setup)

"use strict";

document.addEventListener('DOMContentLoaded', function () {
    console.log('Nexus Requests JS Initialized.');

    // --- Review Request Form Dynamics ---
    const reviewRequestForm = document.getElementById('reviewRequestForm'); // Assuming form has this ID in review.html
    const statusSelect = reviewRequestForm ? reviewRequestForm.querySelector('select[name="status"]') : null;
    const denialReasonGroup = reviewRequestForm ? reviewRequestForm.querySelector('#denialReasonGroup') : null; // Assuming a div wrapping denial_reason
    const forwardToGroup = reviewRequestForm ? reviewRequestForm.querySelector('#forwardToUserGroup') : null; // Assuming a div wrapping forward_to_user_id

    function toggleReviewFormFields() {
        if (!statusSelect) return;

        const selectedAction = statusSelect.value;

        // Show/hide denial reason
        if (denialReasonGroup) {
            const denialTextarea = denialReasonGroup.querySelector('textarea');
            if (selectedAction === 'Denied') {
                denialReasonGroup.style.display = 'block';
                if(denialTextarea) denialTextarea.required = true;
            } else {
                denialReasonGroup.style.display = 'none';
                if(denialTextarea) denialTextarea.required = false;
            }
        }

        // Show/hide forward to user selection
        if (forwardToGroup) {
            const forwardSelect = forwardToGroup.querySelector('select');
            if (selectedAction === 'Forward') {
                forwardToGroup.style.display = 'block';
                if(forwardSelect) forwardSelect.required = true;
            } else {
                forwardToGroup.style.display = 'none';
                if(forwardSelect) forwardSelect.required = false;
            }
        }
    }

    if (statusSelect) {
        statusSelect.addEventListener('change', toggleReviewFormFields);
        toggleReviewFormFields(); // Initial call to set correct visibility
    }

    // Add other request-specific JS logic here as needed
    // e.g., AJAX form submissions for request actions if not using standard POSTs.
});

// Example of AJAX submission for a request action (conceptual, not fully wired yet)
// async function handleRequestAction(formElement, action) {
//     const submitButton = formElement.querySelector('button[type="submit"]');
//     // ... (disable button, show spinner) ...
//     const formData = new FormData(formElement);
//     // Add action to formData if not already present from button value
//     if (!formData.has('action')) {
//         formData.append('action', action);
//     }
//
//     try {
//         const response = await fetch(formElement.action, {
//             method: 'POST',
//             body: formData,
//             headers: {'X-CSRFToken': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''}
//         });
//         const responseData = await response.json();
//         if (response.ok && responseData.success) {
//             showNexusNotification('Success', responseData.message || 'Request updated.', 'success');
//             if (responseData.redirect_url) {
//                 window.location.href = responseData.redirect_url;
//             } else {
//                 // Or dynamically update parts of the page
//             }
//         } else {
//             showNexusNotification('Error', responseData.error || 'Failed to update request.', 'error');
//         }
//     } catch (error) { /* ... error handling ... */ }
//     finally { /* ... re-enable button ... */ }
// }
// Nexus School Management System - requests.js
// Gemini 3 Pro Preview - Phase H.2 (Review Form Dynamics)

"use strict";

document.addEventListener('DOMContentLoaded', function () {
    console.log('Nexus Requests JS Initialized.');

    // Initialize review request form dynamics if the form exists on the page
    if (document.getElementById('reviewRequestForm')) {
        initializeReviewRequestForm();
    }
});

/**
 * Initializes dynamic visibility for fields in the Review Request Form.
 */
function initializeReviewRequestForm() {
    const reviewForm = document.getElementById('reviewRequestForm');
    const statusSelect = reviewForm ? reviewForm.querySelector('select[name="status"]') : null;
    // Use more specific IDs for these groups if they don't have form-group wrappers
    const denialReasonGroup = reviewForm ? document.getElementById('denialReasonGroup') : null;
    const forwardToUserGroup = reviewForm ? document.getElementById('forwardToUserGroup') : null;

    if (!statusSelect) {
        // console.warn('Review request status select not found.');
        return;
    }

    function toggleReviewFormFields() {
        const selectedActionValue = statusSelect.value; // This is the 'value' of the selected option

        // Show/hide denial reason
        if (denialReasonGroup) {
            const denialTextarea = denialReasonGroup.querySelector('textarea[name="denial_reason"]');
            if (selectedActionValue === 'Denied') { // Check against the actual value from WTForms choices
                denialReasonGroup.style.display = 'block';
                if (denialTextarea) denialTextarea.required = true;
            } else {
                denialReasonGroup.style.display = 'none';
                if (denialTextarea) denialTextarea.required = false;
            }
        }

        // Show/hide forward to user selection
        if (forwardToUserGroup) {
            const forwardSelect = forwardToUserGroup.querySelector('select[name="forward_to_user_id"]');
            if (selectedActionValue === 'Forward') { // Check against the actual value
                forwardToUserGroup.style.display = 'block';
                if (forwardSelect && forwardSelect.options.length > 1) { // Check if actual users are populated
                     forwardSelect.required = true;
                } else {
                     if(forwardSelect) forwardSelect.required = false; // No users to select, so not required
                }
            } else {
                forwardToUserGroup.style.display = 'none';
                if (forwardSelect) forwardSelect.required = false;
            }
        }
    }

    statusSelect.addEventListener('change', toggleReviewFormFields);
    // Initial call to set correct visibility based on pre-selected status (if any)
    toggleReviewFormFields();
}

// Add other request-specific JS logic here as needed
// e.g., AJAX form submissions for request actions if not using standard POSTs.