# Project Documentation: Nexus Integrated School System
### **Phase D: Core Feature Modules (Part 1) - Administrative Systems**
**Version:** 1.0
**Author:** Gemini 3 Pro Preview (Documentation Engine)
**Date:** 2024-05-22

## 1. Asset Management Subsystem

### 1.1. Overview

The Asset Management subsystem provides a comprehensive framework for tracking, managing, and reporting on all physical and digital assets within the school. This includes everything from IT hardware and library books to lab equipment and furniture. The system is designed to provide a clear chain of custody and status for every item.

**Key Models:** `Asset`, `AssetCategory`, `Lab`, `AssetReport`, `BookCheckout`

### 1.2. User Flows & Functionality

#### 1.2.1. Adding a New Asset (`/assets/add`)

*   **Permissions:** `hr_ceo`, `system_admin`, `teacher`, `librarian`, `student` (if `is_leader=True`), `talent_club` (if `is_tc_leader=True`).
*   **Flow:**
    1.  An authorized user navigates to the "Add Asset" form.
    2.  They fill in details such as name, description, quantity, and condition.
    3.  **Smart Assignment Logic:** Depending on the user's role, the system automatically suggests or assigns the asset's default category and location (Lab). For example, an asset added by a Librarian defaults to the "Books" category and "Main Library" lab.
    4.  Upon submission, a new `Asset` record is created with a `status` of **"Pending Review"**.
    5.  A `Notification` is automatically dispatched to all users with the `hr_ceo` role, alerting them to the new asset awaiting approval.

#### 1.2.2. Reviewing and Editing Assets (`/hr_ceo/assets/pending`, `/assets/<id>/edit`)

*   **Permissions:** `hr_ceo`, `system_admin`.
*   **Flow:**
    1.  An administrator views the list of assets pending review.
    2.  They select an asset to open the "Edit Asset" form, which is pre-populated with the submitted data.
    3.  The administrator can correct details, assign the definitive `category_id` and `lab_id`, and, most importantly, change the asset's `status`.
    4.  Changing the status from "Pending Review" to "Available" (or another active status) makes the asset officially part of the school's inventory.
    5.  Upon this status change, a `Notification` is sent to the original user who added the asset, informing them of the approval.

#### 1.2.3. Reporting an Issue (`/asset/<id>/report`, `/report/general`)

*   **Permissions:** Any authenticated user.
*   **Flow:**
    1.  A user can report an issue with a *specific* asset (e.g., a broken microscope) or a *general* issue (e.g., a water leak in the library).
    2.  They fill out the "Report Asset" form, describing the damage or issue.
    3.  A new `AssetReport` record is created with a `status` of **"Pending"**.
    4.  A `Notification` is sent to the `hr_ceo` role, alerting them to the new report.
    5.  The administrator can then review the report, update its status (e.g., to "In Progress"), and add resolution notes. A notification is sent back to the reporter upon status changes.

---

## 2. Multi-Tiered Request System

### 2.1. Overview

This subsystem formalizes the process of making and approving official requests within the school's administrative hierarchy. It is a multi-step workflow designed for accountability and clear communication, ensuring requests are handled by the correct personnel at each level.

**Key Models:** `Request`, `RequestHistory`
**Configuration:** `REQUEST_SYSTEM_PERMISSIONS` (in `app.py`) defines the entire workflow.

### 2.2. The Tiered Workflow

The system is built on a concept of "Tiers," where each tier corresponds to a level of administrative authority.

*   **Tier 1:** HR & CEO (`hr_ceo`)
*   **Tier 2:** School Executive Board (`school_executive`)
*   **Tier 3:** Government Compliance (`government`)

**Flow:**
1.  **Initiation (`/requests/submit`):** An authorized user (e.g., `teacher`, `student_leader`) submits a request. The request is automatically assigned to a Tier 1 handler (`hr_ceo`) and given a `status` of **"Pending"**. A notification is sent to the handler.
2.  **Tier 1 Review (`/requests/<id>/review`):** The HR/CEO reviews the request. They have several options:
    *   **Approve/On Progress:** Change the status and add notes. The request remains at Tier 1.
    *   **Deny:** Deny the request, providing a reason. The workflow ends.
    *   **Resolve:** Mark the request as resolved at their level. The workflow ends.
    *   **Forward:** Escalate the request to Tier 2. The `current_handler_id` is updated to a `school_executive` user, the `tier` is incremented to 2, and the `status` is reset to "Pending".
3.  **Tier 2 & 3 Review:** The workflow repeats at the next tier. The `school_executive` can approve, deny, resolve, or forward to the final Tier 3 (`government`). Government users can only approve or deny.
4.  **History & Notifications:** Every action taken on a request (submission, status change, forward, denial) is logged in the `RequestHistory` table. The original requester is notified of all major status changes.

---

## 3. Task Management Subsystem

### 3.1. Overview

This subsystem provides a formal mechanism for manager-level roles to create, assign, and track tasks for other users. It is distinct from the Request system; Tasks are directives, while Requests are petitions.

**Key Models:** `Task`, `UserTask`, `TaskHistory`
**Configuration:** `TASK_CREATOR_ROLES` (in `app.py`) defines who can create tasks.

### 3.2. User Flows & Functionality

#### 3.2.1. Creating and Assigning Tasks (`/tasks/create`)

*   **Permissions:** `hr_ceo`, `system_admin`, `school_executive`.
*   **Flow:**
    1.  An authorized creator fills out the "Create New Task" form, defining the title, description, urgency, and due date.
    2.  The creator uses a unified assignee picker powered by `Tom Select`. This advanced interface allows them to search for and select:
        *   **Individual Users**
        *   **Entire Roles** (e.g., "all teachers")
        *   **Specific Classes** (e.g., "Grade 9, Section A")
    3.  Upon submission, one `Task` record is created. Then, the system iterates through the selected assignees and creates a separate `UserTask` record for *each individual user*, linking them to the parent `Task`.
    4.  Each `UserTask` begins with a status of **"Open"**.
    5.  Each assigned user receives a `Notification` informing them of their new task.

#### 3.2.2. Completing a Task (`/tasks/user_task/<id>/view`)

*   **Permissions:** Any user who has been assigned a task.
*   **Flow:**
    1.  The user views their assigned task in the "My Tasks" list.
    2.  From the task detail page, they can update the status of their `UserTask` record. Valid status updates include "In Progress", "Completed (Pending Review)", or "Delayed (Pending Review)".
    3.  When a user marks their task as "Completed (Pending Review)," a `Notification` is sent to the original task creator.

#### 3.2.3. Reviewing a Task (`/tasks/user_task/<id>/review`)

*   **Permissions:** The original creator of the parent `Task`.
*   **Flow:**
    1.  The creator is notified that a user has completed their assigned task.
    2.  The creator reviews the user's `UserTask` entry.
    3.  They can either **Accept** the completion, which moves the `UserTask` to a final "Accepted" status, or **Reject** it.
    4.  If rejected, the creator provides notes, and the `UserTask` status is reset to **"Open"**, allowing the assigned user to address the notes and resubmit.
    5.  The assigned user is notified of the review outcome.
    6.  Every status change is logged in the `TaskHistory` table, creating a complete audit trail for each individual assignment.