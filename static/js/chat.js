// Nexus School Management System - chat.js
// Gemini 3 Pro Preview - Phase D.3

"use strict";

let currentChatTargetUserId = null;
let currentChatUserId = null;
let messagePollIntervalId = null;
let lastMessageTimestamp = 0; // Timestamp of the last received/fetched message for polling
const CHAT_POLL_INTERVAL = 5000; // Poll every 5 seconds for new messages

// DOM Elements (to be populated in initializeChat)
let chatWindowMessages = null;
let chatMessageForm = null;
let chatMessageInput = null;
let sendChatMessageBtn = null;
let typingIndicator = null;

/**
 * Initializes the chat interface for a specific target user.
 * @param {number} targetUserId - The ID of the user to chat with.
 * @param {number} currentUserId - The ID of the currently logged-in user.
 */
function initializeChat(targetUserId, userId) {
    console.log(`Initializing chat with User ID: ${targetUserId}`);
    currentChatTargetUserId = targetUserId;
    currentChatUserId = userId;

    chatWindowMessages = document.getElementById('chatWindowMessages');
    chatMessageForm = document.getElementById('chatMessageForm');
    chatMessageInput = document.getElementById('chatMessageInput');
    sendChatMessageBtn = document.getElementById('sendChatMessageBtn');
    typingIndicator = document.getElementById('typingIndicator');

    if (!chatWindowMessages || !chatMessageForm || !chatMessageInput || !sendChatMessageBtn) {
        console.error('Chat UI elements not found. Chat functionality will be limited.');
        return;
    }

    // Set initial lastMessageTimestamp from the newest message already on the page
    const lastExistingMessageElement = chatWindowMessages.querySelector('.chat-message-wrapper:last-child .message-timestamp');
    if (lastExistingMessageElement && lastExistingMessageElement.title) {
        try {
            // Assuming title has 'YYYY-MM-DD HH:MM:SS UTC'
            const parts = lastExistingMessageElement.title.replace(' UTC', '').split(/[\s:-]+/);
            // new Date(year, monthIndex, day, hours, minutes, seconds)
            const dateObj = new Date(Date.UTC(parts[0], parts[1]-1, parts[2], parts[3], parts[4], parts[5]));
            lastMessageTimestamp = dateObj.getTime();
        } catch (e) {
            console.warn('Could not parse last message timestamp from existing messages.', e);
            lastMessageTimestamp = Date.now() - (CHAT_POLL_INTERVAL * 2); // Start polling from a bit in the past
        }
    } else {
        lastMessageTimestamp = Date.now() - (CHAT_POLL_INTERVAL * 2); // Default if no messages
    }


    // Scroll to the bottom of the chat window initially (if messages are loaded top-to-bottom)
    // If using flex-direction: column-reverse, this might not be needed or behaves differently.
    // For column-reverse, the container itself scrolls.
    scrollToChatBottom(true);

    // Attach event listener for sending messages
    chatMessageForm.addEventListener('submit', handleSendMessage);

    // Optional: Implement "is typing" functionality
    // chatMessageInput.addEventListener('input', handleTyping);

    // Start polling for new messages
    startMessagePolling();

    // Mark messages from this user as read (could be an API call)
    // This is more complex as it requires knowing which messages were unread *before* opening.
    // For now, assume backend handles "is_read" update when messages are fetched for `universal_chat.html`
    // or via a dedicated "mark as read" API endpoint if needed.
    // A simple approach: if this chat is active, consider messages from targetUser as "seen"
    // markMessagesAsReadFromTarget(targetUserId); // Placeholder for more robust logic
}

/**
 * Scrolls the chat window to the bottom.
 * @param {boolean} [force=false] - Force scroll even if user might have scrolled up.
 */
function scrollToChatBottom(force = false) {
    if (chatWindowMessages) {
        // For flex-direction: column-reverse, scroll top is effectively the bottom.
        // We want to ensure new messages are visible.
        // If the user hasn't scrolled up significantly, auto-scroll.
        const threshold = 100; // Pixels from bottom to trigger auto-scroll
        const isScrolledToBottom = chatWindowMessages.scrollTop < threshold; // For column-reverse, scrollTop is near 0 when at bottom

        if (force || isScrolledToBottom) {
            chatWindowMessages.scrollTop = 0; // Scroll to the top (which is visually the bottom for column-reverse)
        }
    }
}

/**
 * Handles the chat message form submission.
 * @param {Event} event - The form submission event.
 */
