# Nexus Integrated School System

**Nexus is a comprehensive, feature-rich, and modern web platform designed to serve as the central digital ecosystem for an entire educational institution.**

This is not just a school management tool; it is a fully integrated environment that connects students, teachers, parents, and administrators through a sophisticated, role-aware interface. The platform seamlessly combines academic management, administrative workflows, asset tracking, and a dynamic social hub into a single, cohesive system.

---

## 🌟 Key Features

The Nexus System is architected around several powerful, interconnected subsystems:

*   **🛡️ Role-Based Access Control (RBAC):** A secure core with 9 distinct user roles, ensuring every user has a tailored experience with precisely the right permissions.
*   **📚 Academic Management:** Teachers can manage student marks and track daily attendance. Students have a personalized dashboard to view their academic progress, schedules, and borrowed books.
*   **🏢 Administrative Workflows:**
    *   **Multi-Tiered Request System:** A formal, hierarchical approval system for requests (e.g., purchases, maintenance), ensuring accountability from initial submission to final-tier resolution by `hr_ceo`, `school_executive`, and `government` roles.
    *   **Task Management System:** Authorized administrators can create and assign tasks to individuals, entire roles (e.g., "all teachers"), or specific classes. The system tracks the full lifecycle from assignment to user completion and final review.
*   **📦 Asset & Inventory Tracking:** A complete system for managing school assets, from lab equipment to library books. Includes a workflow for user-submitted assets, administrative review, and issue reporting.
*   **💬 Communication & Social Hub:**
    *   **Real-Time Chat:** A secure, permission-based one-to-one chat system.
    *   **Channels & Groups:** Public/private channels for announcements and collaborative groups for discussion, complete with content posting, comments, and reactions.
    *   **Notification System:** A robust system that alerts users to important, actionable events (e.g., new task, request update) with direct links to the relevant content.
*   **🏆 The Talent Club Ecosystem:** A unique "system-within-a-system" that provides a gamified, self-governing framework for extracurricular clubs. Features include:
    *   A democratic proposal and member-acceptance workflow for creating new clubs.
    *   An elected "TC Leader" role with administrative powers.
    *   A global community group chat for all TC members.
    *   Dedicated feeds, leaderboards, and a moderation system.

---

## 🛠️ Technology Stack

Nexus is built with a modern, robust, and scalable technology stack.

*   **Backend:** Python 3.12, Flask, SQLAlchemy
*   **Database:** PostgreSQL
*   **Frontend:** Jinja2, SASS, Vanilla JavaScript (ES6+), Bootstrap 5.3
*   **Core Libraries:** Flask-Login, Flask-Migrate, Flask-WTF, Socket.IO, FilePond, Tom Select

---

## 🚀 Getting Started

Follow these instructions to get a local development instance of Nexus up and running.

### 1. Prerequisites

*   Python 3.12+
*   PostgreSQL
*   Git

### 2. Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://[your-git-repository-url]/nexus.git
    cd nexus
    ```

2.  **Set up a Python virtual environment:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate  # On macOS/Linux
    # venv\Scripts\activate  # On Windows
    ```

3.  **Install the required packages:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure the database:**
    *   Ensure your PostgreSQL server is running.
    *   Create a new database, for example, `nexusdb`.
    *   In `app.py`, find the `SQLALCHEMY_DATABASE_URI` line and update it with your database credentials:
        `postgresql://USER:PASSWORD@HOST/DB_NAME`

5.  **Initialize the database schema:**
    *   This command creates all the tables based on the latest migration files.
    ```bash
    flask db upgrade
    ```

6.  **Seed the database with initial system data:**
    *   This crucial step creates the necessary roles, categories, and other foundational data.
    ```bash
    flask create-initial
    ```

### 3. Running the Application

*   To run the standard Flask development server:
    ```bash
    flask run
    ```
*   To run with **Socket.IO** for real-time features (recommended):
    ```bash
    python app.py
    ```

The application will be accessible at `http://127.0.0.1:5000`.

### 4. Optional: Populating with Demo Data

*   To populate the database with a set of dummy users, assets, and clubs for demonstration purposes, run the `seed-db` command:
    ```bash
    flask seed-db --count 20 # Seeds with 20 users
    ```
*   To import data from the provided CSV files:
    ```bash
    python import10.py # Imports grade 10 students, etc.
    python import11.py
    ```

---
This concludes the creation of the essential project files.
