Of course. Here is the next segment, explaining the **User Authentication & Session Management** system.

***

### Feature Deep Dive: User Authentication & Session Management 🔑

Think of this system as the school's **digital gatekeeper and ID card office**. It ensures only the right people can enter the platform, and it guides them to the areas they are permitted to see. Its main job is to provide strong security and a simple, safe way to access your account.

---

#### Getting Your First ID Card (The Registration Process)

For a new user to join the platform, they must go through a secure, one-time registration process. This prevents unauthorized people from creating accounts.

*   **Step 1: The Invitation Code ✉️**
    *   A new user cannot simply sign up. They must first receive a special, secret code from the school administration.
    *   This code acts as a unique invitation ticket. They begin by entering this code on the registration page.

*   **Step 2: Confirming Your Identity 🤔**
    *   After the code is accepted, the system displays the full name and role that is linked to that code (for example, "Abebe Bikila, Teacher").
    *   The user must look at this information and click a button to confirm, **"Yes, this is me."** This is a critical step to ensure the right person is claiming the account.

*   **Step 3: Creating Your Personal Login ✍️**
    *   Once their identity is confirmed, the user creates their own private login details. They choose a unique **username** and set a secret **password**.
    *   After this step is complete, their digital ID is ready. The special invitation code they used is now deactivated and **can never be used again**. It is a one-time key 🗝️.

---

#### Entering the School (Logging In)

This is the daily process of showing your digital ID card at the front gate.

*   **The Login Process**
    *   A user enters their username and password.
    *   The system immediately performs several security checks:
        1.  It verifies that the username exists in our system.
        2.  It checks that the password provided is correct for that username.
        3.  It confirms that the account is **"active."** If an administrator has disabled an account, the user cannot log in, even with the correct password.

*   **Forced Password Change**
    *   For brand-new users or if an admin resets an account, the system will **force** them to create a new, private password immediately after they log in for the first time.
    *   They are not allowed to see or visit any other page until this important security step is completed.

*   **Automatic Guidance (Redirection) 🧭**
    *   The system is smart. Once a user logs in successfully, it acts like a personal guide.
    *   It looks at the user's role (Student, Teacher, Admin) and automatically takes them directly to their correct dashboard, saving them time.

---

#### Leaving the School (Logging Out)

This is like securely signing out and returning your visitor pass at the end of the day.

*   **Secure Logout**
    *   When a user clicks the "Logout" button, their session is ended immediately and completely.
    *   The system is designed to forget who was logged in, ensuring that the next person to use the same computer cannot access the previous user's private account information.

---

#### Changing Your Password

*   Users have the ability to change their own password at any time from their personal settings page.
*   For security, the system always requires them to enter their **current password** correctly before it will allow them to set a new one. This prevents someone who has access to an already-logged-in computer from changing the password without permission.