async function handleSendMessage(event) {
    event.preventDefault();
    if (!chatMessageInput || !currentChatTargetUserId) return;

    const content = chatMessageInput.value.trim();
    if (!content) {
        showNexusNotification('Empty Message', 'Cannot send an empty message.', 'warning');
        return;
    }
    if (content.length > 2000) {
        showNexusNotification('Message Too Long', 'Messages are limited to 2000 characters.', 'warning');
        return;
    }

    const originalButtonText = sendChatMessageBtn.innerHTML;
    sendChatMessageBtn.disabled = true;
    sendChatMessageBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...`;
    chatMessageInput.disabled = true;

    // Optimistic UI update (optional, but improves perceived performance)
    // const optimisticMessageData = {
    //     id: 'temp-' + Date.now(), // Temporary ID
    //     sender_id: currentChatUserId,
    //     sender: { /* current_user basic info */ full_name: 'You', profile_photo_url: null /* get from current_user */ },
    //     content: content,
    //     timestamp: new Date().toISOString(), // Use ISO string for consistency with backend
    //     is_optimistic: true
    // };
    // appendMessageToChat(optimisticMessageData, currentChatUserId);

    try {
        // Assumes utils.js and postData function are available
        // The backend route /chat/user/<target_user_id> should handle POST requests
        const response = await postData(chatMessageForm.action, { message: content });

        if (response.success && response.message_data) {
            // If using optimistic update, remove the temporary message and add the confirmed one
            // document.getElementById(optimisticMessageData.id)?.remove();
            // appendMessageToChat(response.message_data, currentChatUserId);
            
            // If not using optimistic, just clear input and let polling fetch it
            // However, for better UX, we should append the sent message immediately
            // The backend should return the created message object.
            appendMessageToChat(response.message_data, currentChatUserId);
            chatMessageInput.value = '';
            chatMessageInput.style.height = 'auto'; // Reset textarea height
            lastMessageTimestamp = new Date(response.message_data.timestamp).getTime(); // Update timestamp
        } else {
            // Remove optimistic message if it failed
            // document.getElementById(optimisticMessageData.id)?.remove();
            showNexusNotification('Send Error', response.error || 'Failed to send message. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        // document.getElementById(optimisticMessageData.id)?.remove();
        showNexusNotification('Send Error', `An error occurred: ${error.message}`, 'error');
    } finally {
        sendChatMessageBtn.disabled = false;
        sendChatMessageBtn.innerHTML = originalButtonText;
        chatMessageInput.disabled = false;
        chatMessageInput.focus();
    }
}

/**
 * Appends a new message to the chat window.
 * @param {object} messageData - The message data object.
 * @param {number} currentUserId - The ID of the current user.
 */
function appendMessageToChat(messageData, currentUserId) {
    if (!chatWindowMessages || !messageData) return;

    // Create the message element using a template or direct DOM manipulation
    // This logic should mirror the _chat_message_item.html partial
    const isSender = messageData.sender_id === currentUserId;
    const senderName = messageData.sender ? (messageData.sender.full_name || messageData.sender.username) : "Unknown User";
    let senderAvatar = '/static/img/placeholders/user_avatar_default.png'; // Default
    if (messageData.sender && messageData.sender.profile_photo_url) {
        senderAvatar = `/static/${messageData.sender.profile_photo_url}`;
    }


    const messageWrapper = document.createElement('div');
    messageWrapper.className = `chat-message-wrapper d-flex mb-3 ${isSender ? 'justify-content-end' : 'justify-content-start'}`;
    if (messageData.id) messageWrapper.id = `message-${messageData.id}`;


    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message d-flex flex-column ${isSender ? 'sent align-items-end' : 'received align-items-start'}`;
    messageDiv.style.maxWidth = '75%';

    const innerFlex = document.createElement('div');
    innerFlex.className = `d-flex align-items-end ${isSender ? 'flex-row-reverse' : ''}`;

    if (!isSender) {
        const img = document.createElement('img');
        img.src = senderAvatar;
        img.alt = senderName;
        img.className = 'rounded-circle me-2 shadow-sm';
        img.style.width = '30px';
        img.style.height = '30px';
        img.style.objectFit = 'cover';
        innerFlex.appendChild(img);
    }

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble p-2 px-3 shadow-sm';
    const contentP = document.createElement('p');
    contentP.className = 'mb-0 message-content';
    contentP.textContent = messageData.content; // Assuming content is plain text
    bubble.appendChild(contentP);
    innerFlex.appendChild(bubble);
    messageDiv.appendChild(innerFlex);

    const timestampSmall = document.createElement('small');
    timestampSmall.className = `message-timestamp text-muted mt-1 ${isSender ? 'me-1' : 'ms-1'}`;
    // Format timestamp (requires a JS utility or use ISO string directly for title)
    const dateObj = new Date(messageData.timestamp);
    timestampSmall.title = dateObj.toLocaleString('en-CA', { timeZone: 'UTC' }) + ' UTC'; // YYYY-MM-DD HH:MM:SS format

    let timeDiffStr = 'just now'; // Placeholder, implement time diff utility if needed
    // Example using a simple time display:
    timeDiffStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });


    timestampSmall.innerHTML = `${!isSender ? `<span class="fw-medium">${senderName.split(' ')[0]}</span> • ` : ''}${timeDiffStr}`;
    messageDiv.appendChild(timestampSmall);

    messageWrapper.appendChild(messageDiv);

    // Remove "Start the Conversation" placeholder if it exists
    const placeholder = chatWindowMessages.querySelector('.text-center.text-muted');
    if (placeholder && placeholder.textContent.includes("Start the Conversation")) {
        placeholder.remove();
    }

    chatWindowMessages.prepend(messageWrapper); // Prepend because of column-reverse
    scrollToChatBottom(true); // Force scroll for new message
}


