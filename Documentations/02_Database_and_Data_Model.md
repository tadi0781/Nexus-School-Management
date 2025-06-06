# Project Documentation: Nexus Integrated School System
### **Phase B: Database & Data Model Specification**
**Version:** 1.0
**Author:** Gemini 3 Pro Preview (Documentation Engine)
**Date:** 2024-05-22

## 1. Database Overview

The Nexus System utilizes a **PostgreSQL** relational database, managed through the **SQLAlchemy ORM** (Object-Relational Mapper). This approach allows for robust, type-safe interaction with the database using Python objects, while a version-controlled migration system powered by **Alembic** ensures schema integrity and evolutionary design.

This document details every data model (table) and its corresponding columns and relationships.

## 2. Recommendation: Entity-Relationship Diagram (ERD)

**A visual ERD is essential for comprehending the complex relationships within the Nexus data model.** It provides an at-a-glance overview that is far more intuitive than text-based descriptions alone.

**Action:** It is strongly recommended to create an ERD using a tool like `draw.io`, `Lucidchart`, or `dbdiagram.io`. The definitions below provide all the necessary information (entities, attributes, and relationships) to construct this diagram.

The diagram should place the `User` model at the center, as it is the primary entity to which most other models are connected.

## 3. Core Models & User-Centric Entities

These models form the foundation of the system, defining users and their primary roles.

### 3.1. `User` (Table: `user`)

The central model of the entire application. It represents every individual who can log in to the system. It uses a `single-table inheritance` pattern for roles, where the `role_id` and boolean flags (`is_leader`, `is_tc_member`, etc.) define the user's type and permissions.

| Column                | Type (SQLAlchemy) | Details                                                                 |
| --------------------- | ----------------- | ----------------------------------------------------------------------- |
| `id`                  | Integer           | **Primary Key.** Unique identifier for the user.                          |
| `username`            | String(80)        | **Unique, Indexed.** The user's login name.                               |
| `email`               | String(120)       | **Unique, Indexed.** The user's email address. Nullable.                  |
| `password_hash`       | String(128)       | Stores the hashed password using `werkzeug.security`.                     |
| `full_name`           | String(120)       | **Indexed.** The user's full name.                                        |
| `first_name`          | String(50)        | The user's first name.                                                    |
| `last_name`           | String(50)        | The user's last name.                                                     |
| `role_id`             | Integer           | **Foreign Key -> `role.id`.** Determines the user's primary role.        |
| `lab_id`              | Integer           | **Foreign Key -> `lab.id`.** The lab a user (e.g., Teacher) is assigned to.|
| `grade`               | String(10)        | **Indexed.** The grade of a student.                                      |
| `section`             | String(10)        | **Indexed.** The section of a student.                                    |
| `is_active`           | Boolean           | Controls if the user can log in. Defaults to `False`.                     |
| `force_password_change`| Boolean          | If `True`, user must change password on next login.                      |
| `is_leader`           | Boolean           | Flag indicating if a student is a designated Student Leader.             |
| `is_tc_member`        | Boolean           | Flag indicating if a student has joined the Talent Club system.          |
| `is_tc_leader`        | Boolean           | Flag indicating if the user is the system-wide Talent Club Leader.        |
| `profile_photo_url`   | String(255)       | Path to the user's profile photo.                                         |
| `created_at`          | DateTime          | Timestamp of user creation.                                               |
| `last_login`          | DateTime          | Timestamp of the user's last login.                                       |
| ... *other profile fields* | ...          | `date_of_birth`, `gender`, `phone`, `address`, `age`, `sex`.              |

**Key Relationships:**
*   **Role:** `User` to `Role` (Many-to-One). A user has one role; a role can have many users.
*   **Lab:** `User` to `Lab` (Many-to-One). A user can be assigned to one lab.
*   **Leader/Followers:** `User` to `User` (Many-to-One, Self-referencing). A student can have one leader.
*   **Literally Everything Else:** The `User` model has dozens of one-to-many relationships with almost every other functional model in the system (e.g., `created_tasks`, `sent_messages`, `submitted_requests`, `channel_posts`).

### 3.2. `Role` (Table: `role`)

Defines the permission groups for users.

| Column | Type (SQLAlchemy) | Details                                    |
| ------ | ----------------- | ------------------------------------------ |
| `id`   | Integer           | **Primary Key.**                           |
| `name` | String(50)        | **Unique.** Name of the role (e.g., `student`, `hr_ceo`). |

### 3.3. `SecretCode` (Table: `secret_code`)

Used for the initial, one-time registration process.

| Column    | Type (SQLAlchemy) | Details                                                         |
| --------- | ----------------- | --------------------------------------------------------------- |
| `id`      | Integer           | **Primary Key.**                                                |
| `code`    | String(20)        | **Unique, Indexed.** The registration code itself.              |
| `full_name` | String(120)     | The full name of the person this code is for.                   |
| `role_id` | Integer           | **Foreign Key -> `role.id`.** The role to be assigned on registration. |
| `is_used` | Boolean           | Flag to prevent reuse. Defaults to `False`.                      |

---

## 4. Subsystem Data Models

### 4.1. Authentication & Profile Models

*   **`Parent` (Table: `parent`):** Links a `User` with the 'parent' role to parent-specific settings.
*   **`ParentStudent` (Table: `parent_student`):** An association table linking a `Parent` to a `User` (student). Manages the verification status of the relationship.
*   **`TeacherProfile` (Table: `teacher_profile`):** Links a `User` with the 'teacher' role to specific teaching assignments (subject, grade, section).

