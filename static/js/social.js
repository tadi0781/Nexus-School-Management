// static/js/social.js
"use strict";

// Assuming nexusRealtimeManager is from socketHandlers.js (globally available)
// Assuming showNexusNotification, postData, getData from utils.js (globally available)

const nexusSocial = {
    // --- Configuration for current feed view ---
    config: {
        feedType: null, // 'global', 'channel', 'group', 'tc_feed'
        parentId: null,   // channel_id, group_id, etc. (null for global)
        currentPage: 1,
        isLoadingMore: false,
        apiEndpoints: {
            global: {
                fetchPosts: '/api/v1/global_posts',
                createPost: '/api/v1/global_posts', // Matches your app.py route for GlobalPost
                createComment: '/api/v1/global_posts/{postId}/comments',
                toggleLike: '/api/v1/global_posts/{postId}/like',
                deletePost: '/api/v1/global_posts/{postId}',
                deleteComment: '/api/v1/global_comments/{commentId}', // Corrected endpoint
                fetchComments: '/api/v1/global_posts/{postId}/comments' // API to fetch comments
            },
            // Define endpoints for 'channel', 'group', 'tc_feed' if needed for unified handling
        },
        uiSelectors: {
            feedContainer: null,
            loadingPlaceholder: null,
            emptyPlaceholder: null,
            loadMoreTrigger: null,
            createForm: null,
        },
        postTemplateFunction: null, // Will be set to a function that renders a post item
        commentTemplateFunction: null // Will be set to a function that renders a comment item
    },
    // Add this function inside the nexusSocial object
    // Add these functions inside the nexusSocial object

    handleShare: function(buttonElement) {
        const url = buttonElement.dataset.shareUrl;
        if (navigator.share) {
            navigator.share({
                title: 'Check out this post from Nexus',
                url: url
            }).catch(err => console.error("Share failed:", err));
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                showNexusNotification('Link copied to clipboard!', 'success');
            }).catch(err => {
                showNexusNotification('Failed to copy link.', 'error');
            });
        } else {
            // Fallback for older browsers
            window.open(url, '_blank');
        }
    },
    // Add this function inside the nexusSocial object

    observePostVisibility: function() {
        if (!('IntersectionObserver' in window) || typeof nexusRealtimeManager === 'undefined') {
            return; // Don't run if browser doesn't support it or the manager isn't ready
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const postId = entry.target.dataset.postId;
                const postType = entry.target.dataset.postType;
                if (!postId) return;

                if (entry.isIntersecting) {
                    // Post is in view, join its real-time update room
                    nexusRealtimeManager.joinPostRoom(postId, postType);
                } else {
                    // Post is out of view, leave the room to save resources
                    nexusRealtimeManager.leavePostRoom(postId, postType);
                }
            });
        }, { rootMargin: '150px 0px', threshold: 0.01 }); // A larger rootMargin pre-loads/unloads posts that are slightly off-screen

        // Use a MutationObserver to automatically observe new posts as they are loaded into the feed
        const mutationObserver = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1 && node.matches('.social-post-item')) {
                        observer.observe(node);
                    }
                }
                for (const node of mutation.removedNodes) {
                    if (node.nodeType === 1 && node.matches('.social-post-item')) {
                        observer.unobserve(node);
                    }
                }
            }
        });

        mutationObserver.observe(this.config.uiSelectors.feedContainer, { childList: true });
    },

    handleSaveItem: async function(buttonElement) {
        const { itemId, itemType } = buttonElement.dataset;
        const isSaved = buttonElement.classList.contains('active');
        const endpoint = this.config.apiEndpoints.global.saveItem; // Assuming a single endpoint for all saves

        this.setButtonLoading(buttonElement, true, ""); // Show spinner only

        try {
            let responseData;
            if (isSaved) {
                // To unsave, we send a DELETE request. Assumes deleteData helper in utils.js
                responseData = await deleteData(`${endpoint}?item_type=${itemType}&item_id=${itemId}`);
            } else {
                responseData = await postData(endpoint, { item_type: itemType, item_id: itemId });
            }

            if (responseData.success) {
                buttonElement.classList.toggle('active', !isSaved);
                const textElement = buttonElement.querySelector('.save-text');
                if (textElement) textElement.textContent = isSaved ? 'Save' : 'Saved';
                showNexusNotification(responseData.message, 'success');
            } else {
                showNexusNotification(responseData.error, 'danger');
            }
        } catch (error) {
            showNexusNotification('Failed to update save status.', 'danger');
        } finally {
            const originalText = buttonElement.classList.contains('active') ? 'Saved' : 'Save';
            this.setButtonLoading(buttonElement, false, `<i class="bi bi-bookmark"></i> <span class="save-text">${originalText}</span>`);
        }
    },

    handleLoadMoreComments: async function(buttonElement) {
        const postId = buttonElement.dataset.postId;
        const postType = buttonElement.dataset.postType;
        let currentPage = parseInt(buttonElement.dataset.currentPage || '1');
        
        this.setButtonLoading(buttonElement, true, "Loading...");

        try {
            const endpoint = this.config.apiEndpoints[postType].fetchComments.replace('{postId}', postId);
            const responseData = await getData(`${endpoint}?page=${currentPage + 1}`);

            if (responseData.success && responseData.comments.length > 0) {
                const commentsList = document.getElementById(`comments-list-${postType}_post-${postId}`);
                responseData.comments.forEach(commentJson => {
                    const commentElement = this.config.commentTemplateFunction(commentJson, postId, postType);
                    commentsList.appendChild(commentElement);
                });
                
                // Update the button for the next page
                buttonElement.dataset.currentPage = currentPage + 1;
            }

            // Hide the button if there are no more pages
            if (!responseData.pagination.has_next) {
                buttonElement.parentElement.classList.add('d-none');
            }
        } catch (error) {
            showNexusNotification('Error', 'Could not load more comments.', 'error');
        } finally {
            this.setButtonLoading(buttonElement, false, "Load more comments");
        }
    },

    initGlobalFeed: function(initialConfig) {
        console.log('Initializing Global Feed...');
        this.config.feedType = 'global';
        this.config.parentId = null;
        this.config.currentPage = 1;
        this.config.isLoadingMore = false;

        this.config.uiSelectors.feedContainer = document.getElementById(initialConfig.feedContainerId);
        this.config.uiSelectors.loadingPlaceholder = document.getElementById(initialConfig.loadingPlaceholderId);
        this.config.uiSelectors.emptyPlaceholder = document.getElementById(initialConfig.emptyPlaceholderId);
        this.config.uiSelectors.loadMoreTrigger = document.getElementById(initialConfig.loadMoreTriggerId);
        this.config.uiSelectors.createForm = document.getElementById(initialConfig.createFormId);
        
        // Define client-side template functions based on your HTML partials
        // These will take a data object and return an HTML string or a DOM element
        this.config.postTemplateFunction = this.renderGlobalPostItem; // Link to the rendering function
        this.config.commentTemplateFunction = this.renderCommentItem; // Link to the rendering function


        if (!this.config.uiSelectors.feedContainer) {
            console.error("Global feed container not found:", initialConfig.feedContainerId);
            return;
        }

        this.loadInitialPosts();
        this.observePostVisibility();
        this.setupGlobalEventListeners();
        this.registerGlobalRealtimeHandlers();
        initializeAllFilePondInputs(); // From existing social.js, ensure it's available
    },

    loadInitialPosts: async function() {
        if (this.config.uiSelectors.loadingPlaceholder) this.config.uiSelectors.loadingPlaceholder.classList.remove('d-none');
        if (this.config.uiSelectors.emptyPlaceholder) this.config.uiSelectors.emptyPlaceholder.classList.add('d-none');
        this.config.uiSelectors.feedContainer.innerHTML = ''; // Clear previous

        await this.fetchAndRenderPosts(1);
        
        if (this.config.uiSelectors.loadingPlaceholder) this.config.uiSelectors.loadingPlaceholder.classList.add('d-none');
        if (this.config.uiSelectors.feedContainer.children.length === 0 && this.config.uiSelectors.emptyPlaceholder) {
            this.config.uiSelectors.emptyPlaceholder.classList.remove('d-none');
        }
    },

    fetchAndRenderPosts: async function(page, prepend = false) {
        const currentConfig = this.config; // Use 'this.config' consistently
        if (currentConfig.isLoadingMore && page > 1) return;
        if (page > 1) currentConfig.isLoadingMore = true;

        const loadMoreButton = currentConfig.uiSelectors.loadMoreTrigger?.querySelector('.load-more-btn');
        if (loadMoreButton && page > 1) {
            loadMoreButton.disabled = true;
            loadMoreButton.querySelector('.spinner-border')?.classList.remove('d-none');
        }

        try {
            const endpoint = currentConfig.apiEndpoints[currentConfig.feedType].fetchPosts;
            const url = `${endpoint}?page=${page}`;
            const responseData = await getData(url); // from utils.js

            if (responseData.success && responseData.posts) {
                if (responseData.posts.length > 0) {
                    responseData.posts.forEach(postJson => {
                        const postElement = currentConfig.postTemplateFunction(postJson, currentConfig.feedType);
                        if (prepend) {
                            currentConfig.uiSelectors.feedContainer.prepend(postElement);
                        } else {
                            currentConfig.uiSelectors.feedContainer.appendChild(postElement);
                        }
                    });
                    currentConfig.currentPage = page;
                    if (currentConfig.uiSelectors.emptyPlaceholder) currentConfig.uiSelectors.emptyPlaceholder.classList.add('d-none');
                } else if (page === 1) { // No posts at all
                    if (currentConfig.uiSelectors.emptyPlaceholder) currentConfig.uiSelectors.emptyPlaceholder.classList.remove('d-none');
                }

                if (currentConfig.uiSelectors.loadMoreTrigger) {
                    currentConfig.uiSelectors.loadMoreTrigger.classList.toggle('d-none', !responseData.pagination.has_next);
                }
            } else {
                console.warn('No posts data in response or request failed silently:', responseData);
                if (page === 1 && currentConfig.uiSelectors.emptyPlaceholder) currentConfig.uiSelectors.emptyPlaceholder.classList.remove('d-none');
                if (currentConfig.uiSelectors.loadMoreTrigger) currentConfig.uiSelectors.loadMoreTrigger.classList.add('d-none');
            }
        } catch (error) {
            console.error(`Error fetching ${currentConfig.feedType} posts:`, error);
            // Do not show generic notification if it's just empty (handled by placeholders)
            if (page === 1 && currentConfig.uiSelectors.emptyPlaceholder) {
                currentConfig.uiSelectors.emptyPlaceholder.innerHTML = `<p class="text-danger">Could not load feed: ${error.message}</p>`;
                currentConfig.uiSelectors.emptyPlaceholder.classList.remove('d-none');
            } else if (page > 1) { // Error on "load more"
                showNexusNotification('Error Loading More Posts', error.message || 'Could not load more posts.', 'error');
            }
        } finally {
            if (page > 1) currentConfig.isLoadingMore = false;
            if (loadMoreButton && page > 1) {
                loadMoreButton.disabled = ! (responseData && responseData.pagination && responseData.pagination.has_next); // Disable if no more
                loadMoreButton.querySelector('.spinner-border')?.classList.add('d-none');
                 if (!(responseData && responseData.pagination && responseData.pagination.has_next)) {
                    loadMoreButton.textContent = "End of Feed";
                 }
            }
        }
    },

    renderGlobalPostItem: function(postData, postType = 'global') {
        // This function takes the JSON 'postData' from the API
        // and constructs the HTML element based on the structure of _global_post_item.html
        // Returns a DOM element.
        const postDomId = `${postType}_post-${postData.id}`;
        const currentUserIdString = document.body.dataset.currentUserId; // Assuming current_user.id is available on body
        // static/js/social.js (nexusSocial object)

// ... (existing config) ...

// Modify renderGlobalPostItem (or where post element is added to DOM)
renderGlobalPostItem: function(postData, postType = 'global') {
    // ... (existing rendering logic) ...
    const div = document.createElement('div');
    // ... (populate div.innerHTML or DOM structure) ...
    div.className = 'card social-post-item mb-3 shadow-sm'; // Ensure this class for IntersectionObserver
    div.id = `${postType}_post-${postData.id}`;
    div.dataset.postId = postData.id;
    div.dataset.postType = postType;

    // BEGIN IMPLEMENTATION - Task A5 (Join Room)
    if (window.nexusRealtimeManager && postType === 'global') { // Only for global posts for now
        window.nexusRealtimeManager.joinPostRoom(postData.id, 'global_post');
    }
    // END IMPLEMENTATION - Task A5

    return div;
},

initGlobalFeed: function(initialConfig) {
    // ... (existing init logic) ...
    this.loadInitialPosts();
    this.setupGlobalEventListeners();
    this.registerGlobalRealtimeHandlers();
    // Assuming initializeAllFilePondInputs is called elsewhere globally (e.g. main.js)

    // BEGIN IMPLEMENTATION - Task A5 (IntersectionObserver for leaving rooms)
    if (window.nexusRealtimeManager && 'IntersectionObserver' in window) {
        const observerOptions = {
            root: null, // viewport
            rootMargin: '0px',
            threshold: 0.01 // Trigger when even 1% is visible/hidden
        };

        const postObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                const postId = entry.target.dataset.postId;
                const postType = entry.target.dataset.postType;
                if (!postId || postType !== 'global_post') return;

                if (!entry.isIntersecting) {
                    // Post is out of view
                    window.nexusRealtimeManager.leavePostRoom(postId, 'global_post');
                } else {
                    // Post is in view - might have already joined in renderGlobalPostItem
                    // or could re-join if there's a chance of disconnect/reconnect.
                    // For simplicity, join on render, leave on disappear.
                    // window.nexusRealtimeManager.joinPostRoom(postId, 'global_post'); // Re-join if needed
                }
            });
        }, observerOptions);

        // Observe existing posts if any were rendered server-side (not typical for this feed)
        // And new posts as they are added by fetchAndRenderPosts
        const feedContainer = this.config.uiSelectors.feedContainer;
        if (feedContainer) {
            // Observe dynamically added posts
            const mutationObserver = new MutationObserver(mutationsList => {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === 1 && node.classList.contains('social-post-item') && node.dataset.postType === 'global') {
                                postObserver.observe(node);
                            }
                        });
                        mutation.removedNodes.forEach(node => {
                             if (node.nodeType === 1 && node.classList.contains('social-post-item') && node.dataset.postType === 'global') {
                                postObserver.unobserve(node);
                                // Also explicitly leave room if removed, not just hidden
                                window.nexusRealtimeManager.leavePostRoom(node.dataset.postId, 'global_post');
                            }
                        });
                    }
                }
            });
            mutationObserver.observe(feedContainer, { childList: true });
        }
         // Optional: cleanup observer on page unload if this object persists
         // window.addEventListener('beforeunload', () => {
         //    if (postObserver) postObserver.disconnect();
         //    if (mutationObserver) mutationObserver.disconnect();
         // });
    }
    // END IMPLEMENTATION - Task A5
},
// ... (rest of nexusSocial object)

        const canEditDelete = (postData.author && postData.author.id.toString() === currentUserIdString) || 
                              (window.currentUserRole && ['system_admin', 'hr_ceo'].includes(window.currentUserRole));


        const div = document.createElement('div');
        div.className = 'card social-post-item mb-3 shadow-sm';
        div.id = postDomId;
        div.dataset.postId = postData.id;
        div.dataset.postType = postType;

        // --- Build innerHTML using template literals and postData ---
        // This is a direct translation of your _global_post_item.html structure
        // Make sure to properly escape data if inserting directly or use DOM methods.
        div.innerHTML = `
            <div class="card-body">
                <div class="d-flex align-items-center mb-3">
                    <a href="/user/${postData.author.id}" class="flex-shrink-0"> {# TODO: Replace with url_for('user_profile_view', user_id=...) if possible from JS #}
                        <img src="${postData.author.profile_photo_url || '/static/img/placeholders/user_avatar_default.png'}"
                             alt="${postData.author.full_name || postData.author.username}'s avatar" class="rounded-circle me-3" width="48" height="48" style="object-fit: cover;">
                    </a>
                    <div class="flex-grow-1">
                        <a href="/user/${postData.author.id}" class="fw-bold text-dark text-decoration-none font-heading">${postData.author.full_name || postData.author.username}</a>
                        <div class="text-muted small">
                            <i class="bi bi-clock"></i> 
                            <span class="post-timestamp" title="${new Date(postData.timestamp).toLocaleString()}">
                                ${humanizeTimeDiff(postData.timestamp)}
                            </span>
                            ${postData.is_edited ? '<span class="fst-italic ms-1">(edited)</span>' : ''}
                        </div>
                    </div>
                    ${canEditDelete ? `
                    <div class="dropdown">
                        <button class="btn btn-sm btn-light border-0" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Post options">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            ${postData.author.id.toString() === currentUserIdString ? `<li><a class="dropdown-item edit-post-btn" href="#" data-post-id="${postData.id}" data-post-type="${postType}"><i class="bi bi-pencil me-2"></i>Edit Post</a></li>` : ''}
                            <li><button class="dropdown-item text-danger delete-post-btn" data-post-id="${postData.id}" data-post-type="${postType}"><i class="bi bi-trash me-2"></i>Delete Post</button></li>
                        </ul>
                    </div>` : ''}
                </div>

                ${postData.content ? `<div class="post-content-text mb-3">${postData.content.replace(/\n/g, '<br>')}</div>` : ''}

                ${postData.file ? `
                    <div class="post-attachment mb-3">
                        ${postData.file.mimetype && postData.file.mimetype.startsWith('image/') ? `
                            <a href="${postData.file.download_url}" data-bs-toggle="modal" data-bs-target="#viewFileModal" data-file-url="${postData.file.download_url}" data-file-mimetype="${postData.file.mimetype}" data-file-name="${postData.file.original_filename}">
                                <img src="${postData.file.download_url}" class="img-fluid rounded border" alt="Attachment: ${postData.file.original_filename}" style="max-height: 450px; object-fit: contain; cursor: pointer;">
                            </a>
                        ` : (postData.file.mimetype && postData.file.mimetype.startsWith('video/') ? `
                            <video controls class="img-fluid rounded border" style="max-height: 450px; width:100%;">
                                <source src="${postData.file.download_url}" type="${postData.file.mimetype}">
                                Your browser does not support the video tag.
                            </video>
                        ` : `
                            <div class="d-flex align-items-center p-2 border rounded-3 bg-light-subtle">
                                <i class="bi bi-file-earmark-text-fill fs-2 me-2 text-secondary"></i>
                                <div class="flex-grow-1">
                                    <a href="${postData.file.download_url}" class="fw-semibold text-decoration-none stretched-link" target="_blank" download="${postData.file.original_filename}">
                                        ${postData.file.original_filename}
                                    </a>
                                    <div class="text-muted small">
                                        ${(postData.file.size > 1024*1024) ? (postData.file.size / (1024*1024)).toFixed(2) + ' MB' : (postData.file.size / 1024).toFixed(1) + ' KB'}
                                        ${postData.file.mimetype ? ` - ${postData.file.mimetype}` : ''}
                                    </div>
                                </div>
                                 <a href="${postData.file.download_url}" class="btn btn-sm btn-outline-secondary ms-2" download="${postData.file.original_filename}" aria-label="Download file">
                                    <i class="bi bi-download"></i>
                                </a>
                            </div>
                        `)}
                    </div>
                ` : ''}

                <div class="post-actions d-flex justify-content-start align-items-center gap-2 border-top pt-2 mt-2">
                    <button class="btn btn-subtle btn-sm reaction-btn like-post-btn ${postData.current_user_liked ? 'active' : ''}" 
                            data-post-id="${postData.id}" data-post-type="${postType}" aria-pressed="${postData.current_user_liked}">
                        <i class="bi ${postData.current_user_liked ? 'bi-heart-fill text-danger' : 'bi-heart'}"></i> 
                        <span class="like-text">${postData.current_user_liked ? 'Liked' : 'Like'}</span>
                        (<span class="like-count">${postData.like_count || 0}</span>)
                    </button>
                    
                    ${postData.allow_comments !== false ? `
                    <button class="btn btn-subtle btn-sm comment-toggle-btn" data-bs-toggle="collapse" href="#commentsCollapse-${postDomId}" role="button" aria-expanded="false" aria-controls="commentsCollapse-${postDomId}">
                        <i class="bi bi-chat-dots"></i> Comment 
                        (<span class="comment-count">${postData.comment_count || 0}</span>)
                    </button>` : ''}

                    <button class="btn btn-subtle btn-sm share-post-btn" data-post-id="${postData.id}" data-post-type="${postType}" data-share-url="${postData.share_url || '#'}">
                        <i class="bi bi-share"></i> Share
                    </button>
                    <button class="btn btn-subtle btn-sm save-item-btn" data-item-id="${postData.id}" data-item-type="${postType}">
                        <i class="bi bi-bookmark"></i> <span class="save-text">Save</span>
                    </button>
                </div>
            </div>
            ${postData.allow_comments !== false ? `
            <div class="collapse comments-section-wrapper" id="commentsCollapse-${postDomId}">
                <div class="card-footer bg-light-subtle p-2 comments-section" id="comments-for-${postDomId}">
                    <div class="text-center py-3 comments-loading-placeholder d-none">
                        <div class="spinner-border spinner-border-sm text-primary" role="status"><span class="visually-hidden">Loading...</span></div>
                    </div>
                    <div class="comments-list" id="comments-list-${postDomId}"></div>
                    <div class="load-more-comments-container text-center my-2 d-none">
                         <button class="btn btn-link btn-sm load-more-comments-btn" data-post-id="${postData.id}" data-post-type="${postType}">Load more comments</button>
                    </div>
                    {# Comment Form using _social_content_form.html structure. JS will handle submission. #}
                    <div class="social-content-form-card card mb-2 border-0 shadow-none p-0"> <div class="card-body p-0">
                    <form method="POST" action="${this.config.apiEndpoints[postType].createComment.replace('{postId}', postData.id)}" id="commentForm-${postDomId}" class="social-content-submission-form comment-submission-form" data-form-type="global_comment_create" data-post-id="${postData.id}">
                        <input type="hidden" name="csrf_token" value="${document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''}">
                        <div class="d-flex align-items-start">
                            <div class="flex-shrink-0 me-2">
                                <img src="${window.currentUserAvatarUrl || '/static/img/placeholders/user_avatar_default.png'}" 
                                     alt="Your avatar" class="rounded-circle" width="32" height="32" style="object-fit: cover;">
                            </div>
                            <div class="flex-grow-1">
                                <textarea name="content" class="form-control post-content-textarea comment-input" placeholder="Write a thoughtful comment..." rows="1" aria-label="Write a thoughtful comment..." id="commentTextarea-${postDomId}" autocomplete="off"></textarea>
                                <div class="d-flex justify-content-end align-items-center mt-2">
                                    <button type="submit" class="btn btn-primary btn-sm post-submit-btn comment-submit-btn">
                                        <span class="spinner-border spinner-border-sm d-none me-1" role="status" aria-hidden="true"></span>
                                        Reply
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                    </div></div>
                </div>
            </div>` : ''}
        `;
        return div;
    },

    renderCommentItem: function(commentData, postId, postType = 'global') {
        const commentDomId = `comment-${postType}-${commentData.id}`;
        const currentUserIdString = document.body.dataset.currentUserId;
        // Basic permission check for demo - needs robust backend check for actual edit/delete action
        const canEdit = commentData.author && commentData.author.id.toString() === currentUserIdString;
        const canDelete = canEdit || (window.currentUserRole && ['system_admin', 'hr_ceo'].includes(window.currentUserRole));


        const div = document.createElement('div');
        div.className = 'social-comment-item d-flex mb-2 pt-2 pb-2 border-bottom border-light-subtle';
        div.id = commentDomId;
        div.dataset.commentId = commentData.id;

        div.innerHTML = `
            <a href="/user/${commentData.author.id}" class="me-2 flex-shrink-0" aria-label="${commentData.author.full_name || commentData.author.username}'s profile">
                <img src="${commentData.author.profile_photo_url || '/static/img/placeholders/user_avatar_default.png'}" alt="${commentData.author.full_name || commentData.author.username}" class="rounded-circle" width="32" height="32" style="object-fit: cover;">
            </a>
            <div class="flex-grow-1">
                <div class="comment-bubble bg-light-subtle p-2 rounded-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <a href="/user/${commentData.author.id}" class="text-decoration-none">
                            <small class="fw-bold text-dark font-heading">${commentData.author.full_name || commentData.author.username}</small>
                        </a>
                        ${(canEdit || canDelete) ? `
                        <div class="dropdown comment-actions ms-auto">
                            <button class="btn btn-sm btn-link text-muted py-0 px-1" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Comment options">
                                <i class="bi bi-three-dots"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                ${canEdit ? `<li><a class="dropdown-item edit-comment-btn" href="#" data-comment-id="${commentData.id}" data-post-id="${postId}" data-post-type="${postType}"><i class="bi bi-pencil me-2"></i>Edit</a></li>` : ''}
                                ${canDelete ? `<li><button class="dropdown-item text-danger delete-comment-btn" data-comment-id="${commentData.id}" data-post-id="${postId}" data-post-type="${postType}"><i class="bi bi-trash me-2"></i>Delete</button></li>` : ''}
                            </ul>
                        </div>` : ''}
                    </div>
                    <p class="mb-0 comment-content-text text-dark-emphasis small" id="comment-content-${commentDomId}">${commentData.content.replace(/\n/g, '<br>')}</p>
                </div>
                <div class="d-flex justify-content-between align-items-center mt-1">
                    <small class="text-muted ms-1 comment-timestamp" title="${new Date(commentData.timestamp).toLocaleString()}">
                        ${humanizeTimeDiff(commentData.timestamp)}
                        ${commentData.is_edited ? '<span class="fst-italic ms-1">(edited)</span>' : ''}
                    </small>
                    <div>
                       {# Save comment button can be added here in Phase 2 #}
                    </div>
                </div>
            </div>
        `;
        return div;
    },

    handleGlobalPostCreateSubmit: async function(formElement) {
        const submitButton = formElement.querySelector('.post-submit-btn');
        const originalButtonText = submitButton.textContent;
        this.setButtonLoading(submitButton, true, "Posting...");

        const formData = new FormData(formElement);
        const endpoint = this.config.apiEndpoints.global.createPost;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData, // FormData handles multipart/form-data
                headers: { 'X-CSRFToken': formData.get('csrf_token') }
            });
            const responseData = await response.json();

            if (response.ok && responseData.success && responseData.post) {
                showNexusNotification('Success!', 'Post created successfully!', 'success');
                formElement.reset();
                const pondInstance = FilePond.find(formElement.querySelector('.filepond-input'));
                if (pondInstance) pondInstance.removeFiles();
                this.autoResizeTextarea(formElement.querySelector('.post-content-textarea'), true); // Reset height
                
                const postElement = this.config.postTemplateFunction(responseData.post, 'global');
                this.config.uiSelectors.feedContainer.prepend(postElement);
                if (this.config.uiSelectors.emptyPlaceholder) this.config.uiSelectors.emptyPlaceholder.classList.add('d-none');
            } else {
                showNexusNotification('Post Error', responseData.error || responseData.message || 'Failed to create post.', 'error');
            }
        } catch (error) {
            console.error('Error creating global post:', error);
            showNexusNotification('Network Error', `Could not create post: ${error.message}`, 'error');
        } finally {
            this.setButtonLoading(submitButton, false, originalButtonText);
        }
    },

    handleGlobalCommentCreateSubmit: async function(formElement) {
        const postId = formElement.dataset.postId;
        const contentTextarea = formElement.querySelector('textarea[name="content"]');
        const content = contentTextarea.value.trim();
        if (!content) return;

        const submitButton = formElement.querySelector('.post-submit-btn');
        const originalButtonText = submitButton.textContent;
        this.setButtonLoading(submitButton, true);

        const endpoint = this.config.apiEndpoints.global.createComment.replace('{postId}', postId);

        try {
            const responseData = await postData(endpoint, { content: content }); // utils.postData sends JSON
            if (responseData.success && responseData.comment) {
                contentTextarea.value = '';
                this.autoResizeTextarea(contentTextarea, true);

                const commentsList = document.getElementById(`comments-list-global_post-${postId}`);
                if (commentsList) {
                    const commentElement = this.config.commentTemplateFunction(responseData.comment, postId, 'global');
                    commentsList.appendChild(commentElement);
                    // Update comment count on post
                    const postEl = document.getElementById(`global_post-${postId}`);
                    const countEl = postEl?.querySelector('.comment-toggle-btn .comment-count');
                    if(countEl) countEl.textContent = responseData.post_comment_count;
                }
            } else {
                showNexusNotification('Comment Error', responseData.error || 'Failed to post comment.', 'error');
            }
        } catch (error) {
            showNexusNotification('Network Error', `Could not post comment: ${error.message}`, 'error');
        } finally {
            this.setButtonLoading(submitButton, false, originalButtonText);
        }
    },
    
    handleGlobalLikeToggle: async function(buttonElement) {
        const postId = buttonElement.dataset.postId;
        const endpoint = this.config.apiEndpoints.global.toggleLike.replace('{postId}', postId);
        
        // Optimistic UI update
        const icon = buttonElement.querySelector('i.bi');
        const countSpan = buttonElement.querySelector('.like-count');
        const likeText = buttonElement.querySelector('.like-text');
        const wasActive = buttonElement.classList.contains('active');
        let currentCount = parseInt(countSpan.textContent);

        buttonElement.classList.toggle('active', !wasActive);
        if (icon) icon.className = !wasActive ? 'bi bi-heart-fill text-danger' : 'bi bi-heart';
        if (likeText) likeText.textContent = !wasActive ? 'Liked' : 'Like';
        countSpan.textContent = !wasActive ? currentCount + 1 : Math.max(0, currentCount - 1);

        try {
            const responseData = await postData(endpoint, {}); // No body for toggle
            if (responseData.success) {
                // Server confirms, update with authoritative data
                countSpan.textContent = responseData.like_count;
                buttonElement.classList.toggle('active', responseData.liked);
                if (icon) icon.className = responseData.liked ? 'bi bi-heart-fill text-danger' : 'bi bi-heart';
                if (likeText) likeText.textContent = responseData.liked ? 'Liked' : 'Like';
            } else { // Revert optimistic update on server error
                buttonElement.classList.toggle('active', wasActive);
                if (icon) icon.className = wasActive ? 'bi bi-heart-fill text-danger' : 'bi bi-heart';
                if (likeText) likeText.textContent = wasActive ? 'Liked' : 'Like';
                countSpan.textContent = currentCount;
                showNexusNotification('Like Error', responseData.error || 'Failed to update like.', 'error');
            }
        } catch (error) { // Revert on network error
            buttonElement.classList.toggle('active', wasActive);
            if (icon) icon.className = wasActive ? 'bi bi-heart-fill text-danger' : 'bi bi-heart';
            if (likeText) likeText.textContent = wasActive ? 'Liked' : 'Like';
            countSpan.textContent = currentCount;
            showNexusNotification('Network Error', `Could not update like: ${error.message}`, 'error');
        }
    },

    handleGlobalDeletePost: async function(buttonElement) {
        const postId = buttonElement.dataset.postId;
        // ... (SweetAlert2 confirmation as in existing social.js) ...
        const result = await Swal.fire({ title: 'Delete Post?', text: "This post will be permanently removed.", icon: 'warning', /* ... */ });
        if (result.isConfirmed) {
            const endpoint = this.config.apiEndpoints.global.deletePost.replace('{postId}', postId);
            try {
                const responseData = await postData(endpoint, {}); // No body
                if (responseData.success) {
                    showNexusNotification('Deleted!', responseData.message || 'Post deleted.', 'success');
                    document.getElementById(`global_post-${postId}`)?.remove();
                     if (this.config.uiSelectors.feedContainer.children.length === 0 && this.config.uiSelectors.emptyPlaceholder) {
                        this.config.uiSelectors.emptyPlaceholder.classList.remove('d-none');
                    }
                } else {
                    showNexusNotification('Delete Error', responseData.error || 'Failed to delete post.', 'error');
                }
            } catch (error) { /* ... */ }
        }
    },
    
    handleGlobalDeleteComment: async function(buttonElement) {
        const commentId = buttonElement.dataset.commentId;
        const postId = buttonElement.dataset.postId; // From parent post context
        // ... (SweetAlert2 confirmation) ...
        const result = await Swal.fire({ title: 'Delete Comment?', text: "This comment will be removed.", icon: 'warning', /* ... */ });
        if (result.isConfirmed) {
            const endpoint = this.config.apiEndpoints.global.deleteComment.replace('{commentId}', commentId);
            try {
                const responseData = await postData(endpoint, {}); // No body
                if (responseData.success) {
                    showNexusNotification('Deleted!', responseData.message || 'Comment removed.', 'success');
                    document.getElementById(`comment-global-${commentId}`)?.remove();
                    // Update comment count on post
                    const postEl = document.getElementById(`global_post-${postId}`);
                    const countEl = postEl?.querySelector('.comment-toggle-btn .comment-count');
                    if(countEl && responseData.post_comment_count !== undefined) {
                         countEl.textContent = responseData.post_comment_count;
                    } else if (countEl) { // Fallback if count not returned
                        countEl.textContent = Math.max(0, parseInt(countEl.textContent) -1);
                    }
                } else {
                    showNexusNotification('Delete Error', responseData.error || 'Failed to delete comment.', 'error');
                }
            } catch (error) { /* ... */ }
        }
    },

    setupGlobalEventListeners: function() {
        const self = this; // For use in event listeners

        // Global Post Creation Form
        if (self.config.uiSelectors.createForm) {
            self.config.uiSelectors.createForm.addEventListener('submit', function(event) {
                event.preventDefault();
                self.handleGlobalPostCreateSubmit(this);
            });
        }

        // Load More button for Global Feed
        const loadMoreGlobalBtn = self.config.uiSelectors.loadMoreTrigger?.querySelector('.load-more-btn[data-feed-type="global"]');
        if (loadMoreGlobalBtn) {
            loadMoreGlobalBtn.addEventListener('click', function() {
                self.fetchAndRenderPosts(self.config.currentPage + 1);
            });
        }

        // Event delegation for actions within the global feed container
        if (self.config.uiSelectors.feedContainer) {
            self.config.uiSelectors.feedContainer.addEventListener('click', function(event) {
                const likeButton = event.target.closest('.like-post-btn[data-post-type="global"]');
                
                // ADD THESE TWO LINES
                const shareButton = event.target.closest('.share-post-btn');
                const saveButton = event.target.closest('.save-item-btn');

                if (shareButton) {
                    self.handleShare(shareButton);
                } else if (saveButton) {
                    self.handleSaveItem(saveButton);
                }
            });
            // ... (rest of the function) ...
        }
    },
                
                // ADD THIS LINE
                const loadMoreCommentsButton = event.target.closest('.load-more-comments-btn');
                if (loadMoreCommentsButton) {
                    self.handleLoadMoreComments(loadMoreCommentsButton);
                }
            });
            // ... (rest of the function) ...
        }
    },
                const deletePostButton = event.target.closest('.delete-post-btn[data-post-type="global"]');
                const deleteCommentButton = event.target.closest('.delete-comment-btn[data-post-type="global"]');
                // Add edit buttons later

                if (likeButton) {
                    self.handleGlobalLikeToggle(likeButton);
                } else if (deletePostButton) {
                    self.handleGlobalDeletePost(deletePostButton);
                } else if (deleteCommentButton) {
                    self.handleGlobalDeleteComment(deleteCommentButton);
                }
            });

            // For comment form submissions within posts
            self.config.uiSelectors.feedContainer.addEventListener('submit', function(event) {
                const commentForm = event.target.closest('.comment-submission-form[data-form-type="global_comment_create"]');
                if (commentForm) {
                    event.preventDefault();
                    self.handleGlobalCommentCreateSubmit(commentForm);
                }
            });
        }
         // Auto-resize for textareas
        document.querySelectorAll('.post-content-textarea, .comment-input').forEach(textarea => {
            textarea.addEventListener('input', () => self.autoResizeTextarea(textarea));
            self.autoResizeTextarea(textarea); // Initial call
        });
    },

    registerGlobalRealtimeHandlers: function() {
        if (typeof nexusRealtimeManager !== 'undefined') {
            // New Global Comment
            nexusRealtimeManager.on('new_comment', (data) => { // Listening to generic 'new_comment'
                // Check if this comment belongs to a global post currently in view
                if (data.post_id && document.getElementById(`global_post-${data.post_id}`)) {
                    const commentsList = document.getElementById(`comments-list-global_post-${data.post_id}`);
                    if (commentsList && !document.getElementById(`comment-global-${data.comment_data.id}`)) { // Avoid duplicates
                        // Assuming data.comment_html is sent for global comments now OR data.comment_data
                        if(data.comment_html) { // If server sends HTML
                            commentsList.insertAdjacentHTML('beforeend', data.comment_html);
                        } else if (data.comment_data) { // If server sends JSON
                            const commentElement = this.config.commentTemplateFunction(data.comment_data, data.post_id, 'global');
                            commentsList.appendChild(commentElement);
                        }
                        
                        const postEl = document.getElementById(`global_post-${data.post_id}`);
                        const countEl = postEl?.querySelector('.comment-toggle-btn .comment-count');
                        if(countEl && data.new_comment_count !== undefined) {
                            countEl.textContent = data.new_comment_count;
                        }
                    }
                }
            });

            // Global Post Like Update
            nexusRealtimeManager.on('like_update', (data) => { // Listening to generic 'like_update'
                if (data.post_id && document.getElementById(`global_post-${data.post_id}`)) {
                    const postEl = document.getElementById(`global_post-${data.post_id}`);
                    const countSpan = postEl?.querySelector('.like-post-btn .like-count');
                    if(countSpan && data.new_like_count !== undefined) {
                        countSpan.textContent = data.new_like_count;
                    }
                    // Note: Updating the "liked" state (icon color) for *other* users in real-time
                    // based on a broadcast is usually not done, as "liked" is a per-user state.
                    // The count update is sufficient for broadcast.
                }
            });

            // Handler for new global posts (if backend implements this event)
            // nexusRealtimeManager.on('new_global_post_feed', (postData) => {
            //     if (this.config.feedType === 'global' && this.config.uiSelectors.feedContainer) {
            //         const postElement = this.config.postTemplateFunction(postData, 'global');
            //         this.config.uiSelectors.feedContainer.prepend(postElement);
            //         if (this.config.uiSelectors.emptyPlaceholder) this.config.uiSelectors.emptyPlaceholder.classList.add('d-none');
            //     }
            // });
        }
    },
    
    autoResizeTextarea: function(textarea, reset = false) {
        if (reset) {
            textarea.style.height = 'auto'; // Reset first before shrinking
        }
        textarea.style.height = 'auto'; // Temporarily shrink to get scrollHeight
        let newHeight = textarea.scrollHeight;
        const maxHeightStyle = window.getComputedStyle(textarea).maxHeight;
        const maxHeight = maxHeightStyle && maxHeightStyle !== 'none' ? parseInt(maxHeightStyle) : 150; // Default max height

        if (newHeight > maxHeight) {
            newHeight = maxHeight;
            textarea.style.overflowY = 'auto';
        } else {
            textarea.style.overflowY = 'hidden';
        }
        textarea.style.height = newHeight + 'px';
    },

    setButtonLoading: function(button, isLoading, loadingText = "Loading...") {
        if (!button) return;
        const originalText = button.dataset.originalText || button.textContent.trim();
        if (isLoading) {
            button.dataset.originalText = originalText;
            button.disabled = true;
            button.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> ${loadingText}`;
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText || originalText; // Revert to stored or current if none stored
        }
    }
    // ... other social utility functions will go here ...
};

// Make nexusSocial globally available (or export if using modules more strictly)
window.nexusSocial = nexusSocial;

// --- Global Auto-Resize for Textareas ---
// Already moved into setupGlobalEventListeners or nexusSocial.initGlobalFeed

// --- Initialize FilePond Inputs globally ---
// Already moved into initGlobalFeed or a general main.js DOMContentLoaded
if (typeof initializeAllFilePondInputs === 'function' && !document.getElementById('globalFeedContainer')) {
    // Only call here if not on a page that `initGlobalFeed` will handle.
    // This avoids double initialization. A more robust solution is needed for selective init.
    // initializeAllFilePondInputs(); 
}

console.log('Nexus Social JS (Global Feed Focused) - Core Initialized.');
}); // End DOMContentLoaded

// Helper for humanizing time (client-side equivalent of Jinja filter)
// This is very basic, for more complex needs use a library like moment.js or date-fns
function humanizeTimeDiff(isoTimestamp) {
    if (!isoTimestamp) return '';
    const date = new Date(isoTimestamp);
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}