// --- START: CORRECTED social.js ---
"use strict";

const nexusSocial = {
    // --- Configuration for current feed view ---
    config: {
        feedType: null,
        parentId: null,
        currentPage: 1,
        isLoadingMore: false,
        apiEndpoints: {
            global: {
                fetchPosts: '/api/v1/global_posts',
                createPost: '/api/v1/global_posts',
                createComment: '/api/v1/global_posts/{postId}/comments',
                toggleLike: '/api/v1/global_posts/{postId}/like',
                deletePost: '/api/v1/global_posts/{postId}',
                deleteComment: '/api/v1/global_comments/{commentId}',
                fetchComments: '/api/v1/global_posts/{postId}/comments',
                saveItem: '/api/v1/saved_items', // Added from a fragment
            }
        },
        uiSelectors: {
            feedContainer: null,
            loadingPlaceholder: null,
            emptyPlaceholder: null,
            loadMoreTrigger: null,
            createForm: null,
        },
        postTemplateFunction: null,
        commentTemplateFunction: null
    },

    handleShare: function(buttonElement) {
        const url = buttonElement.dataset.shareUrl;
        if (navigator.share) {
            navigator.share({ title: 'Check out this post from Nexus', url: url })
                .catch(err => console.error("Share failed:", err));
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                showNexusNotification('Link copied!', 'Link copied to clipboard.', 'success');
            }).catch(err => {
                showNexusNotification('Copy Failed', 'Could not copy link.', 'error');
            });
        } else {
            window.open(url, '_blank');
        }
    },

    observePostVisibility: function() {
        if (!('IntersectionObserver' in window) || typeof nexusRealtimeManager === 'undefined') return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const postId = entry.target.dataset.postId;
                const postType = entry.target.dataset.postType;
                if (!postId) return;

                if (entry.isIntersecting) {
                    nexusRealtimeManager.joinPostRoom(postId, postType);
                } else {
                    nexusRealtimeManager.leavePostRoom(postId, postType);
                }
            });
        }, { rootMargin: '150px 0px', threshold: 0.01 });

        const mutationObserver = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1 && node.matches('.social-post-item')) observer.observe(node);
                }
                for (const node of mutation.removedNodes) {
                    if (node.nodeType === 1 && node.matches('.social-post-item')) observer.unobserve(node);
                }
            }
        });
        if (this.config.uiSelectors.feedContainer) {
            mutationObserver.observe(this.config.uiSelectors.feedContainer, { childList: true });
        }
    },

