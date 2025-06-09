// Nexus School Management System - requests.js
// Gemini 3 Pro Preview - Phase H.1 (Initial Setup)

"use strict";

document.addEventListener('DOMContentLoaded', function () {
    console.log('Nexus Requests JS Initialized.');
    
    /**
 * A generic, reusable function to handle form submissions via AJAX.
 * It shows loading states and handles success or error responses from the server.
 * @param {HTMLFormElement} form - The form element being submitted.
 */
async function handleAjaxFormSubmit(form) {
    const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
    
    // Disable button and show a loading spinner to prevent double-clicks
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...`;
    }

    try {
        // Assumes you have a 'postData' helper function in your utils.js
        const data = await postData(form.action, new FormData(form));
        
        if (data.success) {
            // On success, the backend sends a redirect URL. The frontend's only job is to go there.
            // The success message will be flashed by the backend on the new page.
            window.location.href = data.redirect_url;
        } else {
            // If the server returns errors (e.g., validation failed), display them.
            const errorMsg = data.errors 
                ? Object.values(data.errors).flat().join('<br>') 
                : (data.error || 'An unknown error occurred. Please check the form.');
            
            // Assumes you have a 'showNexusNotification' helper in utils.js
            showNexusNotification('Submission Failed', errorMsg, 'danger');
        }
    } catch (error) {
        console.error('AJAX form submission error:', error);
        showNexusNotification('Network Error', 'Could not submit the form. Please check your connection.', 'danger');
    } finally {
        // Re-enable the button only if there was an error. On success, the page will redirect away.
        if (submitButton) {
            submitButton.disabled = false;
            // Restore the original button text based on the form ID
            const originalText = form.id === 'reviewRequestForm' ? 'Update Request' : 'Submit Request';
            submitButton.innerHTML = originalText;
        }
    }
}

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
  
    // --- Global Form Submission Handler using Event Delegation ---
    document.body.addEventListener('submit', function(event) {
        const form = event.target;
        // Check if the submitted form is one we want to handle with AJAX
        if (form.matches('#submitRequestForm, #reviewRequestForm')) {
            event.preventDefault();
            handleAjaxFormSubmit(form); // Call our new function
        }
    });

    // --- Review Request Form Field Toggling (existing logic) ---
    const reviewRequestForm = document.getElementById('reviewRequestForm');
    if (reviewRequestForm) {
        initializeReviewRequestForm(reviewRequestForm);
    }
});

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