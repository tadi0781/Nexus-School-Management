// --- START OF FILE talent_club.js ---
// Nexus School Management System - talent_club.js
// Version: CONSOLIDATED & REFACTORED
"use strict";

/**
 * =================================================================
 * UTILITY FUNCTIONS (Global Helpers)
 * =================================================================
 */

// A generic function to post form data and handle responses
async function postData(url = '', data = {}) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(), // Assumes a function to get the CSRF token
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "An unknown error occurred." }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
}

// A generic function to fetch data
async function getData(url = '') {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "An unknown error occurred." }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
}


// Function to get CSRF token from a meta tag
function getCsrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
}

// Function to safely escape HTML to prevent XSS
function escapeHTML(str) { 
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, match => ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": ''' }[match]));
}

// A global function to show notifications (can be customized)
function showNexusNotification(title, message, type = 'info') {
    // This is a placeholder. You would integrate your actual notification/toast library here.
    console.log(`[Notification - ${type.toUpperCase()}] ${title}: ${message}`);
    alert(`${title}: ${message}`);
}


/**
 * =================================================================
 * CORE INITIALIZATION & GLOBAL STATE
 * =================================================================
 */

let currentTCClubId = null;
let currentTCFeedPage = 1;
let isLoadingTCPosts = false;
let currentTCCommunityGroupId = null;
let currentTCUserId = null;
const TC_COMMUNITY_POLL_INTERVAL = 7000;
let tcCommunityMessagePollIntervalId = null;
let lastTCCommunityMessageTimestamp = 0;

document.addEventListener('DOMContentLoaded', function () {
    console.log('Nexus Talent Club JS Initialized.');

    initializeProposalForm();
    initializeDiscoveryAndProfileActions();
    initializeTCFeedFromPage();
    initializeTCCommunityChatFromPage();
    initializeMemberManagementActions();
});

// Register real-time handlers once the global socket manager is ready.
// document.addEventListener('realtimeManagerReady', registerTCRealtimeHandlers);


/**
 * =================================================================
 * TALENT CLUB PROPOSAL FORM
 * =================================================================
 */
function initializeProposalForm() {
    const formEl = document.getElementById('proposalForm');
    const memberPickerEl = document.getElementById('mentioned_member_ids_picker');
    const hiddenInputEl = document.getElementById('mentioned_member_ids');

    if (!formEl || !memberPickerEl || !hiddenInputEl) {
        return;
    }
    
    console.log("Proposal form elements FOUND. Initializing member picker.");

    const memberTomSelect = new TomSelect(memberPickerEl, {
        valueField: 'id',
        labelField: 'text',
        searchField: ['text'],
        plugins: ['remove_button'],
        maxItems: 20,
        create: false,
        load: function(query, callback) {
            if (!query.length || query.length < 2) return callback();
            const url = `/talent_club/api/members/search?q=${encodeURIComponent(query)}`;
            fetch(url)
                .then(response => response.json())
                .then(json => callback(json))
                .catch(() => callback());
        }
    });

    formEl.addEventListener('submit', function(event) {
        const selectedIds = memberTomSelect.getValue();
        hiddenInputEl.value = Array.isArray(selectedIds) ? selectedIds.join(',') : '';
        console.log('Form Submit: Populating hidden input with:', hiddenInputEl.value);
    });
}


/**
 * =================================================================
 * TALENT CLUB PROFILE & DISCOVERY (Tabs, Follow/Unfollow)
 * =================================================================
 */
function initializeDiscoveryAndProfileActions() {
    document.body.addEventListener('click', async function (event) {
        const tabButton = event.target.closest('.tc-content-tab');
        if (tabButton) {
            event.preventDefault();
            const clubId = tabButton.dataset.clubId;
            const tabName = tabButton.dataset.tabName;
            document.querySelectorAll('.tc-content-tab').forEach(btn => btn.classList.remove('active'));
            tabButton.classList.add('active');
            await loadTabContent(clubId, tabName);
        }

        const actionButton = event.target.closest('.tc-action-btn');
        if (actionButton) {
            event.preventDefault();
            const clubId = actionButton.dataset.clubId;
            const action = actionButton.dataset.action;
            await handleTalentClubAction(clubId, action, actionButton);
        }
    });
}

