// Nexus School Management System - talent_club.js
"use strict";

/**
 * Loads content for a specific tab on the club profile page via AJAX.
 * This is called by the Alpine.js component in club_profile.html.
 * @param {string} clubId - The ID of the club.
 * @param {string} tabName - The name of the tab to load (e.g., 'feed', 'media').
 */
async function loadTabContent(clubId, tabName) {
    const container = document.getElementById('tab-content-container');
    if (!container) {
        console.error('Error: The #tab-content-container element was not found on the page.');
        return;
    }
    
    // Display a loading spinner immediately
    container.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>`;

    try {
        const response = await fetch(`/talent_club/${clubId}/content/${tabName}`);
        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
        }
        
        const html = await response.text();
        container.innerHTML = html;
        
        // After loading the content, if it's the feed, we must initialize its JavaScript.
        if (tabName === 'feed') {
            initializeTCFeed(clubId); // Assumes initializeTCFeed is defined in this file
        }
    } catch (error) {
        console.error(`Error loading tab content for '${tabName}':`, error);
        container.innerHTML = `<div class="alert alert-danger text-center">Could not load content. Please refresh the page and try again.</div>`;
    }
}

/**
 * Handles form submissions for TC Leader admin actions (e.g., unban) via AJAX.
 * @param {HTMLFormElement} form - The submitted form element.
 */
async function handleTCMemberActionFormSubmit(form) {
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;

    // Show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Processing...`;

    try {
        const data = await postData(form.action, new FormData(form)); // Assumes postData in utils.js
        if (data.success) {
            showNexusNotification(data.message || 'Action successful!', 'success');
            // Reload the page after a short delay to show the updated status
            setTimeout(() => window.location.reload(), 1500);
        } else {
            showNexusNotification(data.error || 'The action could not be completed.', 'danger');
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    } catch (error) {
        showNexusNotification('A server error occurred. Please try again.', 'danger');
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
}
// Make this function globally accessible so Alpine.js can call it from the template.
window.loadTabContent = loadTabContent;.

document.addEventListener('DOMContentLoaded', function () {
    console.log('Nexus Talent Club JS Initialized.');

    // Event delegation for Talent Club actions (follow, unfollow, etc.)
// At the top of talent_club.js, inside the DOMContentLoaded listener

document.body.addEventListener('submit', async function(event) {
    const commentForm = event.target.closest('.tc-comment-form');
    if (commentForm) {
        event.preventDefault();
        await handleTCCommentSubmit(commentForm);
    }
    
    // ADD THIS PART
    const memberActionForm = event.target.closest('.tc-member-action-form');
    if(memberActionForm) {
        event.preventDefault();
        await handleTCMemberActionFormSubmit(memberActionForm);
    }
});

        // Note: TC Leader voting is typically handled by standard form submission,
        // not AJAX by default in this script.
    });

    // If initializeTcUserPickers was intended for OTHER pickers,
    // it could be called here, but ensure it doesn't re-initialize
    // 'mentioned_member_ids_picker'.
    // initializeTcUserPickers(); // Call if it has other purposes.
});

/**
 * Registers real-time event handlers for the Talent Club system.
 */