// FILE: static/js/social.js

    handleSaveItem: async function(buttonElement) {
        const { itemId, itemType } = buttonElement.dataset;
        const isSaved = buttonElement.classList.contains('active');
        const endpoint = this.config.apiEndpoints.global.saveItem;

        this.setButtonLoading(buttonElement, true, "");

        try {
            let responseData;
            if (isSaved) {
                // This part of the code is not being executed for saving, only for un-saving.
                // It likely has its own bug if `deleteData` isn't defined.
                // We are focused on the 'else' block for now.
                responseData = await deleteData(`${endpoint}?item_type=${itemType}&item_id=${itemId}`);
            } else {
                // --- START: MODIFICATION FOR DIAGNOSIS ---
                const payload = { item_type: itemType, item_id: itemId };
                console.log("--- Sending SAVE request ---");
                console.log("Endpoint:", endpoint);
                console.log("Payload:", payload);
                console.log("Payload as JSON string:", JSON.stringify(payload));
                // --- END: MODIFICATION FOR DIAGNOSIS ---
                
                responseData = await postData(endpoint, payload); 
            }
            
            if (responseData.success) {
                buttonElement.classList.toggle('active', !isSaved);
                const textElement = buttonElement.querySelector('.save-text');
                if (textElement) textElement.textContent = isSaved ? 'Save' : 'Saved';
                showNexusNotification(responseData.message || 'Updated!', 'success');
            } else {
                showNexusNotification(responseData.error || 'Failed to update.', 'danger');
            }
        } catch (error) {
            showNexusNotification('Save Failed', 'Could not update save status.', 'danger');
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
                buttonElement.dataset.currentPage = currentPage + 1;
            }

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
        this.config.uiSelectors.feedContainer = document.getElementById(initialConfig.feedContainerId);
        this.config.uiSelectors.loadingPlaceholder = document.getElementById(initialConfig.loadingPlaceholderId);
        this.config.uiSelectors.emptyPlaceholder = document.getElementById(initialConfig.emptyPlaceholderId);
        this.config.uiSelectors.loadMoreTrigger = document.getElementById(initialConfig.loadMoreTriggerId);
        this.config.uiSelectors.createForm = document.getElementById(initialConfig.createFormId);
        
        // The render functions must be defined within the nexusSocial object.
        this.config.postTemplateFunction = this.renderGlobalPostItem.bind(this);
        this.config.commentTemplateFunction = this.renderCommentItem.bind(this);

        if (!this.config.uiSelectors.feedContainer) {
            console.error("Global feed container not found:", initialConfig.feedContainerId);
            return;
        }

        this.loadInitialPosts();
        this.observePostVisibility();
        this.setupGlobalEventListeners();
        this.registerGlobalRealtimeHandlers();
        // Global FilePond init should be handled by main.js
    },
    
    handleGlobalPostCreateSubmit: async function(formElement) {
        const submitButton = formElement.querySelector('.post-submit-btn');
        if (!submitButton) return;
        const originalButtonText = submitButton.innerHTML;
        this.setButtonLoading(submitButton, true, "Posting...");

        const formData = new FormData(formElement);
        const endpoint = this.config.apiEndpoints.global.createPost;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
                headers: { 'X-CSRFToken': formData.get('csrf_token') }
            });

            const responseData = await response.json();

            if (response.ok && responseData.success && responseData.post_html) {
                showNexusNotification('Post Created!', 'Your post is now live on the feed.', 'success');

                this.config.uiSelectors.feedContainer.insertAdjacentHTML('afterbegin', responseData.post_html);

                if (this.config.uiSelectors.emptyPlaceholder) {
                    this.config.uiSelectors.emptyPlaceholder.classList.add('d-none');
                }

                formElement.reset();
                const pondInstance = typeof FilePond !== 'undefined' ? FilePond.find(formElement.querySelector('.filepond-input')) : null;
                if (pondInstance) {
                    pondInstance.removeFiles();
                }
                const textarea = formElement.querySelector('.post-content-textarea');
                if (textarea) this.autoResizeTextarea(textarea, true);

            } else {
                showNexusNotification('Post Error', responseData.error || 'Failed to create the post.', 'danger');
            }
        } catch (error) {
            console.error('Error creating global post:', error);
            showNexusNotification('Network Error', `Could not create post: ${error.message}`, 'danger');
        } finally {
            this.setButtonLoading(submitButton, false, originalButtonText);
        }
    },

// In social.js, replace the entire setupGlobalEventListeners function with this one.
// In social.js, replace your entire setupGlobalEventListeners function with this one.