async function loadTabContent(clubId, tabName) {
    const container = document.getElementById('tab-content-container');
    if (!container) return;
    container.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>`;
    try {
        const response = await fetch(`/talent_club/${clubId}/content/${tabName}`);
        if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
        container.innerHTML = await response.text();
        if (tabName === 'feed') {
            initializeTCFeed(clubId);
        }
    } catch (error) {
        console.error(`Error loading tab '${tabName}':`, error);
        container.innerHTML = `<div class="alert alert-danger text-center">Could not load content. Please try again.</div>`;
    }
}
window.loadTabContent = loadTabContent;

async function handleTalentClubAction(clubId, action, buttonElement) {
    if (!clubId || !action || !buttonElement) return;

    const originalButtonHTML = buttonElement.innerHTML;
    buttonElement.disabled = true;
    buttonElement.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Working...`;
    
    try {
        const responseData = await postData(`/talent_club/${clubId}/${action}`, {}); 

        if (responseData.success) {
            showNexusNotification('Success!', responseData.message || 'Action completed.', 'success');
            // Update UI based on action
            if (action === 'follow') {
                buttonElement.innerHTML = '<i class="bi bi-bell-slash-fill me-1"></i> Following';
                buttonElement.classList.replace('btn-primary', 'btn-info');
                buttonElement.dataset.action = 'unfollow';
            } else if (action === 'unfollow') {
                buttonElement.innerHTML = '<i class="bi bi-bell-fill me-1"></i> Follow';
                buttonElement.classList.replace('btn-info', 'btn-primary');
                buttonElement.dataset.action = 'follow';
            } else if (action === 'leave_club') {
                // Redirect or remove element
                window.location.href = responseData.redirect_url || '/talent_club/my_clubs';
            }

            if (typeof responseData.follower_count === 'number') {
                const engagementElement = document.querySelector(`.engagement-count[data-club-id="${clubId}"]`);
                if (engagementElement) engagementElement.textContent = ` ${responseData.follower_count} Engaged`;
            }
            buttonElement.disabled = false;
        } else {
            showNexusNotification('Action Failed', responseData.error || 'Could not complete action.', 'danger');
            buttonElement.innerHTML = originalButtonHTML;
            buttonElement.disabled = false;
        }
    } catch (error) {
        console.error(`Error with TC action '${action}' for club ${clubId}:`, error);
        showNexusNotification('Error', `An unexpected error occurred.`, 'error');
        buttonElement.innerHTML = originalButtonHTML;
        buttonElement.disabled = false;
    }
}


/**
 * =================================================================
 * TALENT CLUB FEED (Posts, Comments, Reactions)
 * =================================================================
 */

function initializeTCFeedFromPage() {
    const feedContainer = document.querySelector('.tc-feed-container');
    if (feedContainer) {
        const clubId = feedContainer.dataset.clubId;
        initializeTCFeed(clubId);
    }
}

function initializeTCFeed(clubId) {
    console.log(`Initializing TC Feed for Club ID: ${clubId}`);
    currentTCClubId = clubId;
    currentTCFeedPage = 1;
    isLoadingTCPosts = false;
    
    document.body.addEventListener('click', async function(event) {
        const reactionBtn = event.target.closest(`.tc-reaction-btn[data-club-id="${clubId}"]`);
        if (reactionBtn) { event.preventDefault(); await handleTCReactionClick(reactionBtn); }
        
        const deletePostBtn = event.target.closest(`.delete-tc-feed-post-btn[data-club-id="${clubId}"]`);
        if (deletePostBtn) { event.preventDefault(); await handleDeleteTCFeedPost(deletePostBtn); }
    });

    document.body.addEventListener('submit', async function(event) {
        const commentForm = event.target.closest(`.tc-comment-form[data-club-id="${clubId}"]`);
        if (commentForm) { event.preventDefault(); await handleTCCommentSubmit(commentForm); }
    });
}
window.initializeTCFeed = initializeTCFeed;

async function handleTCCommentSubmit(form) {
    const postId = form.dataset.postId;
    const submitButton = form.querySelector('button[type="submit"]');
    const content = form.querySelector('textarea[name="content"]').value;

    if (!content.trim()) return;

    submitButton.disabled = true;
    try {
        const responseData = await postData(`/talent_club/feed/posts/${postId}/comment`, { content });
        if (responseData.success) {
            const commentsContainer = document.getElementById(`comments-container-${postId}`);
            commentsContainer.insertAdjacentHTML('beforeend', responseData.comment_html);
            form.reset();
        } else {
            showNexusNotification('Error', responseData.error || 'Failed to post comment.', 'danger');
        }
    } catch(error) {
        showNexusNotification('Error', 'Could not post comment.', 'danger');
    } finally {
        submitButton.disabled = false;
    }
}

