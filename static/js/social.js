// Nexus School Management System - social.js
// Gemini 3 Pro Preview - Phase E.1 (Initial Setup)

"use strict";

document.addEventListener('DOMContentLoaded', function () {
    console.log('Nexus Social JS Initialized.');

    // Event delegation for social content forms (posts)
    document.body.addEventListener('submit', async function(event) {
        const form = event.target.closest('.social-post-creation-form');
        if (form) {
            event.preventDefault();
            await handleSocialPostSubmit(form);
        }

        const commentForm = event.target.closest('.comment-form');
        if (commentForm) {
            event.preventDefault();
            await handleCommentSubmit(commentForm);
        }
    });

    // Event delegation for reaction buttons
    document.body.addEventListener('click', async function(event) {
        const reactionBtn = event.target.closest('.reaction-btn');
        if (reactionBtn) {
            event.preventDefault();
            await handleReactionClick(reactionBtn);
        }

        const deletePostBtn = event.target.closest('.delete-post-btn');
        if (deletePostBtn) {
            event.preventDefault();
            await handleDeletePostClick(deletePostBtn);
        }

        const deleteCommentBtn = event.target.closest('.delete-comment-btn');
        if (deleteCommentBtn) {
            event.preventDefault();
            await handleDeleteCommentClick(deleteCommentBtn);
        }
        // Add handlers for edit buttons later
    });

    // Initialize auto-resize for textareas within social content forms
    document.querySelectorAll('.social-post-creation-form .post-content-textarea, .comment-form .comment-input').forEach(textarea => {
        autoResizeTextarea(textarea);
        textarea.addEventListener('input', () => autoResizeTextarea(textarea));
    });

});

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    let newHeight = textarea.scrollHeight;
    const maxHeight = parseInt(window.getComputedStyle(textarea).maxHeight) || 150; // Default max height or from CSS
    if (newHeight > maxHeight) {
        newHeight = maxHeight;
        textarea.style.overflowY = 'auto';
    } else {
        textarea.style.overflowY = 'hidden';
    }
    textarea.style.height = newHeight + 'px';
}