function registerTCRealtimeHandlers() {
    // Ensure the global realtime manager from socketHandlers.js is ready
    if (typeof nexusRealtimeManager === 'undefined') {
        console.warn("nexusRealtimeManager not found. Real-time updates for TC are disabled.");
        return;
    }

    console.log("Registering Talent Club real-time event handlers.");

    // Listen for a new post in a specific club's feed
    nexusRealtimeManager.subscribe('tc_new_feed_post', (data) => {
        const feedContainer = document.getElementById(`tcFeedContainer-${data.club_id}`);
        // Only prepend if the user is viewing that specific feed and the post isn't already there
        if (feedContainer && !document.getElementById(`tc_feed_post-${data.post_id}`)) {
            feedContainer.insertAdjacentHTML('afterbegin', data.post_html);
            showNexusNotification(`New post in ${data.club_name}!`, 'info', { autoClose: 5000 });
        }
    });

    // Listen for a new comment on a post the user might be viewing
    nexusRealtimeManager.subscribe('tc_new_comment', (data) => {
        const commentsList = document.getElementById(`tc-comments-list-${data.post_id}`);
        if (commentsList && !document.getElementById(`comment-${data.comment_id}`)) {
            // Remove the 'no comments yet' placeholder if it exists
            const noCommentsYet = commentsList.querySelector('.no-comments-yet');
            if (noCommentsYet) noCommentsYet.remove();
            
            commentsList.insertAdjacentHTML('beforeend', data.comment_html);
            
            // Update the comment count badge
            const commentToggleBtn = document.querySelector(`[href="#tcCommentsCollapse-${data.post_id}"] .badge`);
            if(commentToggleBtn) {
                commentToggleBtn.textContent = data.new_comment_count;
            }
        }
    });

    // You can add more listeners here for reactions, deleted posts, etc.
}

// Ensure the handlers are registered once the socket connection is established.
// This should be at the bottom of the main DOMContentLoaded event listener.
document.addEventListener('realtimeManagerReady', registerTCRealtimeHandlers);

async function handleTalentClubAction(clubId, action, buttonElement) {
    if (!clubId || !action) return;

    const originalButtonHTML = buttonElement.innerHTML;
    buttonElement.disabled = true;
    buttonElement.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Working...`;

    let apiUrl = `/talent_club/${clubId}/${action.replace('_club', '')}`;

    try {
        const responseData = await postData(apiUrl, {});

        if (responseData.success) {
            showNexusNotification('Success!', responseData.message || 'Action completed successfully.', 'success');

            if (action === 'follow_club') {
                buttonElement.innerHTML = '<i class="bi bi-bell-slash-fill me-1"></i> Following';
                buttonElement.classList.remove('btn-primary');
                buttonElement.classList.add('btn-info');
                buttonElement.dataset.action = 'unfollow_club';
            } else if (action === 'unfollow_club') {
                buttonElement.innerHTML = '<i class="bi bi-bell-fill me-1"></i> Follow';
                buttonElement.classList.remove('btn-info', 'btn-outline-secondary');
                buttonElement.classList.add('btn-primary');
                buttonElement.dataset.action = 'follow_club';
            } else if (action === 'leave_club') {
                const clubCard = buttonElement.closest('.talent-club-card');
                if (clubCard && clubCard.parentElement && clubCard.parentElement.classList.contains('col')) {
                    clubCard.parentElement.remove();
                } else {
                     window.location.reload();
                }
            }

            if (typeof responseData.new_total_engagement === 'number') {
                const cardElement = buttonElement.closest('.talent-club-card');
                const engagementElement = cardElement?.querySelector('small.text-muted i.bi-people-fill')?.nextSibling;
                if (engagementElement && engagementElement.nodeType === Node.TEXT_NODE) {
                    engagementElement.textContent = ` ${responseData.new_total_engagement} Engaged`;
                }
            }
        } else {
            showNexusNotification('Action Failed', responseData.error || 'Could not complete action.', 'error');
            buttonElement.innerHTML = originalButtonHTML;
        }
    } catch (error) {
        console.error(`Error performing TC action '${action}' for club ${clubId}:`, error);
        showNexusNotification('Error', `An unexpected error occurred: ${error.message}`, 'error');
        buttonElement.innerHTML = originalButtonHTML;
    } finally {
        if (action !== 'leave_club' || (responseData && !responseData.success)) {
            buttonElement.disabled = false;
        }
    }
}

// --- TC Feed specific JS ---
// (Moved from social.js as these are specific to Talent Club Feed)

let currentTCClubId = null;
let currentTCFeedPage = 1;
let isLoadingTCPosts = false;

function initializeTCFeed(clubId, userId) {
    console.log(`Initializing TC Feed for Club ID: ${clubId}`);
    currentTCClubId = clubId;
    currentTCFeedPage = 1;

    const loadMoreButton = document.querySelector(`#loadMoreTcPostsTrigger-${clubId} .load-more-tc-posts-btn`);
    if (loadMoreButton) {
        loadMoreButton.addEventListener('click', function() {
            loadMoreTcFeedPosts(clubId, this);
        });
    }

    const feedContainer = document.getElementById(`tcFeedContainer-${clubId}`);
    if (feedContainer) {
        feedContainer.addEventListener('submit', async function(event) {
            const commentForm = event.target.closest('.tc-comment-form');
            if (commentForm) {
                event.preventDefault();
                await handleTCCommentSubmit(commentForm);
            }
        });

        feedContainer.addEventListener('click', async function(event) {
            const reactionBtn = event.target.closest('.tc-reaction-btn');
            if (reactionBtn) { event.preventDefault(); await handleTCReactionClick(reactionBtn); }

            const deletePostBtn = event.target.closest('.delete-tc-feed-post-btn');
            if (deletePostBtn) { event.preventDefault(); await handleDeleteTCFeedPost(deletePostBtn); }

            const deleteCommentBtn = event.target.closest('.delete-comment-btn');
            if (deleteCommentBtn && event.target.closest('.tc-feed-post-item')) {
                event.preventDefault(); await handleDeleteTCFeedComment(deleteCommentBtn);
            }
        });
    }
}
window.initializeTCFeed = initializeTCFeed; // Make global if called from inline script

