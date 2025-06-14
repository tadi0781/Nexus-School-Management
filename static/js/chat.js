// =================================================================
// START OF CORRECT AND COMPLETE chat.js
// =================================================================

"use strict";

// --- Module-level state variables ---
let currentChatTargetUserId = null;
let currentChatUserId = null;
let messagePollIntervalId = null;
let lastMessageTimestamp = 0;
const CHAT_POLL_INTERVAL = 5000; // Poll every 5 seconds

// --- DOM Element references ---
let chatWindowMessages = null;
let chatMessageForm = null;
let chatMessageInput = null;
let sendChatMessageBtn = null;
let typingIndicator = null;
let filePreviewArea = null;
let actualFileInput = null;

/**
 * Initializes the chat interface and sets up all event listeners.
 * This is the main entry point called from the HTML template.
 * @param {number} targetUserId - The ID of the user to chat with.
 * @param {number} currentUserId - The ID of the currently logged-in user.
 */
function initializeChat(targetUserId, currentUserId) {
    console.log(`Initializing chat with User ID: ${targetUserId}`);

    // Stop any previous polling before setting up a new chat
    stopMessagePolling();

    // --- Populate global variables and DOM references ---
    currentChatTargetUserId = targetUserId;
    currentChatUserId = currentUserId;
    chatWindowMessages = document.getElementById('chatWindowMessages');
    chatMessageForm = document.getElementById('chatMessageForm');
    chatMessageInput = document.getElementById('chatMessageInput');
    sendChatMessageBtn = document.getElementById('sendChatMessageBtn');
    typingIndicator = document.getElementById('typingIndicator');
    filePreviewArea = document.getElementById('dmFilePreviewArea');
    actualFileInput = document.getElementById('chatActualDmFileInput');
    const attachFileBtn = document.getElementById('chatAttachFileBtn');

    // --- Attach Core Event Listeners ---
    if (chatMessageForm) {
        chatMessageForm.addEventListener('submit', handleSendMessage);
    } else {
        console.error("Critical Error: Chat message form #chatMessageForm not found.");
        return;
    }

    if (attachFileBtn && actualFileInput) {
        attachFileBtn.addEventListener('click', () => actualFileInput.click());
        actualFileInput.addEventListener('change', handleFileSelection);
    }

    if (chatMessageInput) {
        chatMessageInput.addEventListener('input', () => {
            chatMessageInput.style.height = 'auto';
            chatMessageInput.style.height = (chatMessageInput.scrollHeight) + 'px';
        });
        // Set initial height
        chatMessageInput.dispatchEvent(new Event('input'));
    }

    // --- Final Setup ---
    scrollToChatBottom(true);
    // Start polling for new messages (initial fetch happens inside)
    startMessagePolling();
}

/**
 * Handles the chat message form submission.
 * @param {Event} event - The form submission event.
 */
async function handleSendMessage(event) {
    event.preventDefault();
    const message = chatMessageInput.value.trim();
    const file = actualFileInput ? actualFileInput.files[0] : null;

    if (!message && !file) {
        return; // Don't send empty messages
    }

    const formData = new FormData();
    if (message) formData.append('message', message);
    if (file) formData.append('dm_file', file);

    setSendButtonLoading(true);

    try {
        const response = await fetch(`/chat/user/${currentChatTargetUserId}`, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            }
        });
        const data = await response.json();

        if (data.success && data.message_data) {
            const messageHtml = createChatMessageHtml(data.message_data);
            chatWindowMessages.insertAdjacentHTML('beforeend', messageHtml);
            scrollToChatBottom(true);
            
            // Reset the form
            chatMessageInput.value = '';
            chatMessageInput.dispatchEvent(new Event('input')); // Recalculate height
            filePreviewArea.innerHTML = '';
            if (actualFileInput) actualFileInput.value = '';
        } else {
            showToast('Error', data.error || 'Failed to send message.', 'error');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showToast('Error', 'A network error occurred while sending the message.', 'error');
    } finally {
        setSendButtonLoading(false);
    }
}

/**
 * Displays a preview when a user selects a file to attach.
 */
function handleFileSelection() {
    if (actualFileInput.files.length > 0) {
        const file = actualFileInput.files[0];
        filePreviewArea.innerHTML = `
            <div class="alert alert-secondary alert-dismissible fade show p-2 mt-2" role="alert">
                <i class="bi bi-paperclip me-2"></i>${file.name}
                <button type="button" class="btn-close p-2" aria-label="Close"></button>
            </div>
        `;
        // Add event listener to the new close button to clear the file input
        filePreviewArea.querySelector('.btn-close').addEventListener('click', () => {
            actualFileInput.value = '';
            filePreviewArea.innerHTML = '';
        });
    } else {
        filePreviewArea.innerHTML = '';
    }
}