async function handleSocialPostSubmit(form) {
    const submitButton = form.querySelector('.post-submit-btn');
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Posting...`;

    const formData = new FormData(form);
    // const parentId = form.dataset.parentId; // e.g., channel_id, group_id

    // The submit_url is already in form.action
    try {
        const response = await fetch(form.action, {
            method: 'POST',
            body: formData,
            headers: { // FormData sets Content-Type automatically, but CSRF might be needed
                'X-CSRFToken': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
            }
        });

        const responseData = await response.json(); // Assume backend responds with JSON

        if (response.ok && responseData.success) {
            showNexusNotification('Success!', responseData.message || 'Post created successfully!', 'success');
            form.reset(); // Clear the form
            const contentTextarea = form.querySelector('.post-content-textarea');
            if(contentTextarea) contentTextarea.style.height = 'auto'; // Reset textarea height

            // TODO: Dynamically prepend the new post to the feed
            // This requires the backend to return the rendered HTML of the new post item,
            // or the full post data to construct it on the client-side.
            // Example:
            if (responseData.post_html) {
                const feedContainer = document.querySelector('.social-feed-container'); // Target appropriate container
                if (feedContainer) {
                    feedContainer.insertAdjacentHTML('afterbegin', responseData.post_html);
                }
            } else if (responseData.post_data) {
                // If backend sends raw data, use a function to create and prepend post element
                // prependNewPostElement(responseData.post_data);
                console.log("New post data received:", responseData.post_data, "Implement client-side rendering or reload.");
                // For now, just reload the page to see the new post if no HTML is sent
                window.location.reload();
            } else {
                 window.location.reload(); // Fallback to reload
            }

        } else {
            showNexusNotification('Error!', responseData.error || responseData.message || 'Failed to create post.', 'error');
        }
    } catch (error) {
        console.error('Error submitting social post:', error);
        showNexusNotification('Post Error', `An unexpected error occurred: ${error.message}`, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
}

// Placeholder functions for comments and reactions - to be fleshed out
async function handleCommentSubmit(form) {
    const postId = form.dataset.postId;
    const submitButton = form.querySelector('.comment-submit-btn');
    const textarea = form.querySelector('.comment-input');
    const content = textarea.value.trim();

    if (!content) {
        showNexusNotification('Empty Comment', 'Cannot post an empty comment.', 'warning');
        return;
    }

    const originalButtonHTML = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>`;

    try {
        // TODO: Determine correct POST URL based on post type (channel or TC feed)
        // This will require passing post_type or a specific comment_url to the form/button
        // Example: /social/channels/posts/${postId}/comment or /talent_club/feed/posts/${postId}/comment
        // For now, using a placeholder URL that needs to be set correctly.
        let commentSubmitUrl = '#'; // Placeholder
        const postElement = document.getElementById(`channel_post-${postId}`) || document.getElementById(`tc_feed_post-${postId}`);
        if (postElement && postElement.id.startsWith('channel_post-')) {
            commentSubmitUrl = `/social/channels/posts/${postId}/comment`;
        } else if (postElement && postElement.id.startsWith('tc_feed_post-')) {
            commentSubmitUrl = `/talent_club/feed/posts/${postId}/comment`;
        } else {
             throw new Error("Could not determine comment submission URL.");
        }


        const responseData = await postData(commentSubmitUrl, { content: content });

        if (responseData.success) {
            textarea.value = '';
            textarea.style.height = 'auto';
            showNexusNotification('Comment Posted!', '', 'success');
            // TODO: Dynamically append the new comment
            if (responseData.comment_html) {
                const commentsList = document.getElementById(`comments-list-${postId}`);
                const noCommentsYet = commentsList.querySelector('.no-comments-yet');
                if (noCommentsYet) noCommentsYet.remove();
                commentsList.insertAdjacentHTML('beforeend', responseData.comment_html);
                // Update comment count badge
                const commentToggleBtn = document.querySelector(`[href="#commentsCollapse-${postId}"] .badge`);
                if(commentToggleBtn) commentToggleBtn.textContent = parseInt(commentToggleBtn.textContent || '0') + 1;

            } else {
                console.log("Comment data received:", responseData.comment_data, "Implement client-side rendering or reload.");
                // Simple reload for now if HTML not provided
                // Ideally, the specific comments section should refresh
            }
        } else {
            showNexusNotification('Comment Error', responseData.error || 'Failed to post comment.', 'error');
        }
    } catch (error) {
        console.error('Error submitting comment:', error);
        showNexusNotification('Comment Error', `An unexpected error occurred: ${error.message}`, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonHTML;
    }
}

async function handleReactionClick(button) {
    const postId = button.dataset.postId;
    const reactionType = button.dataset.reactionType; // e.g., 'like', 'love'
    const reactionEmoji = button.querySelector('i.bi').classList.contains('bi-hand-thumbs-up') ? '👍' : (button.querySelector('i.bi').classList.contains('bi-heart') ? '❤️' : '?');

    // TODO: Determine correct POST URL based on post type
    // Example: /social/channels/posts/${postId}/react or /talent_club/feed/posts/${postId}/react
    let reactionUrl = '#';
    const postElement = document.getElementById(`channel_post-${postId}`) || document.getElementById(`tc_feed_post-${postId}`);
        if (postElement && postElement.id.startsWith('channel_post-')) {
            reactionUrl = `/social/channels/posts/${postId}/react`;
        } else if (postElement && postElement.id.startsWith('tc_feed_post-')) {
            reactionUrl = `/talent_club/feed/posts/${postId}/react`;
        } else {
            showNexusNotification('Error', 'Could not determine reaction endpoint.', 'error');
            return;
        }


    try {
        // Optimistic update: toggle active state and count
        const isActive = button.classList.toggle('active'); // Bootstrap 'active' state or a custom one
        const countSpan = button.querySelector('.reaction-count');
        let currentCount = parseInt(countSpan.textContent || '0');
        countSpan.textContent = isActive ? currentCount + 1 : Math.max(0, currentCount - 1);
        if (isActive) { button.classList.add('btn-primary'); button.classList.remove('btn-outline-secondary');}
        else {button.classList.remove('btn-primary'); button.classList.add('btn-outline-secondary');}


        const responseData = await postData(reactionUrl, { emoji: reactionEmoji }); // Send the emoji itself

        if (responseData.success) {
            // Update count from server response if significantly different (handles race conditions)
            if (typeof responseData.new_count === 'number') {
                countSpan.textContent = responseData.new_count;
            }
            // Update active state from server if needed
            if (typeof responseData.user_reacted === 'boolean') {
                if(responseData.user_reacted) {
                    button.classList.add('active', 'btn-primary');
                    button.classList.remove('btn-outline-secondary');
                } else {
                    button.classList.remove('active', 'btn-primary');
                    button.classList.add('btn-outline-secondary');
                }
            }
        } else {
            // Revert optimistic update on failure
            button.classList.toggle('active'); // Toggle back
            countSpan.textContent = currentCount; // Revert count
             if (button.classList.contains('btn-primary')) { button.classList.remove('btn-primary'); button.classList.add('btn-outline-secondary');}
             else {button.classList.add('btn-primary'); button.classList.remove('btn-outline-secondary');}
            showNexusNotification('Reaction Error', responseData.error || 'Failed to apply reaction.', 'error');
        }
    } catch (error) {
        // Revert optimistic update on catastrophic failure
        button.classList.toggle('active');
        countSpan.textContent = currentCount;
        if (button.classList.contains('btn-primary')) { button.classList.remove('btn-primary'); button.classList.add('btn-outline-secondary');}
        else {button.classList.add('btn-primary'); button.classList.remove('btn-outline-secondary');}
        console.error('Error handling reaction:', error);
        showNexusNotification('Reaction Error', `An unexpected error occurred: ${error.message}`, 'error');
    }
}

async function handleDeletePostClick(button) {
    const postId = button.dataset.postId;
    const postType = button.dataset.postType; // 'channel_post' or 'tc_feed_post'

    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: 'var(--nexus-danger)',
        cancelButtonColor: 'var(--nexus-secondary)',
        confirmButtonText: 'Yes, delete it!',
        customClass: {
            popup: 'nexus-swal-popup', title: 'nexus-swal-title', htmlContainer: 'nexus-swal-html-container',
            confirmButton: 'btn btn-danger mx-1', cancelButton: 'btn btn-secondary mx-1'
        },
        buttonsStyling: false
    });

    if (result.isConfirmed) {
        // Determine correct delete URL based on postType
        let deleteUrl = '#';
        if (postType === 'channel_post') {
            deleteUrl = `/social/channels/posts/${postId}/delete`;
        } else if (postType === 'tc_feed_post') {
            deleteUrl = `/talent_club/feed/posts/${postId}/delete`; // Ensure this route exists
        } else {
            showNexusNotification('Error', 'Unknown post type for deletion.', 'error');
            return;
        }

        try {
            const responseData = await postData(deleteUrl, {}); // Empty body for delete usually
            if (responseData.success) {
                showNexusNotification('Deleted!', responseData.message || 'Your post has been deleted.', 'success');
                document.getElementById(`${postType}-${postId}`)?.remove();
            } else {
                showNexusNotification('Error!', responseData.error || 'Failed to delete post.', 'error');
            }
        } catch (error) {
            showNexusNotification('Error!', `Could not delete post: ${error.message}`, 'error');
        }
    }
}


