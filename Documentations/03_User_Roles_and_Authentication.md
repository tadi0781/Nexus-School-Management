# Project Documentation: Nexus Integrated School System
### **Phase C: User Roles & Authentication Subsystem**
**Version:** 1.0
**Author:** Gemini 3 Pro Preview (Documentation Engine)
**Date:** 2024-05-22

## 1. Authentication Flow Overview

The Nexus System employs a secure, multi-stage authentication and registration process designed to ensure that only verified individuals gain access. The entire flow is managed by the **Flask-Login** extension, which handles user session management, and custom application logic.

### 1.1. The User Lifecycle

The journey of a user through the system follows a well-defined path:

1.  **Code Issuance (Offline):** An administrator generates a unique `SecretCode` for a specific individual (e.g., a new student or teacher). This code is associated with their `full_name` and intended `role`.
2.  **Pre-Registration (`/pre_register`):** The user enters their secret code. The system validates the code against the `secret_code` table, ensuring it is valid and has not been used.
3.  **Identity Confirmation (`/confirm-identity`):** Upon successful code validation, the system displays the `full_name` and `role` associated with the code. The user must visually confirm this is their identity before proceeding. This step prevents users from accidentally registering with someone else's code.
4.  **Registration Completion (`/complete-registration`):** The user creates their account by providing a unique `username`, `email`, and a `password`. Upon successful submission, a new record is created in the `user` table, and the `SecretCode` is marked as `is_used=True`.
5.  **Login (`/login`):** The user logs in with their newly created credentials. The system checks their `is_active` flag and, upon success, creates a secure session cookie.
6.  **Forced Password Change (`/change-password-forced`):** If a user's `force_password_change` flag is set to `True` (a feature for administrative password resets), they are immediately redirected to this page after login and cannot proceed until they set a new password.
7.  **Session Management & Access:** While logged in, the `current_user` object is available globally, allowing the system to check permissions for every request.
8.  **Logout (`/logout`):** The user session is securely destroyed, and the user is redirected to the login page.

### 1.2. Security Decorators

Access control is enforced at the route level using custom Python decorators, which wrap the view functions.

*   **`@login_required`:** Provided by Flask-Login, this is the most fundamental decorator. It ensures that a user must be authenticated (logged in) to access a route. If they are not, they are redirected to the login page.

*   **`@role_required(*required_roles)`:** A custom-built decorator that provides fine-grained access control. It checks if the authenticated `current_user.role.name` is present in the list of `required_roles`. If the user's role is not a match, the server responds with a **403 Forbidden** error, preventing access.

*   **`@tc_member_required` / `@tc_leader_required`:** Specialized decorators that check boolean flags (`is_tc_member`, `is_tc_leader`) on the `User` model. These are used to protect routes within the Talent Club subsystem, ensuring access is restricted to members or the designated system-wide leader.

## 2. Role-Based Access Control (RBAC) Matrix

The following matrix provides a high-level overview of the capabilities granted to each primary user role. "Manage" implies full Create, Read, Update, and Delete (CRUD) capabilities, subject to system rules.

| Feature / Module              | Student | Teacher | Librarian | Parent | TC Leader | HR/CEO | Sys. Admin |
| ----------------------------- | :-----: | :-----: | :-------: | :----: | :-------: | :----: | :--------: |
| **View Own Dashboard**        | ✅      | ✅      | ✅        | ✅     | ✅        | ✅     | ✅         |
| **View/Send Chat**            | 🔹¹     | ✅      | ✅        | ✅     | ✅        | ✅     | ✅         |
| **View/Send Notifications**   | 🔹²     | ✅      | ✅        | ✅     | ✅        | ✅     | ✅         |
| **Manage Own Settings**       | ✅      | ✅      | ✅        | ✅     | ✅        | ✅     | ✅         |
| **Submit Requests**           | 🔸³     | ✅      | ✅        | ❌     | ✅        | ✅     | ✅         |
| **Review/Handle Requests**    | ❌      | ❌      | ❌        | ❌     | ❌        | ✅     | ✅         |
| **Create/Assign Tasks**       | ❌      | ❌      | ❌        | ❌     | ❌        | ✅     | ✅         |
| **Receive/Complete Tasks**    | ✅      | ✅      | ✅        | ✅     | ✅        | ✅     | ✅         |
| **Manage All Assets**         | ❌      | ❌      | ❌        | ❌     | ❌        | ✅     | ✅         |
| **Add/Report Assets**         | 🔸³     | ✅      | ✅        | ❌     | ✅        | ✅     | ✅         |
| **Checkout/Return Books**     | ✅      | ✅      | ✅        | ❌     | ✅        | ❌     | ❌         |
| **Manage Student Marks**      | ❌      | ✅      | ❌        | ❌     | ❌        | ✅     | ✅         |
| **Manage Student Attendance** | ❌      | ✅      | ✅        | ❌     | ❌        | ✅     | ✅         |
| **Manage Behavior Records**   | ❌      | ✅      | ✅        | ✅     | ✅        | ✅     | ✅         |
| **Manage Social Channels/Groups**| ❌     | ✅      | ❌        | ❌     | ❌        | ✅     | ✅         |
| **Manage TC System**          | ❌      | ❌      | ❌        | ❌     | ✅        | ✅     | ✅         |
| **Manage User Accounts**      | ❌      | ❌      | ❌        | ❌     | ❌        | ❌     | ✅         |

---
**Notes on Permissions:**
*   **¹ Chat (Student):** Students can only initiate chats if they are a Talent Club Member (`is_tc_member=True`), and only with other TC Members or specific staff roles.
*   **² Notifications (Student):** Students can only *receive* notifications; they cannot send them.
*   **³ Submissions (Student):** Standard students cannot submit requests or add assets. This capability is granted only if the `is_leader` flag is `True`.

This matrix simplifies a complex set of rules defined in the `CHAT_PERMISSIONS` and `NOTIFICATION_PERMISSIONS` dictionaries in `app.py`, as well as logic embedded within the route decorators.

## 3. Core Permissions Logic (`app.py`)

The heart of the permission system resides in a series of helper functions and configuration dictionaries within `app.py`.

*   **`CHAT_PERMISSIONS` & `NOTIFICATION_PERMISSIONS`:** These dictionaries define, on a role-by-role basis, who can `send_to` and `receive_from` whom. They even account for exceptions, such as the elevated permissions granted to a `student` who is also a `tc_member`.

*   **`get_allowed_roles_helper(...)`:** This is the master function that parses the permission dictionaries. It takes a user object and a direction ('send_to' or 'receive_from') and returns a definitive list of roles they can interact with. This function is the engine behind the chat and notification permission checks.

*   **`is_chat_allowed(...)` & `is_notification_allowed(...)`:** These specific helper functions utilize the master helper to provide a simple boolean (`True`/`False`) response for whether a communication link is permitted between a specific sender and receiver. They are used extensively before sending any message or notification to ensure rules are not violated.

This structured, dictionary-based approach to permissions is highly scalable and maintainable. To change a permission, an administrator only needs to modify a single line in the configuration dictionary rather than searching for hard-coded logic within the application's routes.