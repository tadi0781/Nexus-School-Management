// Nexus School Management System - notifications.js
// Gemini 3 Pro Preview - Phase D.1

"use strict";

document.addEventListener('DOMContentLoaded', function () {
    console.log('Nexus Notifications JS Initialized.');

    const markAllReadButton = document.getElementById('markAllReadBtn');
    if (markAllReadButton) {
        markAllReadButton.addEventListener('click', handleMarkAllNotificationsRead);
    }

    // Event delegation for dynamically added notification items (e.g., via AJAX polling)
    // or for items already on the page.
    document.body.addEventListener('click', function(event) {
        // Individual "Mark as Read" button on a notification item
        const markReadBtn = event.target.closest('.mark-notification-read-btn');
        if (markReadBtn) {
            event.preventDefault();
            const notificationId = markReadBtn.dataset.notificationId;
            if (notificationId) {
                handleMarkSingleNotificationRead(notificationId, markReadBtn.closest('.notification-item'));
            }
        }

        // Clicking on the notification item itself to mark as read (if link_url is # or primary action is AJAX)
        const notificationItem = event.target.closest('.notification-item.unread-notification');
        if (notificationItem && notificationItem.getAttribute('href') === '#') { // Only if it's a non-navigating item
            event.preventDefault();
            const notificationId = notificationItem.dataset.notificationId;
            if (notificationId) {
                handleMarkSingleNotificationRead(notificationId, notificationItem);
                // If there's a real link_url, browser navigation will happen after this.
                // If link_url is not '#', the AJAX call will still fire but browser navigates.
                // Consider if navigation should happen only *after* successful AJAX for non-'#' links.
            }
        } else if (notificationItem && notificationItem.getAttribute('href') !== '#') {
             // If it's an unread notification with a real link, mark it as read optimistically
             // before navigation or let backend handle it on page load of linked URL.
             // For now, backend handles on 'view_notifications' page load.
             // If link is clicked from dropdown, it should become read.
             const notificationId = notificationItem.dataset.notificationId;
             if (notificationId) {
                // Send a quick beacon or AJAX to mark as read without waiting for response
                // This is more advanced; for now, viewing /notifications marks them.
             }
        }
    });

    // Start polling for new notifications
    if (document.getElementById('notificationsDropdown')) { // Only poll if the dropdown exists
        startNotificationPolling();
    }
});