async function handleDeleteCommentClick(button) {
    const commentId = button.dataset.commentId;
    const postId = button.dataset.postId; // Needed for context / determining URL

    const result = await Swal.fire({ /* Similar to delete post confirmation */
        title: 'Delete Comment?',
        text: "This comment will be permanently removed.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: 'var(--nexus-danger)',
        cancelButtonColor: 'var(--nexus-secondary)',
        confirmButtonText: 'Yes, delete comment!',
        customClass: { /* as above */
            popup: 'nexus-swal-popup', title: 'nexus-swal-title', htmlContainer: 'nexus-swal-html-container',
            confirmButton: 'btn btn-danger mx-1', cancelButton: 'btn btn-secondary mx-1'
        },
        buttonsStyling: false
     });

    if (result.isConfirmed) {
        let deleteCommentUrl = '#';
        // Determine post type to build URL
        const postElement = document.getElementById(`channel_post-${postId}`) || document.getElementById(`tc_feed_post-${postId}`);
        if (postElement && postElement.id.startsWith('channel_post-')) {
            deleteCommentUrl = `/social/channels/posts/${postId}/comments/${commentId}/delete`;
        } else if (postElement && postElement.id.startsWith('tc_feed_post-')) {
            deleteCommentUrl = `/talent_club/feed/posts/${postId}/comments/${commentId}/delete`;
        } else {
            showNexusNotification('Error', 'Could not determine comment deletion endpoint context.', 'error');
            return;
        }

        try {
            const responseData = await postData(deleteCommentUrl, {});
            if (responseData.success) {
                showNexusNotification('Deleted!', responseData.message || 'Comment removed.', 'success');
                document.getElementById(`comment-${commentId}`)?.remove();
                // Update comment count badge
                const commentToggleBtn = document.querySelector(`[href="#commentsCollapse-${postId}"] .badge`);
                if(commentToggleBtn) {
                    const newCount = Math.max(0, parseInt(commentToggleBtn.textContent || '0') - 1);
                    commentToggleBtn.textContent = newCount;
                    if (newCount === 0 && !document.getElementById(`comments-list-${postId}`).hasChildNodes()) {
                        document.getElementById(`comments-list-${postId}`).innerHTML = '<p class="text-muted small text-center no-comments-yet">No comments yet. Be the first!</p>';
                    }
                }
            } else {
                showNexusNotification('Error!', responseData.error || 'Failed to delete comment.', 'error');
            }
        } catch (error) {
            showNexusNotification('Error!', `Could not delete comment: ${error.message}`, 'error');
        }
    }
}

// Add FilePond initialization logic here later in Set E.5
// function initializeFilePondInputs() { ... }
// In static/js/social.js

// ... (existing code from E.1 like handleSocialPostSubmit, handleCommentSubmit, etc.) ...

let currentChannelId = null;
let currentChannelPage = 1; // For post pagination
let isLoadingPosts = false;

function initializeSocialFeed(feedType, parentId, userId) {
    // feedType: 'channel', 'group', 'tc_feed'
    // parentId: channel_id, group_id, tc_feed_id
    // userId: current_user.id
    console.log(`Initializing social feed for ${feedType} ID: ${parentId}`);
    currentChannelId = parentId; // Assuming channel for now
    currentChannelPage = 1; // Reset page for new feed view

    const loadMoreButton = document.querySelector(`#loadMorePostsTrigger-${parentId} .load-more-btn`);
    if (loadMoreButton) {
        loadMoreButton.addEventListener('click', function() {
            loadMoreSocialPosts(parentId, this);
        });
        // Optional: Implement intersection observer for infinite scroll
    }

    // Initial setup for comment forms and reaction buttons within the initially loaded posts
    // This might be better handled by event delegation on the feed container.
}