async function handleTCReactionClick(buttonElement) {
    const postId = buttonElement.dataset.postId;
    const emoji = buttonElement.dataset.emoji;
    
    try {
        const responseData = await postData(`/talent_club/feed/posts/${postId}/react`, { emoji });
        if (responseData.success) {
            buttonElement.querySelector('.reaction-count').textContent = responseData.new_count;
            buttonElement.classList.toggle('active', responseData.user_reacted);
        } else {
            showNexusNotification('Error', responseData.error, 'danger');
        }
    } catch(error) {
        showNexusNotification('Error', 'Could not process reaction.', 'danger');
    }
}

async function handleDeleteTCFeedPost(buttonElement) {
    const postId = buttonElement.dataset.postId;
    if (confirm('Are you sure you want to delete this post? This cannot be undone.')) {
        try {
            const responseData = await postData(`/talent_club/feed/posts/${postId}/delete`, {});
            if (responseData.success) {
                document.getElementById(`tc-feed-post-${postId}`)?.remove();
                showNexusNotification('Success', 'Post deleted.', 'success');
            } else {
                showNexusNotification('Error', responseData.error, 'danger');
            }
        } catch(error) {
            showNexusNotification('Error', 'Could not delete post.', 'danger');
        }
    }
}

/**
 * =================================================================
 * TALENT CLUB COMMUNITY CHAT
 * =================================================================
 */
function initializeTCCommunityChatFromPage() {
    const form = document.querySelector('.tc-community-message-form');
    if (form) {
        const communityGroupId = form.dataset.communityGroupId;
        const userId = form.dataset.currentUserId;
        initializeTCCommunityChat(communityGroupId, userId);
    }
}

function initializeTCCommunityChat(communityGroupId, userId) {
    const messageForm = document.getElementById(`tcCommunityMessageForm-${communityGroupId}`);
    const chatWindow = document.getElementById(`tcCommunityChatWindowMessages-${communityGroupId}`);
    if (!messageForm || !chatWindow) return;
    
    currentTCCommunityGroupId = communityGroupId;
    currentTCUserId = userId;
    
    messageForm.addEventListener('submit', handleTCCommunityMessageSubmit);
    
    const lastMsgEl = chatWindow.querySelector('.chat-message-wrapper:last-child');
    lastTCCommunityMessageTimestamp = lastMsgEl ? new Date(lastMsgEl.dataset.timestamp).getTime() : Date.now();
    
    startTCCommunityMessagePolling();
}
window.initializeTCCommunityChat = initializeTCCommunityChat;

async function handleTCCommunityMessageSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    
    submitButton.disabled = true;
    try {
        const response = await fetch(form.action, { method: 'POST', body: formData, headers: {'X-CSRFToken': getCsrfToken()} });
        const responseData = await response.json();
        if (response.ok && responseData.success && responseData.post_data) {
            appendTCCommunityMessage(responseData.post_data);
            form.reset();
            // Reset FilePond if used
            if(window.FilePond && FilePond.find(form.querySelector('input[type="file"]'))) {
                FilePond.find(form.querySelector('input[type="file"]')).removeFiles();
            }
        } else {
            showNexusNotification('Error', responseData.error || 'Failed to send message.', 'danger');
        }
    } catch (error) {
        showNexusNotification('Network Error', `Message could not be sent.`, 'danger');
    } finally {
        submitButton.disabled = false;
    }
}

function appendTCCommunityMessage(msgData) {
    const chatWindow = document.getElementById(`tcCommunityChatWindowMessages-${currentTCCommunityGroupId}`);
    if (!chatWindow) return;
    const messageHTML = renderChatMessageItem(msgData, currentTCUserId);
    chatWindow.insertAdjacentHTML('beforeend', messageHTML); // Append new messages at the end
    chatWindow.scrollTop = chatWindow.scrollHeight; // Scroll to bottom
}