async function handleMarkAllNotificationsRead() {
    const button = document.getElementById('markAllReadBtn');
    if (button && button.disabled) return; // Prevent multiple clicks

    if (button) button.disabled = true;
    const originalButtonText = button ? button.innerHTML : '';
    if (button) button.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Marking...`;

    try {
        // Assumes utils.js and postData function are available
        const response = await postData('/notifications/mark-all-read'); // Backend route
        if (response.success) {
            showNexusNotification('Success', response.message || 'All notifications marked as read.', 'success');
            // Visually update all notification items on the current page
            document.querySelectorAll('.notification-item.unread-notification').forEach(item => {
                item.classList.remove('unread-notification', 'list-group-item-primary', 'bg-primary-subtle', 'border-primary-subtle');
                item.classList.add('list-group-item-light');
                item.querySelector('.text-primary.fw-bold')?.remove(); // Remove "New" badge
            });
            updateNavbarNotificationCount(0); // Update navbar count
            if (button) button.disabled = true; // Keep disabled as all are now read
        } else {
            showNexusNotification('Error', response.error || 'Failed to mark all notifications as read.', 'error');
            if (button) button.disabled = false;
        }
    } catch (error) {
        console.error("Error marking all notifications read:", error);
        showNexusNotification('Error', `An error occurred: ${error.message}`, 'error');
        if (button) button.disabled = false;
    } finally {
         if (button) button.innerHTML = originalButtonText;
         // Re-check if button should be disabled (if some items failed to mark, for example)
         const unreadCount = document.querySelectorAll('.notification-item.unread-notification').length;
         if (button) button.disabled = (unreadCount === 0);
    }
}

async function handleMarkSingleNotificationRead(notificationId, notificationElement) {
    if (!notificationElement || !notificationElement.classList.contains('unread-notification')) {
        // Already read or element not found
        return;
    }

    try {
        const response = await postData(`/notifications/mark-read/${notificationId}`);
        if (response.success) {
            if (notificationElement) {
                notificationElement.classList.remove('unread-notification', 'list-group-item-primary', 'bg-primary-subtle', 'border-primary-subtle');
                notificationElement.classList.add('list-group-item-light');
                notificationElement.querySelector('.text-primary.fw-bold')?.remove(); // Remove "New" badge
            }
            // Decrement navbar count
            const currentCount = parseInt(document.getElementById('notificationsDropdown')?.querySelector('.badge')?.textContent || '0');
            updateNavbarNotificationCount(Math.max(0, currentCount - 1));
        } else {
            // Silently fail or show small error, as this might happen in background
            console.warn(`Failed to mark notification ${notificationId} as read: ${response.error}`);
        }
    } catch (error) {
        console.error(`Error marking notification ${notificationId} read:`, error);
    }
}

let notificationPollInterval;
let lastNotificationTimestamp = Date.now(); // Initialize with current time

function startNotificationPolling(interval = 30000) { // Poll every 30 seconds
    console.log('Notification polling started.');
    // Initial fetch
    fetchNewNotifications();

    // Clear any existing interval
    if (notificationPollInterval) {
        clearInterval(notificationPollInterval);
    }
    notificationPollInterval = setInterval(fetchNewNotifications, interval);
}

function stopNotificationPolling() {
    if (notificationPollInterval) {
        clearInterval(notificationPollInterval);
        notificationPollInterval = null;
        console.log('Notification polling stopped.');
    }
}

async function fetchNewNotifications() {
    const notificationsDropdown = document.getElementById('notificationsDropdown');
    const notificationItemsContainer = document.getElementById('notification-items-container'); // In navbar dropdown

    if (!notificationsDropdown || !notificationItemsContainer) return;

    try {
        // Assumes utils.js and getData function are available
        const data = await getData(`/notifications/check-new?since=${lastNotificationTimestamp}`);

        if (data.error) {
            console.error('Error fetching new notifications:', data.error);
            // Potentially stop polling if server error persists
            return;
        }

        lastNotificationTimestamp = data.latestTimestamp || Date.now();

        if (data.newNotifications && data.newNotifications.length > 0) {
            // Prepend new notifications to the dropdown
            let hasNewUnread = false;
            data.newNotifications.forEach(htmlSnippet => {
                // Create a temporary div to parse the snippet
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = htmlSnippet.trim();
                const newNotificationElement = tempDiv.firstChild;

                if (newNotificationElement) {
                    // Check if it's actually unread before prepending
                    if (newNotificationElement.classList.contains('unread-notification')) {
                        hasNewUnread = true;
                    }
                    notificationItemsContainer.prepend(newNotificationElement);
                }
            });

            // Remove "No new notifications" placeholder if it exists and we added new items
            const placeholder = notificationItemsContainer.querySelector('a.dropdown-item small.text-muted');
            if (placeholder && placeholder.textContent.includes("No new notifications")) {
                placeholder.parentElement.remove();
            }


            // Limit the number of items in the dropdown
            const maxItemsInDropdown = 10;
            while (notificationItemsContainer.children.length > maxItemsInDropdown) {
                notificationItemsContainer.removeChild(notificationItemsContainer.lastChild);
            }

            // Update the main unread count in the navbar
            // The backend's `check_new_notifications` should ideally send the *total* current unread count
            // For now, we'll estimate based on what was fetched.
            // A more robust way is to fetch the total unread count separately or have it in the poll response.
            const currentBadge = notificationsDropdown.querySelector('.badge');
            if (currentBadge) {
                 // For simplicity, let's assume the backend will provide an updated total unread count
                 // with a separate API call or in the polling response.
                 // For now, just add the number of new notifications to the existing count.
                 // This is not perfectly accurate if some were read elsewhere.
                 // Ideally, the /notifications/check-new endpoint should return the new totalUnreadCount.
                 // Let's assume data.totalUnreadCount exists.
                 if (typeof data.totalUnreadCount === 'number') {
                     updateNavbarNotificationCount(data.totalUnreadCount);
                 } else if (hasNewUnread) { // Fallback: crudely increment if new unread items arrived
                    const existingCount = parseInt(currentBadge.textContent || '0');
                    updateNavbarNotificationCount(existingCount + data.newNotifications.filter(n => n.includes('unread-notification')).length);
                 }
            } else if (data.totalUnreadCount > 0 || (data.newNotifications && data.newNotifications.length > 0 && hasNewUnread)) {
                // Create badge if it doesn't exist and there are new notifications
                 const newBadge = document.createElement('span');
                 newBadge.className = 'position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger';
                 newBadge.textContent = data.totalUnreadCount || data.newNotifications.filter(n => n.includes('unread-notification')).length;
                 const visuallyHidden = document.createElement('span');
                 visuallyHidden.className = 'visually-hidden';
                 visuallyHidden.textContent = 'unread notifications';
                 newBadge.appendChild(visuallyHidden);
                 notificationsDropdown.appendChild(newBadge);
            }

            if (hasNewUnread) {
                 showNexusNotification('New Notification!', `${data.newNotifications.length} new notification(s) received.`, 'info');
            }
        }
    } catch (error) {
        console.error('Error polling for notifications:', error);
        // Optionally, display a subtle error to the user or stop polling after too many errors
    }
}

function updateNavbarNotificationCount(count) {
    const notificationsDropdown = document.getElementById('notificationsDropdown');
    if (!notificationsDropdown) return;

    let badge = notificationsDropdown.querySelector('.badge');
    if (count > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger';
            const visuallyHidden = document.createElement('span');
            visuallyHidden.className = 'visually-hidden';
            visuallyHidden.textContent = 'unread notifications';
            badge.appendChild(visuallyHidden);
            notificationsDropdown.appendChild(badge);
        }
        badge.textContent = count;
        // Ensure visually hidden text is still there if we just update textContent
        if (!badge.querySelector('.visually-hidden')) {
             const visuallyHidden = document.createElement('span');
             visuallyHidden.className = 'visually-hidden';
             visuallyHidden.textContent = 'unread notifications';
             badge.appendChild(visuallyHidden);
        }
    } else {
        if (badge) {
            badge.remove();
        }
    }
    // Update the Mark All Read button state on the /notifications page
    const markAllReadButtonPage = document.getElementById('markAllReadBtn');
    if(markAllReadButtonPage) {
        markAllReadButtonPage.disabled = (count === 0);
    }
}

// Make functions globally available if needed by inline JS or other scripts, or keep them module-scoped.
// window.handleMarkAllNotificationsRead = handleMarkAllNotificationsRead;
// window.handleMarkSingleNotificationRead = handleMarkSingleNotificationRead;