async function loadMoreSocialPosts(parentId, buttonElement) {
    if (isLoadingPosts) return;
    isLoadingPosts = true;
    currentChannelPage++;

    const spinner = buttonElement.querySelector('.spinner-border');
    const buttonText = buttonElement.textContent.replace('Loading...','').trim();
    if(spinner) spinner.classList.remove('d-none');
    buttonElement.disabled = true;
    buttonElement.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Loading...`;


    try {
        // Backend endpoint: e.g., /social/channels/<channel_id>/posts?page=<page_num>
        const responseData = await getData(`/social/channels/${parentId}/posts?page=${currentChannelPage}`);

        if (responseData.success && responseData.posts_html) {
            const feedContainer = document.getElementById(`channelFeedContainer-${parentId}`);
            if (feedContainer) {
                // Remove the old "Load More" trigger before appending new posts
                const oldTrigger = document.getElementById(`loadMorePostsTrigger-${parentId}`);
                if(oldTrigger) oldTrigger.remove();

                feedContainer.insertAdjacentHTML('beforeend', responseData.posts_html);

                if (!responseData.has_next_page) {
                    // No more posts, hide or remove button permanently
                    // Or display "No more posts" message
                } else {
                     // Update button's page number for next click if needed,
                     // or if the new HTML includes a new trigger, that's fine.
                }
            }
        } else if (responseData.success && responseData.posts_html === '') {
            // No more posts
            const oldTrigger = document.getElementById(`loadMorePostsTrigger-${parentId}`);
            if(oldTrigger) oldTrigger.innerHTML = '<p class="text-muted small">No more posts to load.</p>';
        }
        else {
            showNexusNotification('Error', responseData.error || 'Could not load more posts.', 'error');
            currentChannelPage--; // Revert page increment on failure
        }
    } catch (error) {
        console.error('Error loading more posts:', error);
        showNexusNotification('Load Error', `Failed to load more posts: ${error.message}`, 'error');
        currentChannelPage--; // Revert page increment
    } finally {
        isLoadingPosts = false;
        if(spinner) spinner.classList.add('d-none');
        buttonElement.disabled = false; // Re-enable only if there are more pages
        // Check responseData.has_next_page to determine if button should remain active
        // For now, simplistically re-enable with original text.
        const loadMoreTrigger = document.getElementById(`loadMorePostsTrigger-${parentId}`);
        if (loadMoreTrigger && loadMoreTrigger.querySelector('.load-more-btn')) { // check if trigger exists
             loadMoreTrigger.querySelector('.load-more-btn').innerHTML = buttonText;
             loadMoreTrigger.querySelector('.load-more-btn').disabled = !(responseData && responseData.has_next_page);
             if (!(responseData && responseData.has_next_page)) {
                loadMoreTrigger.querySelector('.load-more-btn').classList.add('d-none');
                loadMoreTrigger.insertAdjacentHTML('beforeend', '<p class="text-muted small mt-2">End of feed.</p>');
             }
        }

    }
}

async function handleChannelSubscriptionAction(channelId, action, buttonElement) {
    const originalButtonHTML = buttonElement.innerHTML;
    buttonElement.disabled = true;
    buttonElement.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>`;

    // action should be 'subscribe' or 'unsubscribe'
    const url = `/social/channels/${channelId}/${action}`;

    try {
        const responseData = await postData(url, {}); // No body needed for these actions typically
        if (responseData.success) {
            showNexusNotification('Success!', responseData.message || `Successfully ${action}d.`, 'success');
            // Update button state and subscriber count
            const subscriberCountElement = document.getElementById('subscriberCount'); // Assumes an ID on the count element
            if (subscriberCountElement && typeof responseData.new_subscriber_count === 'number') {
                subscriberCountElement.textContent = responseData.new_subscriber_count;
            }

            if (action === 'subscribe') {
                buttonElement.innerHTML = '<i class="bi bi-bell-slash-fill me-1"></i> Subscribed';
                buttonElement.classList.remove('btn-primary');
                buttonElement.classList.add('btn-outline-secondary');
                buttonElement.dataset.action = 'unsubscribe';
            } else { // unsubscribe
                buttonElement.innerHTML = '<i class="bi bi-bell-fill me-1"></i> Subscribe';
                buttonElement.classList.remove('btn-outline-secondary');
                buttonElement.classList.add('btn-primary');
                buttonElement.dataset.action = 'subscribe';
            }
            // If on 'My Channels' page, might need to move card between tabs or reload section.
            // For simplicity now, a page reload might be acceptable if not on discover page.
            // if (window.location.pathname.includes('/social/channels/list')) { window.location.reload(); }

        } else {
            showNexusNotification('Error', responseData.error || `Failed to ${action}.`, 'error');
            buttonElement.innerHTML = originalButtonHTML; // Revert button on failure
        }
    } catch (error) {
        console.error(`Error with channel ${action}:`, error);
        showNexusNotification('Action Error', `An error occurred: ${error.message}`, 'error');
        buttonElement.innerHTML = originalButtonHTML;
    } finally {
        buttonElement.disabled = false;
    }
}

// Make initializeSocialFeed globally accessible if called from inline script blocks in templates
// window.initializeSocialFeed = initializeSocialFeed;
// In static/js/social.js (add these functions)

// ... (existing code from E.1, E.2 like handleSocialPostSubmit, handleCommentSubmit, etc.) ...

let currentGroupId = null;
// let groupMessagePollIntervalId = null; // Similar to chat.js
// let lastGroupMessageTimestamp = 0;    // Similar to chat.js

function initializeGroupChat(groupId, userId) {
    console.log(`Initializing group chat for Group ID: ${groupId}`);
    currentGroupId = groupId;
    // currentChatUserId = userId; // Already global from chat.js or pass as param

    const groupChatWindow = document.getElementById(`groupChatWindowMessages-${groupId}`);
    const groupMessageForm = document.querySelector(`#groupChatWindowMessages-${groupId} + .group-chat-input-area .social-post-creation-form`);
    // const groupMessageInput = groupMessageForm?.querySelector('.post-content-textarea');
    // const sendGroupMessageBtn = groupMessageForm?.querySelector('.post-submit-btn');

    if (!groupChatWindow || !groupMessageForm) {
        console.warn('Group chat UI elements not found for full dynamic functionality.');
        return;
    }

    // Set initial last message timestamp from existing messages
    const lastMsgEl = groupChatWindow.querySelector('.chat-message-wrapper:last-child .message-timestamp');
    if (lastMsgEl && lastMsgEl.title) {
        // lastGroupMessageTimestamp = new Date(lastMsgEl.title.replace(' UTC', '')).getTime();
    } else {
        // lastGroupMessageTimestamp = Date.now() - (CHAT_POLL_INTERVAL * 2); // Using CHAT_POLL_INTERVAL from chat.js or define new
    }

    // Scroll to bottom (if not using column-reverse for messages)
    // For column-reverse, scroll to top (0)
    if (groupChatWindow) groupChatWindow.scrollTop = 0;


    // The existing handleSocialPostSubmit should work for group messages if:
    // 1. The form action in _social_content_form.html points to the correct group message creation URL.
    // 2. The backend returns JSON with `success: true` and either `post_html` (for a group message) or `post_data`.
    //    The `post_html` should be the rendered `_chat_message_item.html`.
    // 3. A container like `.social-feed-container` (or specific `groupChatWindowMessages-${groupId}`) is targeted for prepending.

    // TODO: Implement polling for new group messages similar to one-on-one chat,
    //       targeting a group-specific API endpoint.
    // startGroupMessagePolling();
}

