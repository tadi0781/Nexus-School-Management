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
// In static/js/chat.js

/**
 * Initializes the chat interface, populates module-level variables,
 * and sets up all necessary event listeners.
 * @param {number} targetUserId - The ID of the user to chat with.
 * @param {number} currentUserId - The ID of the currently logged-in user.
 */
function initializeChat(targetUserId, currentUserId) {
    console.log(`Initializing chat with User ID: ${targetUserId}`);
    stopMessagePolling();

    // Populate module-level variables from DOM
    currentChatTargetUserId = targetUserId;
    currentChatUserId = currentUserId;
    chatWindowMessages = document.getElementById('chatWindowMessages');
    chatMessageForm = document.getElementById('chatMessageForm');
    chatMessageInput = document.getElementById('chatMessageInput');
    sendChatMessageBtn = document.getElementById('sendChatMessageBtn');
    typingIndicator = document.getElementById('typingIndicator');
    actualFileInput = document.getElementById('chatActualDmFileInput');
    filePreviewArea = document.getElementById('dmFilePreviewArea');
    const attachFileBtn = document.getElementById('chatAttachFileBtn');

    if (!chatMessageForm || !chatWindowMessages || !chatMessageInput) {
        console.error("Critical chat UI elements are missing. Chat cannot be initialized.");
        return;
    }

    // Attach core event listeners
    chatMessageForm.addEventListener('submit', handleSendMessage);
    
    if(attachFileBtn && actualFileInput){
        attachFileBtn.addEventListener('click', () => actualFileInput.click());
        actualFileInput.addEventListener('change', handleFileSelection);
    }

    // Auto-resize textarea
    chatMessageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // Set initial scroll position and start polling for new messages
    scrollToChatBottom(true);
    startMessagePolling();
}


/**
 * Handles the chat message form submission with file support.
 * @param {Event} event - The form submission event.
 */
async function handleSendMessage(event) {
    event.preventDefault();
    if (!chatMessageForm || !currentChatTargetUserId) return;

    const content = chatMessageInput.value.trim();
    const file = actualFileInput.files[0];

    if (!content && !file) {
        showNexusNotification('Empty Message', 'Cannot send an empty message or file.', 'warning');
        return;
    }
    
    const originalButtonText = sendChatMessageBtn.innerHTML;
    setSendButtonLoading(true);

    // FormData automatically collects all fields from the form, including the hidden CSRF token.
    const formData = new FormData(chatMessageForm);
    
    try {
        // --- THIS IS THE FIX ---
        // The fetch call no longer needs to manually set the CSRF header,
        // as it's now part of the FormData body.
        const response = await fetch(chatMessageForm.action, {
            method: 'POST',
            body: formData,
            // We do NOT set 'Content-Type' for FormData, the browser does it automatically with the boundary.
        });
        const data = await response.json();

        if (response.ok && data.success && data.message_data) {
            appendMessageToChat(data.message_data, currentChatUserId);
            chatMessageForm.reset();
            if (filePreviewArea) filePreviewArea.innerHTML = '';
            chatMessageInput.style.height = 'auto';
            lastMessageTimestamp = new Date(data.message_data.timestamp).getTime();
        } else {
            showNexusNotification('Send Error', data.error || 'Failed to send message.', 'error');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showNexusNotification('Send Error', `A network error occurred: ${error.message}`, 'error');
    } finally {
        setSendButtonLoading(false);
        sendChatMessageBtn.innerHTML = originalButtonText; // Restore original content
        chatMessageInput.focus();
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

function appendMessageToChat(messageData, currentUserId) {
    if (!chatWindowMessages || !messageData) return;

    const isSender = messageData.sender_id === currentUserId;
    const senderName = messageData.sender ? (messageData.sender.full_name || messageData.sender.username) : "Unknown User";
    let senderAvatar = messageData.sender?.profile_photo_url ? messageData.sender.profile_photo_url : '/static/img/placeholders/user_avatar_default.png';

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
        img.src = senderAvatar.startsWith('http') ? senderAvatar : `/static/${senderAvatar}`;
        img.alt = senderName;
        img.className = 'rounded-circle me-2 shadow-sm';
        img.width = 30; img.height = 30; img.style.objectFit = 'cover';
        innerFlex.appendChild(img);
    }

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble p-2 px-3 shadow-sm';
    
    if (messageData.file_details) {
        const file = messageData.file_details;
        const fileSizeHuman = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : `${(file.size / 1024).toFixed(1)} KB`;
        let iconClass = 'bi-file-earmark-text';
        if (file.mimetype && file.mimetype.startsWith('image/')) iconClass = 'bi-file-earmark-image';
        if (file.mimetype && file.mimetype.startsWith('video/')) iconClass = 'bi-file-earmark-play';

        const fileHTML = `
            <a href="${file.download_url}" target="_blank" class="text-decoration-none text-body" title="Download ${file.original_filename}">
                <div class="d-flex align-items-center">
                    <i class="bi ${iconClass} fs-3 me-2"></i>
                    <div>
                        <div class="fw-bold text-truncate">${file.original_filename}</div>
                        <small class="text-muted">${fileSizeHuman}</small>
                    </div>
                </div>
            </a>
        `;
        const fileDiv = document.createElement('div');
        fileDiv.innerHTML = fileHTML;
        if(messageData.content) { fileDiv.classList.add('mb-2'); }
        bubble.appendChild(fileDiv);
    }

    if (messageData.content) {
        const contentP = document.createElement('p');
        contentP.className = 'mb-0 message-content';
        contentP.textContent = messageData.content;
        bubble.appendChild(contentP);
    }
    
    innerFlex.appendChild(bubble);
    messageDiv.appendChild(innerFlex);

    const timestampSmall = document.createElement('small');
    timestampSmall.className = `message-timestamp text-muted mt-1 ${isSender ? 'me-1' : 'ms-1'}`;
    const dateObj = new Date(messageData.timestamp);
    timestampSmall.title = dateObj.toLocaleString();
    timestampSmall.innerHTML = `${!isSender ? `<span class="fw-medium">${senderName.split(' ')[0]}</span> • ` : ''}${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    messageDiv.appendChild(timestampSmall);

    messageWrapper.appendChild(messageDiv);

    const placeholder = chatWindowMessages.querySelector('.text-center.text-muted');
    if (placeholder) { placeholder.remove(); }

    chatWindowMessages.prepend(messageWrapper);
    scrollToChatBottom(true);
}
// =================================================================
// END OF CORRECT AND COMPLETE chat.js
// ================================================================= 