/**
 * Starts polling for new messages.
 */
function startMessagePolling() {
    if (!currentChatTargetUserId) return;

    console.log(`Starting message polling for chat with ${currentChatTargetUserId}. Last timestamp: ${new Date(lastMessageTimestamp).toISOString()}`);
    stopMessagePolling(); // Clear any existing interval

    // Initial fetch immediately
    fetchNewMessages();

    messagePollIntervalId = setInterval(fetchNewMessages, CHAT_POLL_INTERVAL);
}

/**
 * Stops polling for new messages.
 */
function stopMessagePolling() {
    if (messagePollIntervalId) {
        clearInterval(messagePollIntervalId);
        messagePollIntervalId = null;
        console.log('Message polling stopped.');
    }
}

/**
 * Fetches new messages from the server since the last known timestamp.
 */
async function fetchNewMessages() {
    if (!currentChatTargetUserId || !chatWindowMessages) return;

    // Construct the API endpoint URL
    // Assumes a backend route like /chat/api/messages/<int:other_user_id>/new?since=<timestamp_ms>
    const apiUrl = `/chat/api/messages/${currentChatTargetUserId}/new?since=${lastMessageTimestamp}`;

    try {
        const data = await getData(apiUrl); // Assumes utils.js and getData are available

        if (data.error) {
            console.error('Error fetching new messages:', data.error);
            // Potentially stop polling if server error persists (e.g., auth failure)
            if (data.stop_polling) stopMessagePolling();
            return;
        }

        if (data.messages && data.messages.length > 0) {
            data.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); // Ensure ascending order
            data.messages.forEach(msg => {
                // Check if message already exists (e.g., from optimistic update or previous poll)
                if (!document.getElementById(`message-${msg.id}`)) {
                    appendMessageToChat(msg, currentChatUserId);
                }
            });
            // Update lastMessageTimestamp with the timestamp of the newest message received
            lastMessageTimestamp = new Date(data.messages[data.messages.length - 1].timestamp).getTime();
        }
        // Update lastMessageTimestamp even if no new messages, to keep server 'since' fresh
        if (data.latest_timestamp) {
             lastMessageTimestamp = Math.max(lastMessageTimestamp, data.latest_timestamp);
        }


    } catch (error) {
        console.error('Error polling for new messages:', error);
        // Decide if polling should stop, e.g., after multiple consecutive errors
    }
}

// Clean up polling when the user navigates away from the chat page
// This requires detecting page unload or route changes if using a Single Page App (SPA)
// For traditional navigation, this isn't strictly necessary but good practice.
window.addEventListener('beforeunload', () => {
    stopMessagePolling();
});

// Placeholder for "is typing" functionality
// function handleTyping() {
//     // Send "typing" event to server via SocketIO or a quick AJAX ping
//     // Server then broadcasts to the target_user
// }
// function displayTypingIndicator(username) {
//     if (typingIndicator) typingIndicator.textContent = `${username} is typing...`;
// }
// function clearTypingIndicator() {
//     if (typingIndicator) typingIndicator.textContent = '';
// }