async function handleGroupMembershipAction(groupId, action, buttonElement) {
    // action: 'leave', 'join_request' (if implemented), etc.
    const originalButtonHTML = buttonElement.innerHTML;
    buttonElement.disabled = true;
    buttonElement.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>`;

    const url = `/social/groups/${groupId}/${action}`; // e.g., /social/groups/1/leave

    try {
        const responseData = await postData(url, {});
        if (responseData.success) {
            showNexusNotification('Success!', responseData.message || `Action '${action}' successful.`, 'success');
            // Depending on action, redirect or update UI
            if (action === 'leave') {
                window.location.href = responseData.redirect_url || '/social/groups'; // Redirect to group list
            } else {
                // Update button or other UI elements
                // buttonElement.innerHTML = originalButtonHTML; // Or update based on new state
            }
        } else {
            showNexusNotification('Error', responseData.error || `Failed to ${action} group.`, 'error');
            buttonElement.innerHTML = originalButtonHTML;
        }
    } catch (error) {
        console.error(`Error with group ${action}:`, error);
        showNexusNotification('Action Error', `An error occurred: ${error.message}`, 'error');
        buttonElement.innerHTML = originalButtonHTML;
    } finally {
        if(action !== 'leave') { // Don't re-enable if navigating away
             buttonElement.disabled = false;
        }
    }
}

// Make initializeGroupChat globally accessible if called from inline script blocks in templates
// window.initializeGroupChat = initializeGroupChat;
// In static/js/social.js (add/modify these functions)

// ... (existing code from E.1, E.2, E.3) ...

// Event delegation for role changes and removals
document.body.addEventListener('change', async function(event) {
    const roleSelectChannel = event.target.closest('.change-channel-role-select');
    if (roleSelectChannel) {
        await handleChannelRoleChange(roleSelectChannel);
    }
    const roleSelectGroup = event.target.closest('.change-group-role-select');
    if (roleSelectGroup) {
        await handleGroupRoleChange(roleSelectGroup);
    }
});

document.body.addEventListener('click', async function(event) {
    // ... (existing click handlers for posts, comments, reactions) ...

    const removeChannelSubBtn = event.target.closest('.remove-channel-subscriber-btn');
    if (removeChannelSubBtn) {
        event.preventDefault();
        await handleRemoveChannelSubscriber(removeChannelSubBtn);
    }

    const removeGroupMemberBtn = event.target.closest('.remove-group-member-btn');
    if (removeGroupMemberBtn) {
        event.preventDefault();
        await handleRemoveGroupMember(removeGroupMemberBtn);
    }
});


async function handleChannelRoleChange(selectElement) {
    const channelId = selectElement.dataset.channelId;
    const subscriberId = selectElement.dataset.subscriberId;
    const newRole = selectElement.value;

    // Add a visual loading state to the select or row
    selectElement.disabled = true;

    try {
        const responseData = await postData(`/social/channels/${channelId}/subscribers/${subscriberId}/update_role`, { role: newRole });
        if (responseData.success) {
            showNexusNotification('Role Updated!', responseData.message || `Role for user ${subscriberId} updated to ${newRole}.`, 'success');
            // Optionally update any visual indicator of the role on the page if not reloading
        } else {
            showNexusNotification('Update Failed', responseData.error || 'Could not update role.', 'error');
            selectElement.value = responseData.previous_role || selectElement.querySelector('option[selected]').value; // Revert on UI
        }
    } catch (error) {
        showNexusNotification('Error', `Error updating role: ${error.message}`, 'error');
        selectElement.value = selectElement.querySelector('option[selected]') ? selectElement.querySelector('option[selected]').value : 'subscriber'; // Revert
    } finally {
        selectElement.disabled = false;
    }
}

async function handleRemoveChannelSubscriber(buttonElement) {
    const channelId = buttonElement.dataset.channelId;
    const subscriberId = buttonElement.dataset.subscriberId;
    const subscriberName = buttonElement.dataset.subscriberName || 'this subscriber';

    const result = await Swal.fire({
        title: `Remove ${subscriberName}?`,
        text: `Are you sure you want to remove ${subscriberName} from this channel?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: 'var(--nexus-danger)',
        cancelButtonColor: 'var(--nexus-secondary)',
        confirmButtonText: 'Yes, remove them!',
        customClass: { /* As defined before */
            popup: 'nexus-swal-popup', title: 'nexus-swal-title', htmlContainer: 'nexus-swal-html-container',
            confirmButton: 'btn btn-danger mx-1', cancelButton: 'btn btn-secondary mx-1'
        },
        buttonsStyling: false
    });

    if (result.isConfirmed) {
        buttonElement.disabled = true; // Disable button during request
        try {
            const responseData = await postData(`/social/channels/${channelId}/subscribers/${subscriberId}/remove`, {});
            if (responseData.success) {
                showNexusNotification('Removed!', responseData.message || `${subscriberName} removed from channel.`, 'success');
                document.getElementById(`subscriber-row-${subscriberId}`)?.remove();
                // TODO: Update subscriber count on the page if displayed
            } else {
                showNexusNotification('Error', responseData.error || 'Failed to remove subscriber.', 'error');
                buttonElement.disabled = false;
            }
        } catch (error) {
            showNexusNotification('Error', `Could not remove subscriber: ${error.message}`, 'error');
            buttonElement.disabled = false;
        }
    }
}


async function handleGroupRoleChange(selectElement) {
    const groupId = selectElement.dataset.groupId;
    const memberId = selectElement.dataset.memberId;
    const newRole = selectElement.value;

    selectElement.disabled = true;
    try {
        const responseData = await postData(`/social/groups/${groupId}/members/${memberId}/update_role`, { role: newRole });
        if (responseData.success) {
            showNexusNotification('Role Updated!', responseData.message || `Role for user ${memberId} updated to ${newRole}.`, 'success');
        } else {
            showNexusNotification('Update Failed', responseData.error || 'Could not update role.', 'error');
            selectElement.value = responseData.previous_role || selectElement.querySelector('option[selected]').value;
        }
    } catch (error) {
        showNexusNotification('Error', `Error updating role: ${error.message}`, 'error');
         selectElement.value = selectElement.querySelector('option[selected]') ? selectElement.querySelector('option[selected]').value : 'member'; // Revert
    } finally {
        selectElement.disabled = false;
    }
}