### 4.2. Asset Management & Library Models

*   **`Asset` (Table: `asset`):** The central table for all physical and digital assets, from lab equipment to library books.
*   **`AssetCategory` (Table: `asset_category`):** Defines categories for assets (e.g., "IT Hardware", "Books").
*   **`Lab` (Table: `lab`):** Represents physical locations where assets can be stored (e.g., "Science Lab A", "Main Library").
*   **`AssetReport` (Table: `asset_reports`):** Records issues or damage reports submitted by users for specific assets.
*   **`BookCheckout` (Table: `book_checkout`):** Tracks the checkout of assets categorized as "Books" to users.
*   **`BorrowedAsset` (Table: `borrowed_asset`):** A similar, potentially redundant table to `BookCheckout` for tracking borrowed items. **Recommendation:** Consolidate `BookCheckout` and `BorrowedAsset` into a single, generic `AssetCheckout` model to reduce complexity.

### 4.3. Communication & Social Models

*   **`Message` (Table: `message`):** Stores one-to-one private chat messages between two `User` entities.
*   **`Notification` (Table: `notification`):** Stores system-generated notifications sent to users. Includes a `link_url` for actionable notifications.
*   **`SocialCategory` (Table: `social_category`):** Defines categories for social entities (e.g., "Entertainment", "Education").
*   **`Channel` (Table: `social_channels`):** Represents a social channel (e.g., "School Announcements"). Owned by a `User`, it contains posts.
*   **`ChannelPost` (Table: `social_channel_posts`):** A single post within a `Channel`. Can contain text and/or a link to a `File`.
*   **`ChannelComment` (Table: `social_channel_comments`):** A comment on a `ChannelPost`.
*   **`ChannelReaction` (Table: `social_channel_reactions`):** An emoji reaction from a `User` to a `ChannelPost`.
*   **`SocialGroup` (Table: `social_groups`):** Represents a user-created group chat.
*   **`SocialGroupMember` (Table: `social_group_members`):** Association table linking `User`s to `SocialGroup`s.
*   **`GroupMessage` (Table: `social_group_messages`):** A message within a `SocialGroup`.
*   **`File` (Table: `social_files`):** A generic table to store metadata about any user-uploaded file (for social posts, proposals, etc.).

### 4.4. Academic & Behavioral Models

*   **`Mark` (Table: `mark`):** Stores semester, total, and average marks for a `User` (student) in a specific subject.
*   **`Attendance` (Table: `student_attendance`):** Records daily attendance status for students.
*   **`StaffAttendance` (Table: `staff_attendance`):** Records daily attendance for staff.
*   **`BehaviorRecord` (Table: `behavior_record`):** Logs positive or negative behavior incidents for a student, recorded by a staff member.

### 4.5. Task Management System Models

This system is a well-designed, self-contained module for assigning and tracking work.

*   **`Task` (Table: `task`):** The main instruction or task definition, created by a manager-level `User`. Contains the title, description, urgency, and due date.
*   **`UserTask` (Table: `user_task`):** The specific assignment of a `Task` to an individual `User`. It tracks the status of that *user's* progress on the task (e.g., 'In Progress', 'Completed (Pending Review)'). This is the core transactional table.
*   **`TaskHistory` (Table: `task_history`):** An audit log that records every status change for a `UserTask`, providing a complete history of the assignment's lifecycle.

### 4.6. Multi-Tiered Request System Models

This system facilitates a formal, multi-level approval process.

*   **`Request` (Table: `request`):** The core request submitted by a user. It tracks the `current_handler_id` and the current approval `tier` and `status`.
*   **`RequestHistory` (Table: `request_history`):** An audit log that records every action (e.g., 'Submitted', 'Forwarded', 'Approved') taken on a `Request`.

### 4.7. Talent Club (TC) Subsystem Models

This is the most intricate and bespoke module in the application, representing a rich "system-within-a-system" for managing extracurricular clubs.

*   **`TalentClub` (Table: `talent_club_instances`):** Represents an individual, approved club (e.g., "The Debate Society").
*   **`TalentClubProposal` (Table: `talent_club_proposals`):** A proposal submitted by a TC member to create a new club. It must be reviewed and accepted.
*   **`TalentClubMention` (Table: `talent_club_proposal_mentions`):** Links a `User` to a `TalentClubProposal`, representing an invitation to join the proposed club. The user must accept the mention.
*   **`TalentClubMembership` (Table: `talent_club_memberships`):** An association table linking a `User` to a `TalentClub` they are an official member of.
*   **`TalentClubFollow` (Table: `talent_club_follows`):** Allows a `User` to follow a club's public activity without being a full member.
*   **`TalentClubFeed` & `TalentClubFeedPost`:** A dedicated content feed system for each `TalentClub`, mirroring the structure of Channels/ChannelPosts.
*   **`TalentClubCommunity` & related tables:** A global chat group exclusively for all users with `is_tc_member=True`.
*   **`TalentClubLeaderElection` & `TalentClubLeaderVote`:** Manages the democratic election process for the system-wide `is_tc_leader` role.
*   **`TalentClubBan` / `Penalty` / `Warning`:** A suite of models for moderation and governance within the TC ecosystem.