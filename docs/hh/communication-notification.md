You are absolutely right to point that out. My apologies. I misinterpreted the `CHAT_PERMISSIONS` logic for students. I have re-analyzed the configuration in your code, and you are correct: students cannot initiate chats with teachers, but they can chat with other students who are also Talent Club members.

Thank you for the correction. I will restart this segment with the accurate logic.

***

### Feature Deep Dive: Direct Communication & Notifications 💬

This system is the school's private and secure internal messaging network. It allows for instant, one-on-one conversations and ensures important alerts are delivered directly to the right people, all within the safety of the Nexus platform.

---

#### Private Chat (One-to-One Conversations)

This is like a secure, internal version of WhatsApp or Telegram, designed specifically for school communication, with very clear rules about who can talk to whom.

*   **The Contacts List 📖**
    *   Each user has a personal contacts list. This is not a public phone book; it is a **smart list** showing only the people they are *allowed* to chat with based on their role and the rules set by the administration.
    *   This list is organized neatly by role (Staff, Teachers) and by class, making it easy to find the right person.

*   **Who Can Chat with Whom? (The Rules)**
    *   The entire chat system is governed by a **powerful permissions matrix**. This set of rules dictates exactly who can start a conversation.
    *   **Teachers, Librarians, and Admins** can generally start chats with each other and with parents.
    *   **Students** have specific rules:
        *   By default, a student **cannot** start a chat with a teacher. This ensures that official communication channels are used.
        *   However, students who are **Talent Club Members** are granted the special ability to chat with other Talent Club students. This fosters collaboration and community within that group.
    *   **Parents** can initiate chats with teachers and other staff, but not directly with students other than their own children (if that feature is enabled).

*   **Real-Time Messaging ⚡**
    *   When you open a chat with someone, the conversation happens in real-time.
    *   New messages appear on the screen instantly without needing to refresh the page.
    *   The system shows when the other person has **seen your message** by marking it as "read."

*   **Unread Message Counter**
    *   A red badge 🔴 with a number appears at the top of the screen, showing a user exactly how many new, unread chat messages are waiting for them. This counter updates automatically.

*   **File Sharing in Chat 📎**
    *   Users can attach and send files (like documents, images, or PDFs) directly within a private chat, making it easy to share resources one-on-one.

---

#### The Notification System (Important Alerts 🔔)

This is the school's official announcement system, ensuring that critical updates and alerts are never missed.

*   **Centralized Notification Inbox**
    *   Every user has a personal notification inbox, accessible from anywhere in the application.
    *   Like the chat system, a red badge 🔴 shows the count of unread notifications.

*   **Automated System Alerts**
    *   The system automatically sends notifications for important events:
        *   When you are assigned a new **task**.
        *   When an asset you submitted is **approved**.
        *   When a maintenance report you filed is **resolved**.
        *   When you receive an invitation to join a **Talent Club proposal**.
        *   When a new **behavior record** is added for you or your child.

*   **Direct Message Composition**
    *   Administrators and teachers have the ability to compose and send custom notifications to individuals, entire roles (e.g., "all parents"), or specific groups (e.g., "all Grade 11 students").
    *   They use an intelligent recipient selector to easily find and target the correct audience for their message.

*   **Actionable Links**
    *   Most notifications contain a direct link. Clicking the notification takes the user straight to the relevant page—for example, to the specific task they need to work on, or to the asset report that was just updated. This saves time and makes it easy to take action.

*   **Managing Notifications**
    *   Users can mark individual notifications as read.
    *   They also have a "Mark All as Read" button to easily clear their inbox.