async function handleRemoveGroupMember(buttonElement) {
    const groupId = buttonElement.dataset.groupId;
    const memberId = buttonElement.dataset.memberId;
    const memberName = buttonElement.dataset.memberName || 'this member';

    const result = await Swal.fire({ /* Similar to remove channel subscriber */
        title: `Remove ${memberName}?`,
        text: `Are you sure you want to remove ${memberName} from this group?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: 'var(--nexus-danger)',
        cancelButtonColor: 'var(--nexus-secondary)',
        confirmButtonText: 'Yes, remove them!',
        customClass: { /* as above */
            popup: 'nexus-swal-popup', title: 'nexus-swal-title', htmlContainer: 'nexus-swal-html-container',
            confirmButton: 'btn btn-danger mx-1', cancelButton: 'btn btn-secondary mx-1'
        },
        buttonsStyling: false
    });

    if (result.isConfirmed) {
        buttonElement.disabled = true;
        try {
            const responseData = await postData(`/social/groups/${groupId}/members/${memberId}/remove`, {});
            if (responseData.success) {
                showNexusNotification('Removed!', responseData.message || `${memberName} removed from group.`, 'success');
                document.getElementById(`member-row-${memberId}`)?.remove();
                // TODO: Update member count on the page if displayed (e.g., on view_group.html header)
                const groupMemberCountEl = document.getElementById('groupMemberCount');
                if(groupMemberCountEl) {
                    const currentCount = parseInt(groupMemberCountEl.textContent || '0');
                    groupMemberCountEl.textContent = Math.max(0, currentCount - 1);
                }
            } else {
                showNexusNotification('Error', responseData.error || 'Failed to remove member.', 'error');
                buttonElement.disabled = false;
            }
        } catch (error) {
            showNexusNotification('Error', `Could not remove member: ${error.message}`, 'error');
            buttonElement.disabled = false;
        }
    }
}
// Nexus School Management System - social.js
// Gemini 3 Pro Preview - Phase E.5 (FilePond Integration)

"use strict";

// ... (existing code from E.1, E.2, E.3, E.4: handleSocialPostSubmit, handleCommentSubmit, etc.) ...

document.addEventListener('DOMContentLoaded', function () {
    console.log('Nexus Social JS Initialized (with FilePond focus).');

    // ... (existing event listeners) ...

    // Initialize FilePond inputs
    initializeAllFilePondInputs();

    // ... (rest of existing DOMContentLoaded code) ...
});

// ... (existing functions like autoResizeTextarea, handleCommentSubmit, handleReactionClick, etc.) ...

// MODIFIED handleSocialPostSubmit to work better if FilePond is used
async function handleSocialPostSubmit(form) {
    const submitButton = form.querySelector('.post-submit-btn');
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Posting...`;

    // FormData will correctly pick up files from FilePond-enhanced inputs
    // as long as the original input element has the correct 'name' attribute.
    const formData = new FormData(form);
    const contentTextarea = form.querySelector('.post-content-textarea');
    const filePondInput = form.querySelector('.filepond-input'); // The original input FilePond enhances

    // Custom check: if FilePond is active on this form, check its files
    // FilePond instance is stored on the element it enhances
    const pondInstance = filePondInput ? FilePond.find(filePondInput) : null;
    const hasFilePondFiles = pondInstance ? pondInstance.getFiles().length > 0 : false;
    const hasRegularFile = filePondInput ? filePondInput.files.length > 0 : false; // Fallback if pond not init

    // Validate: Content OR File required
    if (!formData.get('content')?.trim() && !hasFilePondFiles && !hasRegularFile) {
        showNexusNotification('Missing Content', 'Please provide either text content or attach a file.', 'warning');
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
        return;
    }

    try {
        const response = await fetch(form.action, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                // 'Content-Type' is NOT set here for FormData, browser handles it
            }
        });

        const responseData = await response.json();

        if (response.ok && responseData.success) {
            showNexusNotification('Success!', responseData.message || 'Post created successfully!', 'success');
            form.reset(); // Clear the form text fields
            if (contentTextarea) contentTextarea.style.height = 'auto';

            // Clear FilePond instance if it exists
            if (pondInstance) {
                pondInstance.removeFiles();
            }

            if (responseData.post_html) {
                const feedContainer = document.querySelector('.social-feed-container');
                if (feedContainer) {
                    feedContainer.insertAdjacentHTML('afterbegin', responseData.post_html);
                    // Re-initialize any JS on the new post (e.g., comment toggles, if not using delegation)
                }
            } else if (responseData.post_data) {
                console.log("New post data received:", responseData.post_data, "Implement client-side rendering or reload.");
                window.location.reload(); // Fallback
            } else {
                window.location.reload(); // Fallback
            }
        } else {
            showNexusNotification('Error!', responseData.error || responseData.message || 'Failed to create post.', 'error');
        }
    } catch (error) {
        console.error('Error submitting social post:', error);
        showNexusNotification('Post Error', `An unexpected error occurred: ${error.message}`, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
}


// --- FilePond Initialization ---
function initializeAllFilePondInputs() {
    // Register FilePond plugins
    FilePond.registerPlugin(
        FilePondPluginFileValidateType,
        FilePondPluginFileValidateSize,
        FilePondPluginImagePreview,
        FilePondPluginImageExifOrientation,
        FilePondPluginFilePoster
    );

    const fileInputs = document.querySelectorAll('input.filepond-input');
    fileInputs.forEach(inputElement => {
        // Get config from data attributes
        const maxFileSize = inputElement.dataset.maxFileSize || '16MB';
        let acceptedFileTypes = null;
        if (inputElement.dataset.acceptedFileTypes) {
            try {
                acceptedFileTypes = JSON.parse(inputElement.dataset.acceptedFileTypes.replace(/'/g, '"'));
            } catch (e) {
                console.warn('Could not parse accepted file types for FilePond input:', inputElement.dataset.acceptedFileTypes, e);
            }
        }

        const pond = FilePond.create(inputElement, {
            labelIdle: `Drag & Drop your file or <span class="filepond--label-action">Browse</span>`,
            maxFileSize: maxFileSize,
            acceptedFileTypes: acceptedFileTypes, // Array of mimetypes or extensions
            allowMultiple: false, // Set to true if PostContentForm.attached_file is a MultipleFileField
            imagePreviewHeight: 170,
            imageCropAspectRatio: '1:1', // Optional: if you want square previews
            imageResizeTargetWidth: 200,
            imageResizeTargetHeight: 200,
            stylePanelLayout: 'compact integrated', // Or 'circle', 'compact', etc.
            styleLoadIndicatorPosition: 'center bottom',
            styleProgressIndicatorPosition: 'right bottom',
            styleButtonRemoveItemPosition: 'left bottom',
            styleButtonProcessItemPosition: 'right bottom',

            // File Poster plugin options (shows a poster for videos/PDFs)
            filePosterMaxHeight: 256,

            // Server configuration (optional for FilePond, as we submit with main form)
            // If you wanted FilePond to handle individual uploads via AJAX to a temp store:
            // server: {
            //     url: '/filepond/api', // Your backend endpoint for FilePond
            //     process: '/process', // Process temporary upload
            //     revert: '/revert',   // Revert temporary upload
            //     load: '/load/',      // Load existing file (e.g. when editing a post)
            //     headers: {
            //         'X-CSRFToken': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
            //     }
            // }
        });

        // Store pond instance on the element for later access (e.g., in handleSocialPostSubmit)
        // FilePond.find(inputElement) can also retrieve it.
        // inputElement._filepond = pond; // Example if needed, but FilePond.find is preferred

        // Handle FilePond errors displayed via its own UI
        // pond.on('error', (error, file) => {
        //     showNexusNotification('File Upload Error', `${error.main} ${error.sub || ''}`, 'error');
        // });
    });
}
// In static/js/talent_club.js

// ... (existing code from F.1) ...

let currentTCClubId = null;
let currentTCFeedPage = 1;
let isLoadingTCPosts = false;

function initializeTCFeed(clubId, userId) {
    console.log(`Initializing TC Feed for Club ID: ${clubId}`);
    currentTCClubId = clubId;
    // currentChatUserId = userId; // If needed for context

    currentTCFeedPage = 1; // Reset page for new feed view

    const loadMoreButton = document.querySelector(`#loadMoreTcPostsTrigger-${clubId} .load-more-tc-posts-btn`);
    if (loadMoreButton) {
        loadMoreButton.addEventListener('click', function() {
            loadMoreTcFeedPosts(clubId, this);
        });
    }

    // Event delegation for forms and buttons within the TC feed container
    const feedContainer = document.getElementById(`tcFeedContainer-${clubId}`);
    if (feedContainer) {
        // Post form is outside this container, handled by general social.js for now
        // If _social_content_form's submit URL is dynamic for TC, social.js should handle it.

        // Comment submission
        feedContainer.addEventListener('submit', async function(event) {
            const commentForm = event.target.closest('.tc-comment-form');
            if (commentForm) {
                event.preventDefault();
                await handleTCCommentSubmit(commentForm); // New specific handler
            }
        });

        // Reactions, Delete Post, Edit Post, Delete Comment
        feedContainer.addEventListener('click', async function(event) {
            const reactionBtn = event.target.closest('.tc-reaction-btn');
            if (reactionBtn) {
                event.preventDefault();
                await handleTCReactionClick(reactionBtn); // New specific handler
            }
            const deletePostBtn = event.target.closest('.delete-tc-feed-post-btn');
            if (deletePostBtn) {
                event.preventDefault();
                await handleDeleteTCFeedPost(deletePostBtn); // New specific handler
            }
            const deleteCommentBtn = event.target.closest('.delete-comment-btn'); // Assuming same class as social
            if (deleteCommentBtn && event.target.closest('.tc-feed-post-item')) { // Ensure it's a TC comment
                event.preventDefault();
                await handleDeleteTCFeedComment(deleteCommentBtn); // New specific handler
            }
            // Add edit handlers
        });
    }
}

async function loadMoreTcFeedPosts(clubId, buttonElement) {
    // ... similar to loadMoreSocialPosts, but URL is /talent_club/<club_id>/feed/posts?page=...
    // ... appends responseData.posts_html (rendered _tc_feed_post_item.html)
    // ... to #tcFeedContainer-<clubId>
    if (isLoadingTCPosts) return;
    isLoadingTCPosts = true;
    currentTCFeedPage++;

    const spinner = buttonElement.querySelector('.spinner-border');
    const buttonText = buttonElement.textContent.replace('Loading...','').trim();
    if(spinner) spinner.classList.remove('d-none');
    buttonElement.disabled = true;
    buttonElement.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Loading...`;

    try {
        const responseData = await getData(`/talent_club/${clubId}/feed/posts?page=${currentTCFeedPage}`);
        if (responseData.success && responseData.posts_html) {
            const feedContainer = document.getElementById(`tcFeedContainer-${clubId}`);
            const loadMoreTrigger = document.getElementById(`loadMoreTcPostsTrigger-${clubId}`);
            
            if (feedContainer) {
                if(loadMoreTrigger) loadMoreTrigger.remove(); // Remove old trigger before adding new content
                feedContainer.insertAdjacentHTML('beforeend', responseData.posts_html); // Append new posts AND new trigger if has_next_page

                if (!responseData.has_next_page && !feedContainer.querySelector('.end-of-feed-msg')) {
                     feedContainer.insertAdjacentHTML('beforeend', '<p class="text-muted small text-center mt-3 end-of-feed-msg">End of feed.</p>');
                }
            }
             buttonElement.dataset.currentPage = currentTCFeedPage; // Update current page on button
        } else if (responseData.success && responseData.posts_html === '') {
             const loadMoreTrigger = document.getElementById(`loadMoreTcPostsTrigger-${clubId}`);
             if(loadMoreTrigger) loadMoreTrigger.innerHTML = '<p class="text-muted small text-center mt-3">No more posts to load.</p>';
        } else {
            showNexusNotification('Error', responseData.error || 'Could not load more posts.', 'error');
            currentTCFeedPage--;
        }
    } catch (error) { /* ... error handling ... */ currentTCFeedPage--; }
    finally { /* ... reset button state ... */ isLoadingTCPosts = false; /* Check has_next_page for disabling */ }
}

async function handleTCCommentSubmit(form) {
    const postId = form.dataset.postId;
    const submitButton = form.querySelector('.tc-comment-submit-btn');
    const textarea = form.querySelector('.comment-input');
    const content = textarea.value.trim();
    if (!content) { /* ... */ return; }
    // ... (AJAX to /talent_club/feed/posts/<post_id>/comment) ...
    // ... (Append responseData.comment_html (rendered _social_comment_item) to #tc-comments-list-<post_id>) ...
    // ... (Update comment count badge) ...
    // Similar to handleCommentSubmit in social.js, adapt URLs and element IDs.
     const originalButtonHTML = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
    try {
        const responseData = await postData(`/talent_club/feed/posts/${postId}/comment`, { content });
        if (responseData.success) {
            textarea.value = ''; textarea.style.height = 'auto';
            showNexusNotification('Comment Posted!', '', 'success');
            if (responseData.comment_html) {
                const commentsList = document.getElementById(`tc-comments-list-${postId}`);
                const noCommentsYet = commentsList.querySelector('.no-comments-yet');
                if (noCommentsYet) noCommentsYet.remove();
                commentsList.insertAdjacentHTML('beforeend', responseData.comment_html);
                const commentToggleBtn = document.querySelector(`[href="#tcCommentsCollapse-${postId}"] .badge`);
                if(commentToggleBtn) commentToggleBtn.textContent = parseInt(commentToggleBtn.textContent || '0') + 1;
            }
        } else { /* ... error handling ... */ }
    } catch (error) { /* ... error handling ... */ }
    finally { submitButton.disabled = false; submitButton.innerHTML = originalButtonHTML; }
}

async function handleTCReactionClick(buttonElement) {
    const postId = buttonElement.dataset.postId;
    const emoji = buttonElement.dataset.reactionEmoji;
    // ... (AJAX to /talent_club/feed/posts/<post_id>/react with {emoji: emoji}) ...
    // ... (Optimistic UI update for reaction button and count span) ...
    // Similar to handleReactionClick in social.js, adapt URLs.
    const countSpan = buttonElement.querySelector('.reaction-count');
    const currentCount = parseInt(countSpan.textContent || '0');
    const isActive = buttonElement.classList.toggle('active'); // Custom 'active' state
    
    if(isActive) { buttonElement.classList.add('btn-primary'); buttonElement.classList.remove('btn-outline-secondary'); }
    else { buttonElement.classList.remove('btn-primary'); buttonElement.classList.add('btn-outline-secondary'); }
    countSpan.textContent = isActive ? currentCount + 1 : Math.max(0, currentCount - 1);

    try {
        const responseData = await postData(`/talent_club/feed/posts/${postId}/react`, { emoji });
        if (responseData.success) {
            if (typeof responseData.new_count === 'number') countSpan.textContent = responseData.new_count;
            if (typeof responseData.user_reacted === 'boolean') { /* update active state from server */ }
        } else { /* revert optimistic update */ }
    } catch (error) { /* revert optimistic update, error handling */ }
}

async function handleDeleteTCFeedPost(buttonElement) {
    const postId = buttonElement.dataset.postId;
    // ... (SweetAlert2 confirmation) ...
    // ... (AJAX POST to /talent_club/feed/posts/<post_id>/delete) ...
    // ... (Remove #tc_feed_post-<post_id> element on success) ...
    // Similar to handleDeletePostClick in social.js, adapt URLs and element IDs.
    const result = await Swal.fire({ title: 'Delete Post?', text: "This action cannot be undone.", icon: 'warning', /* ... */ });
    if (result.isConfirmed) {
        try {
            const responseData = await postData(`/talent_club/feed/posts/${postId}/delete`, {});
            if (responseData.success) {
                showNexusNotification('Deleted!', 'Post removed.', 'success');
                document.getElementById(`tc_feed_post-${postId}`)?.remove();
            } else { /* ... error handling ... */ }
        } catch (error) { /* ... error handling ... */ }
    }
}
async function handleDeleteTCFeedComment(buttonElement) {
    const commentId = buttonElement.dataset.commentId;
    const postId = buttonElement.dataset.postId;
    // ... (SweetAlert2 confirmation) ...
    // ... (AJAX POST to /talent_club/feed/posts/<post_id>/comments/<comment_id>/delete) ...
    // ... (Remove #comment-<comment_id> element and update count on success) ...
    // Similar to handleDeleteCommentClick in social.js, adapt URLs and element IDs.
     const result = await Swal.fire({ title: 'Delete Comment?', text: "This comment will be removed.", icon: 'warning', /* ... */ });
    if (result.isConfirmed) {
        try {
            const responseData = await postData(`/talent_club/feed/posts/${postId}/comments/${commentId}/delete`, {});
            if (responseData.success) {
                showNexusNotification('Deleted!', 'Comment removed.', 'success');
                document.getElementById(`comment-${commentId}`)?.remove();
                const commentToggleBtn = document.querySelector(`[href="#tcCommentsCollapse-${postId}"] .badge`);
                if(commentToggleBtn) commentToggleBtn.textContent = Math.max(0, parseInt(commentToggleBtn.textContent || '0') - 1);
            } else { /* ... error handling ... */ }
        } catch (error) { /* ... error handling ... */ }
    }
}


// window.initializeTCFeed = initializeTCFeed; // Make global if needed