function renderChatMessageItem(messageData, currentUserId) {
    const isSender = messageData.sender_id === currentUserId;
    const senderName = messageData.sender?.full_name || messageData.sender?.username || "System";
    const senderAvatar = messageData.sender?.profile_photo_url ? `/static/${messageData.sender.profile_photo_url}` : '/static/img/placeholders/user_avatar_default.png';
    const timestamp = new Date(messageData.timestamp);
    const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let fileHTML = '';
    if (messageData.file) {
        fileHTML = `
            <div class="post-attachment mt-2">
                <a href="${messageData.file.download_url}" target="_blank" class="d-flex align-items-center p-2 rounded bg-light-subtle text-decoration-none border">
                    <i class="bi bi-file-earmark-arrow-down-fill fs-4 me-2 text-primary"></i>
                    <div><strong class="text-dark">${escapeHTML(messageData.file.original_filename)}</strong><small class="d-block text-muted">${(messageData.file.size / 1024).toFixed(1)} KB</small></div>
                </a>
            </div>`;
    }

    return `
        <div class="chat-message-wrapper d-flex mb-3 ${isSender ? 'justify-content-end' : ''}" id="message-${messageData.id}" data-timestamp="${timestamp.toISOString()}">
            <div class="chat-message d-flex flex-column ${isSender ? 'sent align-items-end' : 'received align-items-start'}" style="max-width: 75%;">
                <div class="d-flex align-items-end ${isSender ? 'flex-row-reverse' : ''}">
                    ${!isSender ? `<img src="${senderAvatar}" alt="${escapeHTML(senderName)}" class="rounded-circle me-2 shadow-sm" style="width: 30px; height: 30px; object-fit: cover;">` : ''}
                    <div class="message-bubble p-2 px-3 shadow-sm">
                        <p class="mb-0 message-content">${messageData.content ? escapeHTML(messageData.content) : ''}</p>
                        ${fileHTML}
                    </div>
                </div>
                <small class="message-timestamp text-muted mt-1 ${isSender ? 'me-1' : 'ms-1'}" title="${timestamp.toLocaleString('en-CA', { timeZone: 'UTC' })} UTC">
                    ${!isSender ? `<span class="fw-medium">${escapeHTML(senderName.split(' ')[0])}</span> • ` : ''}${timeString}
                </small>
            </div>
        </div>`;
}

function startTCCommunityMessagePolling() {
    if (tcCommunityMessagePollIntervalId) clearInterval(tcCommunityMessagePollIntervalId);
    if (!currentTCCommunityGroupId) return;
    tcCommunityMessagePollIntervalId = setInterval(fetchNewTCCommunityMessages, TC_COMMUNITY_POLL_INTERVAL);
}

async function fetchNewTCCommunityMessages() {
    if (!currentTCCommunityGroupId) return;
    try {
        const data = await getData(`/talent_club/api/community/${currentTCCommunityGroupId}/messages/new?since=${lastTCCommunityMessageTimestamp}`);
        if (data.messages && data.messages.length > 0) {
            data.messages.forEach(msg => {
                if (!document.getElementById(`message-${msg.id}`)) {
                    appendTCCommunityMessage(msg);
                }
            });
            lastTCCommunityMessageTimestamp = new Date(data.messages[data.messages.length - 1].timestamp).getTime();
        }
        if (data.latest_timestamp) {
             lastTCCommunityMessageTimestamp = Math.max(lastTCCommunityMessageTimestamp, data.latest_timestamp);
        }
    } catch (error) { console.error('Error polling TC Community messages:', error); }
}

function stopTCCommunityMessagePolling() {
    if (tcCommunityMessagePollIntervalId) {
        clearInterval(tcCommunityMessagePollIntervalId);
        tcCommunityMessagePollIntervalId = null;
    }
}
window.addEventListener('beforeunload', stopTCCommunityMessagePolling);

/**
 * =================================================================
 * TC MEMBER MANAGEMENT (Leader/Admin Actions)
 * =================================================================
 */
function initializeMemberManagementActions() {
    document.body.addEventListener('submit', async function(event) {
        const memberActionForm = event.target.closest('.tc-member-action-form');
        if (memberActionForm) {
            event.preventDefault();
            await handleTCMemberActionFormSubmit(memberActionForm);
        }
    });
}

async function handleTCMemberActionFormSubmit(form) {
    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    
    submitButton.disabled = true;
    try {
        const response = await fetch(form.action, { method: 'POST', body: formData, headers: {'X-CSRFToken': getCsrfToken()} });
        // This action usually results in a redirect with a flash message, so we just follow it.
        if (response.redirected) {
            window.location.href = response.url;
        } else {
            // Handle JSON responses if any
            const responseData = await response.json();
            if (responseData.success) {
                showNexusNotification('Success', responseData.message, 'success');
            } else {
                showNexusNotification('Error', responseData.error || 'Action failed.', 'danger');
            }
        }
    } catch (error) {
        showNexusNotification('Error', 'An unexpected error occurred.', 'danger');
    } finally {
        submitButton.disabled = false;
    }
}