/**
 * Toggles the loading state of the send button.
 * @param {boolean} isLoading - True to show loading state, false to restore.
 */
function setSendButtonLoading(isLoading) {
    if (!sendChatMessageBtn) return;
    const spinner = sendChatMessageBtn.querySelector('.spinner-border');
    if (isLoading) {
        sendChatMessageBtn.disabled = true;
        if (spinner) spinner.classList.remove('d-none');
    } else {
        sendChatMessageBtn.disabled = false;
        if (spinner) spinner.classList.add('d-none');
    }
}

/**
 * Creates the HTML for a new chat message from the server's JSON data.
 * @param {object} messageData - The message data object from the server.
 * @returns {string} The HTML string for the new message.
 */
function createChatMessageHtml(messageData) {
    const isSender = messageData.sender_id === currentChatUserId;
    
    let fileHtml = '';
    if (messageData.file_details) {
        const file = messageData.file_details;
        const fileSizeKB = (file.size / 1024).toFixed(1);
        fileHtml = `
            <div class="chat-file-attachment mt-2">
                <a href="${file.download_url}" class="text-decoration-none" target="_blank">
                    <div class="card bg-light-subtle border-0">
                        <div class="card-body p-2 d-flex align-items-center">
                            <i class="bi bi-file-earmark-arrow-down fs-4 me-2"></i>
                            <div>
                                <div class="fw-bold text-dark">${file.original_filename}</div>
                                <small class="text-muted">${fileSizeKB} KB</small>
                            </div>
                        </div>
                    </div>
                </a>
            </div>
        `;
    }

    const contentHtml = messageData.content ? `<div class="message-content">${messageData.content.replace(/\n/g, '<br>')}</div>` : '';
    const time = new Date(messageData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
        <div class="d-flex my-2 ${isSender ? 'justify-content-end' : 'justify-content-start'}">
            <div class="chat-message p-2 px-3 shadow-sm ${isSender ? 'sender' : 'receiver'}">
                ${contentHtml}
                ${fileHtml}
                <div class="message-timestamp small text-muted text-end mt-1" title="${messageData.timestamp}">${time}</div>
            </div>
        </div>
    `;
}

/**
 * Scrolls the chat window to the very bottom.
 * @param {boolean} [force=false] - Force scroll even if the user has scrolled up.
 */
function scrollToChatBottom(force = false) {
    if (chatWindowMessages) {
        const isScrolledUp = chatWindowMessages.scrollTop + chatWindowMessages.clientHeight < chatWindowMessages.scrollHeight - 50;
        if (force || !isScrolledUp) {
            chatWindowMessages.scrollTop = chatWindowMessages.scrollHeight;
        }
    }
}


// --- MESSAGE POLLING FUNCTIONS ---

function startMessagePolling() {
    if (!currentChatTargetUserId) return;
    stopMessagePolling();
    const lastMsgEl = [...document.querySelectorAll('.message-timestamp')].pop();
    if(lastMsgEl) {
        lastMessageTimestamp = new Date(lastMsgEl.title).getTime();
    } else {
        lastMessageTimestamp = Date.now();
    }
    console.log(`Starting poll. Last timestamp: ${lastMessageTimestamp}`);
    messagePollIntervalId = setInterval(fetchNewMessages, CHAT_POLL_INTERVAL);
}

function stopMessagePolling() {
    if (messagePollIntervalId) {
        clearInterval(messagePollIntervalId);
        messagePollIntervalId = null;
        console.log('Message polling stopped.');
    }
}

async function fetchNewMessages() {
    if (!currentChatTargetUserId) return;
    const apiUrl = `/chat/api/messages/${currentChatTargetUserId}/new?since=${lastMessageTimestamp}`;
    try {
        const data = await getData(apiUrl);
        if (data.messages && data.messages.length > 0) {
            data.messages.forEach(msg => {
                if (!document.querySelector(`[data-message-id='${msg.id}']`)) {
                    const messageHtml = createChatMessageHtml(msg);
                    chatWindowMessages.insertAdjacentHTML('beforeend', messageHtml);
                }
            });
            lastMessageTimestamp = new Date(data.messages[data.messages.length - 1].timestamp).getTime();
            scrollToChatBottom();
        }
    } catch (error) {
        console.error('Error polling for new messages:', error);
    }
}

// Cleanup polling when the user navigates away
window.addEventListener('beforeunload', stopMessagePolling);


// =================================================================
// END OF CORRECT AND COMPLETE chat.js
// ================================================================= 