async function loadMoreTcFeedPosts(clubId, buttonElement) {
    if (isLoadingTCPosts) return;
    isLoadingTCPosts = true;
    currentTCFeedPage++;

    const originalButtonHTML = buttonElement.innerHTML;
    buttonElement.disabled = true;
    buttonElement.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Loading...`;

    let responseData = null; // To access in finally block
    try {
        responseData = await getData(`/talent_club/${clubId}/feed/posts?page=${currentTCFeedPage}`);
        const feedContainer = document.getElementById(`tcFeedContainer-${clubId}`);
        const loadMoreTrigger = document.getElementById(`loadMoreTcPostsTrigger-${clubId}`);

        if (responseData.success && responseData.posts_html && feedContainer) {
            if(loadMoreTrigger) loadMoreTrigger.remove();
            feedContainer.insertAdjacentHTML('beforeend', responseData.posts_html);
        } else if (responseData.success && responseData.posts_html === '') {
            if(loadMoreTrigger) loadMoreTrigger.innerHTML = '<p class="text-muted small text-center mt-3">No more posts to load.</p>';
        } else {
            showNexusNotification('Error', responseData.error || 'Could not load more posts.', 'error');
            currentTCFeedPage--;
        }
    } catch (error) {
        showNexusNotification('Load Error', `Failed to load more posts: ${error.message}`, 'error');
        currentTCFeedPage--;
    } finally {
        isLoadingTCPosts = false;
        const currentTriggerButton = document.querySelector(`#loadMoreTcPostsTrigger-${clubId} .load-more-tc-posts-btn`);
        if(currentTriggerButton) { // If a new trigger button was added with the posts_html
            currentTriggerButton.disabled = !(responseData && responseData.has_next_page);
            currentTriggerButton.dataset.currentPage = currentTCFeedPage;
             if (!(responseData && responseData.has_next_page)) {
                 currentTriggerButton.classList.add('d-none'); // Hide if no next page
                 if (!document.querySelector(`#loadMoreTcPostsTrigger-${clubId} .end-of-feed-msg`)){
                    currentTriggerButton.parentElement.insertAdjacentHTML('beforeend', '<p class="text-muted small mt-2 end-of-feed-msg">End of feed.</p>');
                 }
            }
        } else if (buttonElement && !(responseData && responseData.has_next_page)) { // If old button is still there and no next page
            buttonElement.classList.add('d-none');
             if (!buttonElement.parentElement.querySelector('.end-of-feed-msg')){
                 buttonElement.parentElement.insertAdjacentHTML('beforeend', '<p class="text-muted small mt-2 end-of-feed-msg">End of feed.</p>');
             }
        } else if (buttonElement) { // Re-enable if there might be more pages but new button wasn't added
            buttonElement.innerHTML = originalButtonHTML;
            buttonElement.disabled = false;
        }
    }
}

