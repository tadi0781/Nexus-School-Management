# Project Documentation: Nexus Integrated School System
### **Phase E: Core Feature Modules (Part 2) - Interaction Systems**
**Version:** 1.0
**Author:** Gemini 3 Pro Preview (Documentation Engine)
**Date:** 2024-05-22

## 1. Social Hub (Channels & Groups)

### 1.1. Overview

The Social Hub is a multifaceted system designed to facilitate communication and content sharing among various segments of the school community. It is fundamentally split into two distinct concepts: **Channels** for broadcast-style communication and **Groups** for collaborative, multi-directional conversation.

**Key Models:** `SocialCategory`, `Channel`, `ChannelPost`, `ChannelSubscriber`, `SocialGroup`, `SocialGroupMember`, `GroupMessage`, `File`, and related comment/reaction models.

### 1.2. Channels

Channels function like announcement boards or content feeds. They are a one-to-many communication tool where authorized posters (Owners, Admins) broadcast information to a wider audience of subscribers.

**Key Features:**
*   **Creation (`/social/create_channel`):** Restricted to higher-permission roles (e.g., `teacher`, `hr_ceo`). Creators define the channel's name, category, and type (`public` or `private`).
*   **Permissions:** A `ChannelSubscriber` association table links users to channels with a specific role (`owner`, `admin`, `subscriber`). This granular control determines who can post, edit the channel, and manage other subscribers.
*   **Content Posting:** Authorized users can create `ChannelPost` entries, which can include text and a single file attachment (`File` model).
*   **Interactivity:** Subscribers can interact with posts by adding `ChannelComment`s or `ChannelReaction`s, if enabled by the channel's settings (`allow_comments`, `allow_reactions`).
*   **Discovery (`/social/channels/discover`):** A dedicated page where users can find and subscribe to `public` channels.

### 1.3. Groups

Groups function like persistent, multi-user chat rooms. They are designed for many-to-many conversations among a defined set of members.

**Key Features:**
*   **Creation (`/social/create_group`):** Similar to channels, creation is restricted to specific roles. The creator automatically becomes the group's `owner`.
*   **Membership:** Access is strictly controlled. Unlike public channels, a user must be a `SocialGroupMember` to view or post in a group. Membership is managed by the group's owner and admins.
*   **Content:** Communication occurs via `GroupMessage` records, which, like posts, can contain text and an optional file attachment. There is no concept of "comments" on a group message; replies are simply new messages in the stream.

---

## 2. Real-Time Chat System

### 2.1. Overview

The Chat system provides real-time, one-to-one private messaging between users. It is designed to be fast, responsive, and secure, with access strictly governed by a detailed permission matrix.

**Key Models:** `Message`, `User`, `Role`
**Configuration:** `CHAT_PERMISSIONS` dictionary in `app.py`.
**Client-Side Logic:** `static/js/chat.js`

### 2.2. Architecture & Logic

*   **Permission-Based Visibility (`/contacts`):** The user's contact list is not a simple list of all users. It is dynamically generated based on the `CHAT_PERMISSIONS` configuration. A user can only see and initiate chats with roles that their own role is permitted to `send_to`. For example, a standard student cannot see other students in their contact list unless they are a Talent Club member, which grants them an exception to the rule.

*   **AJAX Polling for Real-Time Simulation:** The chat does not use a persistent WebSocket connection. Instead, the `chat.js` script implements an AJAX polling mechanism.
    1.  When a chat window is opened, it loads the initial message history.
    2.  It then starts a `setInterval` loop that runs every 5 seconds (`CHAT_POLL_INTERVAL`).
    3.  Each interval makes a GET request to `/chat/api/messages/<id>/new`, passing the timestamp of the last received message.
    4.  The backend queries for any messages newer than that timestamp and returns them as a JSON object.
    5.  The JavaScript then dynamically appends these new messages to the chat window, giving the user the experience of a real-time conversation.

*   **Message State:** Each `Message` record has an `is_read` boolean flag. This flag is set to `True` by the backend when a user loads a conversation, ensuring unread message counts are accurate.

---

## 3. Notification System

### 3.1. Overview

The Notification System is the primary mechanism for alerting users to important events and actions that require their attention. It is a robust system designed to be both informative and actionable.

**Key Models:** `Notification`, `User`, `Role`
**Configuration:** `NOTIFICATION_PERMISSIONS` dictionary in `app.py`.
**Client-Side Logic:** `static/js/notifications.js`

### 3.2. Architecture & Logic

*   **Event-Driven Creation:** Notifications are not created manually by users (except for a few specific admin cases). Instead, they are triggered by specific events within other application modules. For example:
    *   A new task assignment triggers `notify_task_assigned()`.
    *   An asset report submission triggers `notify_hr_ceo_new_report()`.
    *   A TC proposal acceptance triggers a notification to all involved members.

*   **Actionable Links:** A key feature of the `Notification` model is the `link_url` column. When a notification is generated, the system uses Flask's `url_for()` to create a direct link to the relevant page (e.g., a link to the specific task that needs attention). This makes the notification system an integral part of the application's navigation and workflow.

*   **AJAX Polling for Updates:** Similar to the Chat system, the frontend uses an AJAX polling loop (`fetchNewNotifications` in `notifications.js`) to check for new notifications periodically. This allows the unread count in the main navigation bar to update dynamically, providing users with immediate awareness of new events without requiring a page refresh.

*   **Read Status Management:** Notifications are marked as read in two ways:
    1.  **Bulk:** When a user navigates to the main `/notifications` page, all currently unread notifications are marked as read.
    2.  **Individually:** AJAX calls are used to mark single notifications as read when interacted with in the notification dropdown menu..