setupGlobalEventListeners: function() {
    const self = this;
    // This correctly uses the container element identified during initialization.
    const feedContainer = this.config.uiSelectors.feedContainer;

    if (feedContainer) {
        feedContainer.addEventListener('click', function(event) {
            
            const likeButton = event.target.closest('.like-post-btn');
            const commentToggleButton = event.target.closest('.comment-toggle-btn');
            const deleteButton = event.target.closest('.delete-post-btn');
            const deleteCommentButton = event.target.closest('.delete-comment-btn');
            const shareButton = event.target.closest('.share-post-btn');
            const saveButton = event.target.closest('.save-item-btn');
            const loadMoreCommentsButton = event.target.closest('.load-more-comments-btn');
            const editButton = event.target.closest('.edit-post-btn');

            if (likeButton) {
                event.preventDefault();
                // --- THIS IS THE FIX ---
                // The function call now correctly matches the defined function name.
                self.handleGlobalLikeToggle(likeButton);
                // --- END OF FIX ---
            }
            if (commentToggleButton) {
                self.handleCommentToggle(commentToggleButton);
            }
            if (deleteButton) {
                event.preventDefault();
                self.handleGlobalDeletePost(deleteButton);
            }
            if (deleteCommentButton) {
                event.preventDefault();
                self.handleGlobalDeleteComment(deleteCommentButton);
            }
            if (shareButton) {
                event.preventDefault();
                self.handleShare(shareButton);
            }
            if (saveButton) {
                event.preventDefault();
                self.handleSaveItem(saveButton);
            }
            if (loadMoreCommentsButton) {
                event.preventDefault();
                self.handleLoadMoreComments(loadMoreCommentsButton);
            }
            if (editButton) {
                event.preventDefault();
                self.handleGlobalEditPost(editButton);
            }
        });

        self.setupInfiniteScroll(feedContainer);
    } else {
        console.error("Feed container not found for setting up global event listeners.");
    }
},
    // --- All other methods like loadInitialPosts, renderGlobalPostItem, etc., go here ---
    // (Pasting a combined version of all the methods from your file below)

    loadInitialPosts: async function() {
        if (this.config.uiSelectors.loadingPlaceholder) this.config.uiSelectors.loadingPlaceholder.classList.remove('d-none');
        if (this.config.uiSelectors.emptyPlaceholder) this.config.uiSelectors.emptyPlaceholder.classList.add('d-none');
        this.config.uiSelectors.feedContainer.innerHTML = '';
        await this.fetchAndRenderPosts(1);
        if (this.config.uiSelectors.loadingPlaceholder) this.config.uiSelectors.loadingPlaceholder.classList.add('d-none');
        if (this.config.uiSelectors.feedContainer.children.length === 0 && this.config.uiSelectors.emptyPlaceholder) {
            this.config.uiSelectors.emptyPlaceholder.classList.remove('d-none');
        }
    },
    fetchAndRenderPosts: async function(page, prepend = false) {
        if (this.config.isLoadingMore && page > 1) return;
        if (page > 1) this.config.isLoadingMore = true;
        const loadMoreButton = this.config.uiSelectors.loadMoreTrigger?.querySelector('.load-more-btn');
        if (loadMoreButton && page > 1) {
            loadMoreButton.disabled = true;
            loadMoreButton.querySelector('.spinner-border')?.classList.remove('d-none');
        }
        try {
            const endpoint = this.config.apiEndpoints[this.config.feedType].fetchPosts;
            const url = `${endpoint}?page=${page}`;
            const responseData = await getData(url);
            if (responseData.success && responseData.posts) {
                if (responseData.posts.length > 0) {
                    responseData.posts.forEach(postJson => {
                        const postElement = this.config.postTemplateFunction(postJson, this.config.feedType);
                        if (prepend) this.config.uiSelectors.feedContainer.prepend(postElement);
                        else this.config.uiSelectors.feedContainer.appendChild(postElement);
                    });
                    this.config.currentPage = page;
                    if (this.config.uiSelectors.emptyPlaceholder) this.config.uiSelectors.emptyPlaceholder.classList.add('d-none');
                } else if (page === 1) {
                    if (this.config.uiSelectors.emptyPlaceholder) this.config.uiSelectors.emptyPlaceholder.classList.remove('d-none');
                }
                if (this.config.uiSelectors.loadMoreTrigger) {
                    this.config.uiSelectors.loadMoreTrigger.classList.toggle('d-none', !responseData.pagination.has_next);
                }
            }
        } catch (error) {
            console.error(`Error fetching posts:`, error);
        } finally {
            if (page > 1) this.config.isLoadingMore = false;
            if (loadMoreButton && page > 1) {
                loadMoreButton.disabled = false;
                loadMoreButton.querySelector('.spinner-border')?.classList.add('d-none');
            }
        }
    },
    renderGlobalPostItem: function(postData, postType = 'global') {
        const postDomId = `${postType}_post-${postData.id}`;
        const currentUserIdString = document.body.dataset.currentUserId;
        const canEditDelete = (postData.author && postData.author.id.toString() === currentUserIdString) || (window.currentUserRole && ['system_admin', 'hr_ceo'].includes(window.currentUserRole));
        const div = document.createElement('div');
        div.className = 'card social-post-item mb-3 shadow-sm';
        div.id = postDomId;
        div.dataset.postId = postData.id;
        div.dataset.postType = postType;
        div.innerHTML = `
            <div class="card-body">
                <div class="d-flex align-items-center mb-3">
                    <a href="/user/${postData.author.id}" class="flex-shrink-0">
                        <img src="${postData.author.profile_photo_url || '/static/img/placeholders/user_avatar_default.png'}" alt="${postData.author.full_name || postData.author.username}'s avatar" class="rounded-circle me-3" width="48" height="48" style="object-fit: cover;">
                    </a>
                    <div class="flex-grow-1">
                        <a href="/user/${postData.author.id}" class="fw-bold text-dark text-decoration-none font-heading">${postData.author.full_name || postData.author.username}</a>
                        <div class="text-muted small">
                            <i class="bi bi-clock"></i> 
                            <span class="post-timestamp" title="${new Date(postData.timestamp).toLocaleString()}">${humanizeTimeDiff(postData.timestamp)}</span>
                            ${postData.is_edited ? '<span class="fst-italic ms-1">(edited)</span>' : ''}
                        </div>
                    </div>
                    ${canEditDelete ? `<div class="dropdown"><button class="btn btn-sm btn-light border-0" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Post options"><i class="bi bi-three-dots-vertical"></i></button><ul class="dropdown-menu dropdown-menu-end">${postData.author.id.toString() === currentUserIdString ? `<li><a class="dropdown-item edit-post-btn" href="#" data-post-id="${postData.id}" data-post-type="${postType}"><i class="bi bi-pencil me-2"></i>Edit Post</a></li>` : ''}<li><button class="dropdown-item text-danger delete-post-btn" data-post-id="${postData.id}" data-post-type="${postType}"><i class="bi bi-trash me-2"></i>Delete Post</button></li></ul></div>` : ''}
                </div>
                ${postData.content ? `<div class="post-content-text mb-3">${postData.content.replace(/\n/g, '<br>')}</div>` : ''}
                ${postData.file ? `<div class="post-attachment mb-3">${postData.file.mimetype && postData.file.mimetype.startsWith('image/') ? `<a href="${postData.file.download_url}" data-bs-toggle="modal" data-bs-target="#viewFileModal" data-file-url="${postData.file.download_url}" data-file-mimetype="${postData.file.mimetype}" data-file-name="${postData.file.original_filename}"><img src="${postData.file.download_url}" class="img-fluid rounded border" alt="Attachment" style="max-height: 450px;"></a>` : (postData.file.mimetype && postData.file.mimetype.startsWith('video/') ? `<video controls class="img-fluid rounded border" style="max-height: 450px; width:100%;"><source src="${postData.file.download_url}" type="${postData.file.mimetype}"></video>` : `<div class="d-flex align-items-center p-2 border rounded-3 bg-light-subtle"><i class="bi bi-file-earmark-text-fill fs-2 me-2 text-secondary"></i><div class="flex-grow-1"><a href="${postData.file.download_url}" class="fw-semibold text-decoration-none stretched-link" target="_blank" download="${postData.file.original_filename}">${postData.file.original_filename}</a><div class="text-muted small">${(postData.file.size > 1024*1024) ? (postData.file.size / (1024*1024)).toFixed(2) + ' MB' : (postData.file.size / 1024).toFixed(1) + ' KB'}</div></div><a href="${postData.file.download_url}" class="btn btn-sm btn-outline-secondary ms-2" download="${postData.file.original_filename}"><i class="bi bi-download"></i></a></div>`)}</div>` : ''}
                <div class="post-actions d-flex justify-content-start align-items-center gap-2 border-top pt-2 mt-2">
                    <button class="btn btn-subtle btn-sm reaction-btn like-post-btn ${postData.current_user_liked ? 'active' : ''}" data-post-id="${postData.id}" data-post-type="${postType}" aria-pressed="${postData.current_user_liked}"><i class="bi ${postData.current_user_liked ? 'bi-heart-fill text-danger' : 'bi-heart'}"></i> <span class="like-text">${postData.current_user_liked ? 'Liked' : 'Like'}</span>(<span class="like-count">${postData.like_count || 0}</span>)</button>
                    ${postData.allow_comments !== false ? `<button class="btn btn-subtle btn-sm comment-toggle-btn" data-bs-toggle="collapse" href="#commentsCollapse-${postDomId}" role="button"><i class="bi bi-chat-dots"></i> Comment (<span class="comment-count">${postData.comment_count || 0}</span>)</button>` : ''}
                    <button class="btn btn-subtle btn-sm share-post-btn" data-post-id="${postData.id}" data-post-type="${postType}" data-share-url="${postData.share_url || '#'}"><i class="bi bi-share"></i> Share</button>
                    <button class="btn btn-subtle btn-sm save-item-btn" data-item-id="${postData.id}" data-item-type="${postType}"><i class="bi bi-bookmark"></i> <span class="save-text">Save</span></button>
                </div>
            </div>
            ${postData.allow_comments !== false ? `<div class="collapse comments-section-wrapper" id="commentsCollapse-${postDomId}"><div class="card-footer bg-light-subtle p-2 comments-section" id="comments-for-${postDomId}"><div class="text-center py-3 comments-loading-placeholder d-none"><div class="spinner-border spinner-border-sm text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div><div class="comments-list" id="comments-list-${postDomId}"></div><div class="load-more-comments-container text-center my-2 d-none"><button class="btn btn-link btn-sm load-more-comments-btn" data-post-id="${postData.id}" data-post-type="${postType}">Load more comments</button></div><div class="social-content-form-card card mb-2 border-0 shadow-none p-0"><div class="card-body p-0"><form method="POST" action="${this.config.apiEndpoints[postType].createComment.replace('{postId}', postData.id)}" id="commentForm-${postDomId}" class="social-content-submission-form comment-submission-form" data-form-type="global_comment_create" data-post-id="${postData.id}"><input type="hidden" name="csrf_token" value="${document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''}"><div class="d-flex align-items-start"><div class="flex-shrink-0 me-2"><img src="${window.currentUserAvatarUrl || '/static/img/placeholders/user_avatar_default.png'}" alt="Your avatar" class="rounded-circle" width="32" height="32" style="object-fit: cover;"></div><div class="flex-grow-1"><textarea name="content" class="form-control post-content-textarea comment-input" placeholder="Write a thoughtful comment..." rows="1" id="commentTextarea-${postDomId}"></textarea><div class="d-flex justify-content-end align-items-center mt-2"><button type="submit" class="btn btn-primary btn-sm post-submit-btn comment-submit-btn"><span class="spinner-border spinner-border-sm d-none me-1" role="status"></span>Reply</button></div></div></div></form></div></div></div></div>` : ''}
        `;
        return div;
    },
    renderCommentItem: function(commentData, postId, postType = 'global') {
        const commentDomId = `comment-${postType}-${commentData.id}`;
        const currentUserIdString = document.body.dataset.currentUserId;
        const canEdit = commentData.author && commentData.author.id.toString() === currentUserIdString;
        const canDelete = canEdit || (window.currentUserRole && ['system_admin', 'hr_ceo'].includes(window.currentUserRole));
        const div = document.createElement('div');
        div.className = 'social-comment-item d-flex mb-2 pt-2 pb-2 border-bottom border-light-subtle';
        div.id = commentDomId;
        div.dataset.commentId = commentData.id;
        div.innerHTML = `<a href="/user/${commentData.author.id}" class="me-2 flex-shrink-0"><img src="${commentData.author.profile_photo_url || '/static/img/placeholders/user_avatar_default.png'}" alt="${commentData.author.full_name || commentData.author.username}" class="rounded-circle" width="32" height="32" style="object-fit: cover;"></a><div class="flex-grow-1"><div class="comment-bubble bg-light-subtle p-2 rounded-3"><div class="d-flex justify-content-between align-items-center mb-1"><a href="/user/${commentData.author.id}" class="text-decoration-none"><small class="fw-bold text-dark font-heading">${commentData.author.full_name || commentData.author.username}</small></a>${(canEdit || canDelete) ? `<div class="dropdown comment-actions ms-auto"><button class="btn btn-sm btn-link text-muted py-0 px-1" type="button" data-bs-toggle="dropdown"><i class="bi bi-three-dots"></i></button><ul class="dropdown-menu dropdown-menu-end">${canEdit ? `<li><a class="dropdown-item edit-comment-btn" href="#" data-comment-id="${commentData.id}" data-post-id="${postId}" data-post-type="${postType}"><i class="bi bi-pencil me-2"></i>Edit</a></li>` : ''}${canDelete ? `<li><button class="dropdown-item text-danger delete-comment-btn" data-comment-id="${commentData.id}" data-post-id="${postId}" data-post-type="${postType}"><i class="bi bi-trash me-2"></i>Delete</button></li>` : ''}</ul></div>` : ''}</div><p class="mb-0 comment-content-text text-dark-emphasis small" id="comment-content-${commentDomId}">${commentData.content.replace(/\n/g, '<br>')}</p></div><div class="d-flex justify-content-between align-items-center mt-1"><small class="text-muted ms-1 comment-timestamp" title="${new Date(commentData.timestamp).toLocaleString()}">${humanizeTimeDiff(commentData.timestamp)}${commentData.is_edited ? '<span class="fst-italic ms-1">(edited)</span>' : ''}</small><div></div></div></div>`;
        return div;
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
            const responseData = await postData(endpoint, { content: content });
            if (responseData.success && responseData.comment) {
                contentTextarea.value = ''; this.autoResizeTextarea(contentTextarea, true);
                const commentsList = document.getElementById(`comments-list-global_post-${postId}`);
                if (commentsList) {
                    const commentElement = this.config.commentTemplateFunction(responseData.comment, postId, 'global');
                    commentsList.appendChild(commentElement);
                    const postEl = document.getElementById(`global_post-${postId}`);
                    const countEl = postEl?.querySelector('.comment-toggle-btn .comment-count');
                    if(countEl) countEl.textContent = responseData.post_comment_count;
                }
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
            const responseData = await postData(endpoint, {});
            if (responseData.success) {
                countSpan.textContent = responseData.like_count;
                buttonElement.classList.toggle('active', responseData.liked);
                if (icon) icon.className = responseData.liked ? 'bi bi-heart-fill text-danger' : 'bi bi-heart';
                if (likeText) likeText.textContent = responseData.liked ? 'Liked' : 'Like';
            } else { // Revert on server error
                buttonElement.classList.toggle('active', wasActive);
                if (icon) icon.className = wasActive ? 'bi bi-heart-fill text-danger' : 'bi bi-heart';
                if (likeText) likeText.textContent = wasActive ? 'Liked' : 'Like';
                countSpan.textContent = currentCount;
            }
        } catch (error) { // Revert on network error
             buttonElement.classList.toggle('active', wasActive);
             if (icon) icon.className = wasActive ? 'bi bi-heart-fill text-danger' : 'bi bi-heart';
             if (likeText) likeText.textContent = wasActive ? 'Liked' : 'Like';
             countSpan.textContent = currentCount;
        }
    },
// In static/js/social.js

handleGlobalDeletePost: async function(buttonElement) {
    const postId = buttonElement.dataset.postId;
    const postElement = document.getElementById(`global_post-${postId}`);
    if (!postElement) return;

    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: 'var(--bs-danger)',
        cancelButtonColor: 'var(--bs-secondary)',
        confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
        const endpoint = this.config.apiEndpoints.global.deletePost.replace('{postId}', postId);
        try {
            // --- START: THIS IS THE FIX ---
            // Use the correct helper function for a DELETE request.
            const responseData = await deleteData(endpoint);
            // --- END: THIS IS THE FIX ---

            if (responseData.success) {
                postElement.remove();
                showToast('Success', 'The post has been deleted.', 'success');
            } else {
                showToast('Error', responseData.message || 'Could not delete the post.', 'error');
            }
        } catch (error) {
            console.error('Error deleting global post:', error);
            showToast('Error', error.message || 'An unexpected error occurred.', 'error');
        }
    }
},
// In static/js/social.js

// Replace your existing handleGlobalDeleteComment function with this one.
handleGlobalDeleteComment: async function(buttonElement) {
    const commentId = buttonElement.dataset.commentId;
    const postId = buttonElement.dataset.postId;
    const result = await Swal.fire({ 
        title: 'Delete Comment?', 
        text: "This comment will be removed.", 
        icon: 'warning', 
        showCancelButton: true, 
        confirmButtonText: 'Yes, delete it!' 
    });

    if (result.isConfirmed) {
        const endpoint = this.config.apiEndpoints.global.deleteComment.replace('{commentId}', commentId);
        try {
            // --- START: THIS IS THE FIX ---
            // Use the correct helper function for a DELETE request.
            const responseData = await deleteData(endpoint);
            // --- END: THIS IS THE FIX ---

            if (responseData.success) {
                showNexusNotification('Deleted!', responseData.message || 'Comment removed.', 'success');
                document.getElementById(`comment-global-${commentId}`)?.remove();
                
                const postEl = document.getElementById(`global_post-${postId}`);
                const countEl = postEl?.querySelector('.comment-toggle-btn .comment-count');
                if(countEl && responseData.post_comment_count !== undefined) {
                    countEl.textContent = responseData.post_comment_count;
                }
            } else {
                showNexusNotification('Delete Error', responseData.error || 'Failed to delete comment.', 'error');
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            showNexusNotification('Network Error', error.message || 'Could not delete comment.', 'error');
        }
    }
},
    registerGlobalRealtimeHandlers: function() {
        if (typeof nexusRealtimeManager !== 'undefined') {
            nexusRealtimeManager.on('new_comment', (data) => {
                if (data.post_id && document.getElementById(`global_post-${data.post_id}`)) {
                    const commentsList = document.getElementById(`comments-list-global_post-${data.post_id}`);
                    if (commentsList && !document.getElementById(`comment-global-${data.comment_data.id}`)) {
                        if(data.comment_html) {
                            commentsList.insertAdjacentHTML('beforeend', data.comment_html);
                        } else if (data.comment_data) {
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
            nexusRealtimeManager.on('like_update', (data) => {
                if (data.post_id && document.getElementById(`global_post-${data.post_id}`)) {
                    const postEl = document.getElementById(`global_post-${data.post_id}`);
                    const countSpan = postEl?.querySelector('.like-post-btn .like-count');
                    if(countSpan && data.new_like_count !== undefined) {
                        countSpan.textContent = data.new_like_count;
                    }
                }
            });
        }
    },
    autoResizeTextarea: function(textarea, reset = false) {
        if (!textarea) return;
        if (reset) textarea.style.height = 'auto';
        textarea.style.height = 'auto';
        let newHeight = textarea.scrollHeight;
        const maxHeight = 150;
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
        const originalText = button.dataset.originalText || button.innerHTML;
        if (!button.dataset.originalText) button.dataset.originalText = originalText;
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> ${loadingText}`;
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText;
            delete button.dataset.originalText;
        }
    }
};