async function handleTCCommentSubmit(form) {
    const postId = form.dataset.postId;
    const submitButton = form.querySelector('.tc-comment-submit-btn');
    const textarea = form.querySelector('.comment-input');
    const content = textarea.value.trim();
    if (!content) { showNexusNotification('Empty Comment', 'Cannot post an empty comment.', 'warning'); return; }

    const originalButtonHTML = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
    try {
        const responseData = await postData(`/talent_club/feed/posts/${postId}/comment`, { content });
        if (responseData.success && responseData.comment_html) {
            textarea.value = ''; textarea.style.height = 'auto';
            const commentsList = document.getElementById(`tc-comments-list-${postId}`);
            const noCommentsYet = commentsList?.querySelector('.no-comments-yet');
            if (noCommentsYet) noCommentsYet.remove();
            commentsList?.insertAdjacentHTML('beforeend', responseData.comment_html);
            const commentToggleBtn = document.querySelector(`[href="#tcCommentsCollapse-${postId}"] .badge`);
            if(commentToggleBtn) commentToggleBtn.textContent = parseInt(commentToggleBtn.textContent || '0') + 1;
        } else {
            showNexusNotification('Comment Error', responseData.error || 'Failed to post comment.', 'error');
        }
    } catch (error) {
        showNexusNotification('Comment Error', `An unexpected error occurred: ${error.message}`, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonHTML;
    }
}

async function handleTCReactionClick(buttonElement) {
    const postId = buttonElement.dataset.postId;
    const emoji = buttonElement.dataset.reactionEmoji;
    const countSpan = buttonElement.querySelector('.reaction-count');
    let currentCount = parseInt(countSpan.textContent || '0');
    const isActive = buttonElement.classList.toggle('active');

    if(isActive) { buttonElement.classList.add('btn-primary', 'text-white'); buttonElement.classList.remove('btn-outline-secondary'); }
    else { buttonElement.classList.remove('btn-primary', 'text-white'); buttonElement.classList.add('btn-outline-secondary'); }
    countSpan.textContent = isActive ? currentCount + 1 : Math.max(0, currentCount - 1);

    try {
        const responseData = await postData(`/talent_club/feed/posts/${postId}/react`, { emoji });
        if (responseData.success) {
            if (typeof responseData.new_count === 'number') countSpan.textContent = responseData.new_count;
            if (typeof responseData.user_reacted === 'boolean') {
                if(responseData.user_reacted) {
                    buttonElement.classList.add('active', 'btn-primary', 'text-white');
                    buttonElement.classList.remove('btn-outline-secondary');
                } else {
                    buttonElement.classList.remove('active', 'btn-primary', 'text-white');
                    buttonElement.classList.add('btn-outline-secondary');
                }
            }
        } else { // Revert on server error
            buttonElement.classList.toggle('active');
            countSpan.textContent = currentCount;
            if(buttonElement.classList.contains('btn-primary')) {buttonElement.classList.remove('btn-primary','text-white'); buttonElement.classList.add('btn-outline-secondary');}
            else {buttonElement.classList.add('btn-primary','text-white'); buttonElement.classList.remove('btn-outline-secondary');}
            showNexusNotification('Reaction Error', responseData.error || 'Failed to apply reaction.', 'error');
        }
    } catch (error) { // Revert on fetch error
        buttonElement.classList.toggle('active');
        countSpan.textContent = currentCount;
        if(buttonElement.classList.contains('btn-primary')) {buttonElement.classList.remove('btn-primary','text-white'); buttonElement.classList.add('btn-outline-secondary');}
        else {buttonElement.classList.add('btn-primary','text-white'); buttonElement.classList.remove('btn-outline-secondary');}
        showNexusNotification('Reaction Error', `An unexpected error: ${error.message}`, 'error');
    }
}

async function handleDeleteTCFeedPost(buttonElement) {
    const postId = buttonElement.dataset.postId;
    const result = await Swal.fire({ title: 'Delete Post?', text: "This action cannot be undone.", icon: 'warning', showCancelButton: true, confirmButtonColor: 'var(--nexus-danger)', cancelButtonColor: 'var(--nexus-secondary)', confirmButtonText: 'Yes, delete it!', customClass: {popup: 'nexus-swal-popup', title: 'nexus-swal-title', htmlContainer: 'nexus-swal-html-container', confirmButton: 'btn btn-danger mx-1', cancelButton: 'btn btn-secondary mx-1'}, buttonsStyling: false });
    if (result.isConfirmed) {
        try {
            const responseData = await postData(`/talent_club/feed/posts/${postId}/delete`, {});
            if (responseData.success) {
                showNexusNotification('Deleted!', responseData.message || 'Post removed.', 'success');
                document.getElementById(`tc_feed_post-${postId}`)?.remove();
            } else { showNexusNotification('Error!', responseData.error || 'Failed to delete post.', 'error');}
        } catch (error) { showNexusNotification('Error!', `Could not delete post: ${error.message}`, 'error');}
    }
}

async function handleDeleteTCFeedComment(buttonElement) {
    const commentId = buttonElement.dataset.commentId;
    const postId = buttonElement.dataset.postId;
    const result = await Swal.fire({ title: 'Delete Comment?', text: "This comment will be removed.", icon: 'warning', showCancelButton: true, /* ... Swal options ... */ });
    if (result.isConfirmed) {
        try {
            const responseData = await postData(`/talent_club/feed/posts/${postId}/comments/${commentId}/delete`, {});
            if (responseData.success) {
                showNexusNotification('Deleted!', responseData.message || 'Comment removed.', 'success');
                document.getElementById(`comment-${commentId}`)?.remove();
                const commentToggleBtn = document.querySelector(`[href="#tcCommentsCollapse-${postId}"] .badge`);
                if(commentToggleBtn) commentToggleBtn.textContent = Math.max(0, parseInt(commentToggleBtn.textContent || '0') - 1);
            } else { showNexusNotification('Error!', responseData.error || 'Failed to delete comment.', 'error');}
        } catch (error) { showNexusNotification('Error!', `Could not delete comment: ${error.message}`, 'error');}
    }
}


// --- TC Community Chat specific JS ---
// (Moved from social.js as these are specific to Talent Club Community)

let currentTCCommunityGroupId = null;
// Consider defining CHAT_POLL_INTERVAL in utils.js or pass as param
const TC_COMMUNITY_POLL_INTERVAL = 7000; // e.g., 7 seconds
let tcCommunityMessagePollIntervalId = null;
let lastTCCommunityMessageTimestamp = 0;

function initializeTCCommunityChat(communityGroupId, userId) {
    console.log(`Initializing TC Community Chat for Group ID: ${communityGroupId}`);
    currentTCCommunityGroupId = communityGroupId;
    // currentChatUserId (from chat.js) could be used or pass userId as param if needed for shared functions.

    const chatWindow = document.getElementById(`tcCommunityChatWindowMessages-${communityGroupId}`);
    const messageForm = document.getElementById(`tcCommunityMessageForm-${communityGroupId}`); // Ensure form has this ID

    if (!chatWindow || !messageForm) {
        console.warn('TC Community chat UI elements not found.');
        return;
    }

    const lastMsgEl = chatWindow.querySelector('.chat-message-wrapper:last-child .message-timestamp');
    if (lastMsgEl && lastMsgEl.title) {
        try {
            lastTCCommunityMessageTimestamp = new Date(lastMsgEl.title.replace(' UTC', '')).getTime();
        } catch(e) { lastTCCommunityMessageTimestamp = Date.now() - (TC_COMMUNITY_POLL_INTERVAL * 2); }
    } else {
        lastTCCommunityMessageTimestamp = Date.now() - (TC_COMMUNITY_POLL_INTERVAL * 2);
    }

    if (chatWindow) chatWindow.scrollTop = 0; // Scroll to bottom (top for column-reverse)

    messageForm.addEventListener('submit', handleTCCommunityMessageSubmit);

    startTCCommunityMessagePolling();
}
window.initializeTCCommunityChat = initializeTCCommunityChat; // Make global

async function handleTCCommunityMessageSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const contentTextarea = form.querySelector('.post-content-textarea');
    const fileInput = form.querySelector('.filepond-input'); // Or your actual file input name/class
    const submitButton = form.querySelector('.post-submit-btn');

    const formData = new FormData(form); // FormData handles text and FilePond-enhanced file inputs

    // Client-side validation (similar to social.js post submit)
    const pondInstance = fileInput ? FilePond.find(fileInput) : null;
    const hasFiles = pondInstance ? pondInstance.getFiles().length > 0 : (fileInput ? fileInput.files.length > 0 : false);
    if (!formData.get('content')?.trim() && !hasFiles) {
        showNexusNotification('Missing Content', 'Please provide text or attach a file.', 'warning');
        return;
    }

    const originalButtonHTML = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Sending...`;

    try {
        const response = await fetch(form.action, { method: 'POST', body: formData, headers: {'X-CSRFToken':getCsrfToken()} });
        const responseData = await response.json();
        if (response.ok && responseData.success && responseData.post_data) { // Expect post_data
            appendTCCommunityMessage(responseData.post_data, window.currentChatUserId || {{ current_user.id | tojson }}); // Use global or pass ID
            form.reset();
            if(contentTextarea) contentTextarea.style.height = 'auto';
            if (pondInstance) pondInstance.removeFiles();
            lastTCCommunityMessageTimestamp = new Date(responseData.post_data.timestamp).getTime();
        } else {
            showNexusNotification('Error', responseData.error || 'Failed to send message.', 'error');
        }
    } catch (error) {
        showNexusNotification('Error', `Message send failed: ${error.message}`, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonHTML;
    }
}

function appendTCCommunityMessage(msgData, currentUserId) {
    const chatWindow = document.getElementById(`tcCommunityChatWindowMessages-${currentTCCommunityGroupId}`);
    if (!chatWindow) return;
    // Use a shared function or duplicate logic from chat.js's appendMessageToChat,
    // adapting for TC Community message structure and HTML partial if different.
    // For now, assuming _chat_message_item.html is compatible.
    const messageHTML = renderChatMessageItem(msgData, currentUserId); // Assumes this function exists
    const placeholder = chatWindow.querySelector('.text-center.text-muted');
    if (placeholder) placeholder.remove();
    chatWindow.insertAdjacentHTML('afterbegin', messageHTML); // Prepend for column-reverse
    chatWindow.scrollTop = 0;
}

// You'll need this function if it's not already in utils.js or globally available
// This is a simplified version of what might be in chat.js or a shared utility
function renderChatMessageItem(messageData, currentUserId) {
    const isSender = messageData.sender_id === currentUserId;
    const senderName = messageData.sender ? (messageData.sender.full_name || messageData.sender.username) : "System";
    let senderAvatar = messageData.sender?.profile_photo_url ? `/static/${messageData.sender.profile_photo_url}` : '/static/img/placeholders/user_avatar_default.png';
    const timestamp = new Date(messageData.timestamp);
    const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let fileHTML = '';
    if (messageData.file) {
        fileHTML = `
            <div class="post-attachment mt-2">
                <a href="${messageData.file.download_url}" target="_blank" class="d-flex align-items-center p-2 rounded bg-light-subtle text-decoration-none border">
                    <i class="bi bi-file-earmark-arrow-down-fill fs-4 me-2 text-primary"></i>
                    <div>
                        <strong class="text-dark">${messageData.file.original_filename}</strong>
                        <small class="d-block text-muted">${(messageData.file.size / 1024).toFixed(1)} KB</small>
                    </div>
                </a>
            </div>`;
    }

    return `
        <div class="chat-message-wrapper d-flex mb-3 ${isSender ? 'justify-content-end' : 'justify-content-start'}" id="message-${messageData.id}">
            <div class="chat-message d-flex flex-column ${isSender ? 'sent align-items-end' : 'received align-items-start'}" style="max-width: 75%;">
                <div class="d-flex align-items-end ${isSender ? 'flex-row-reverse' : ''}">
                    ${!isSender ? `<img src="${senderAvatar}" alt="${senderName}" class="rounded-circle me-2 shadow-sm" style="width: 30px; height: 30px; object-fit: cover;">` : ''}
                    <div class="message-bubble p-2 px-3 shadow-sm">
                        <p class="mb-0 message-content">${messageData.content ? escapeHTML(messageData.content) : ''}</p>
                        ${fileHTML}
                    </div>
                </div>
                <small class="message-timestamp text-muted mt-1 ${isSender ? 'me-1' : 'ms-1'}" title="${timestamp.toLocaleString('en-CA', { timeZone: 'UTC' })} UTC">
                    ${!isSender ? `<span class="fw-medium">${senderName.split(' ')[0]}</span> • ` : ''}${timeString}
                </small>
            </div>
        </div>`;
}
function escapeHTML(str) { // Basic HTML escaping
    return str.replace(/[&<>"']/g, function (match) {
        return { '&': '&', '<': '<', '>': '>', '"': '"', "'": ''' }[match];
    });
}
function getCsrfToken() { // Helper to get CSRF token
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
}


async function fetchNewTCCommunityMessages() {
    if (!currentTCCommunityGroupId) return;
    const apiUrl = `/talent_club/api/community/${currentTCCommunityGroupId}/messages/new?since=${lastTCCommunityMessageTimestamp}`;
    try {
        const data = await getData(apiUrl);
        if (data.messages && data.messages.length > 0) {
            data.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            data.messages.forEach(msg => {
                if (!document.getElementById(`message-${msg.id}`)) {
                    appendTCCommunityMessage(msg, window.currentChatUserId || {{ current_user.id | tojson }}); // Ensure current user ID is available
                }
            });
            lastTCCommunityMessageTimestamp = new Date(data.messages[data.messages.length - 1].timestamp).getTime();
        }
        if (data.latest_timestamp) {
             lastTCCommunityMessageTimestamp = Math.max(lastTCCommunityMessageTimestamp, data.latest_timestamp);
        }
    } catch (error) { console.error('Error polling TC Community messages:', error); }
}

function startTCCommunityMessagePolling() {
    console.log('TC Community message polling started.');
    stopTCCommunityMessagePolling(); // Clear existing before starting new
    fetchNewTCCommunityMessages(); // Initial fetch
    tcCommunityMessagePollIntervalId = setInterval(fetchNewTCCommunityMessages, TC_COMMUNITY_POLL_INTERVAL);
}

function stopTCCommunityMessagePolling() {
    if (tcCommunityMessagePollIntervalId) {
        clearInterval(tcCommunityMessagePollIntervalId);
        tcCommunityMessagePollIntervalId = null;
        console.log('TC Community message polling stopped.');
    }
}
window.addEventListener('beforeunload', stopTCCommunityMessagePolling);