/**
 * ui.js
 * Contains general UI enhancements for the entire application.
 */
export function initializeUI() {
    // Auto-expanding textareas from Phase 3, now modularized.
    document.querySelectorAll('.content-textarea').forEach(textarea => {
        textarea.style.height = 'auto'; // Recalculate on load
        textarea.style.height = (textarea.scrollHeight) + 'px';
        textarea.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    });

    console.log('UI Module Initialized.');
}