window.nexusSocial = nexusSocial;

// Helper for humanizing time (client-side equivalent of Jinja filter)
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
// --- END: CORRECTED social.js ---

// Example of how to send a message from the client-side
async function sendMessage(clubId, messageContent) {
    try {
        const response = await fetch('/talent_club/community/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', // <--- This header is crucial
                // 'X-CSRFToken': getCsrfToken(), // If you are using CSRF protection, include your CSRF token
            },
            body: JSON.stringify({ // <--- Convert your data to a JSON string
                club_id: clubId,
                content: messageContent
            })
        });

        const result = await response.json();

        if (response.ok) {
            console.log('Message sent successfully:', result.message);
            // You might want to clear the message input field or update the UI
        } else {
            console.error('Failed to send message:', result.error);
            // Display an error message to the user
        }
    } catch (error) {
        console.error('Network or other error:', error);
        // Handle network errors
    }
}

// Example usage (replace with your actual values and call when a user submits a message)
// const myClubId = 123; // Get this dynamically, e.g., from a hidden input or data attribute
// const myMessage = "Hello, this is a test message!";
// sendMessage(myClubId, myMessage);

// Function to get CSRF token from a meta tag (common Flask pattern)
// function getCsrfToken() {
//     return document.querySelector('meta[name="csrf-token"]').getAttribute('content');
// }