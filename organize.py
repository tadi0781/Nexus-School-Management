import os
import shutil

# --- Configuration: Define Phases and their files/directories ---
# We'll use a list of dictionaries, where each dictionary represents a phase.
# 'files' are specific files.
# 'dirs_recursive' are directories whose entire file contents (recursively) should be included.
# 'dirs_flat' are directories whose direct file children should be included (not used as much here but good to have).
# 'exclude_dirs' can be used within 'dirs_recursive' to skip specific subdirectories.

PHASE_DEFINITIONS = [
    {
        "name": "Phase1_Backend_Core",
        "description": "Backend Core Logic",
        "files": ["app.py"],
        "dirs_recursive": [],
    },
    {
        "name": "Phase2_Static_Assets",
        "description": "Static Assets",
        "files": [
            "static/app.txt",
            "static/css/style.css",
            "static/js/analytics.js",
            "static/js/app.js",
            "static/js/chat.js",
            "static/js/main.js",
            "static/js/notifications.js",
            "static/js/requests.js",
            "static/js/social.js",
            "static/js/socketHandlers.js",
            "static/js/talent_club.js",
            "static/js/tasks.js",
            "static/js/ui.js",
            "static/js/utils.js",
        ],
        "dirs_recursive": [
            "static/js/libs/filepond",
            # "static/uploads" # Typically runtime, not concatenated. We can list its presence.
        ],
        "list_only_dirs": ["static/uploads"] # Directories to list in filenames.txt but not concat
    },
    {
        "name": "Phase3_Base_UI_Layout",
        "description": "Base UI & Layout Templates",
        "files": [
            "templates/dashboard_fallback.html",
            "templates/index.html",
            "templates/settings.html",
        ],
        "dirs_recursive": [
            "templates/errors",
            "templates/files", # Contains view_file_modal_content.html
            "templates/layout",
            "templates/partials",
        ],
    },
    {
        "name": "Phase4_Auth_User_Management",
        "description": "Authentication & User Management Templates",
        "files": [],
        "dirs_recursive": ["templates/auth"],
    },
    {
        "name": "Phase5_Core_Feature_Modules",
        "description": "Core Feature Modules Templates",
        "files": [],
        "dirs_recursive": [
            "templates/assets",
            "templates/behavior",
            "templates/books",
            "templates/chat",
            # "templates/notifications" # this one is tricky, main files here, sub-components in partials
            # "templates/requests" # same as above
            # "templates/social" # same as above
            # "templates/talent_club" # same as above
            # "templates/tasks" # same as above
        ],
        # More granular control for directories that have sub-folders for specific features
        # and also might have general files at their root.
        # We can list them individually if `dirs_recursive` is too broad
        # or rely on the `find_files_for_phase` to correctly pick them up from the full list.
        # For simplicity in definition, we'll let the path matching handle it.
        # The following paths will be collected based on the full file list below.
    },
    {
        "name": "Phase6_Role_Based_System",
        "description": "Role-Based & System-Specific Templates",
        "files": [],
        "dirs_recursive": [
            "templates/Database",
            "templates/government",
            "templates/hr_ceo",
            "templates/librarian",
            "templates/parent",
            "templates/school_exec",
            "templates/student",
            "templates/system_admin",
            "templates/talent_club_role_dashboard",
            "templates/teacher",
        ],
    }
]

# This is the master list of all template files for easier assignment to Phases 5 & 6
# (Some partials are generic (Phase 3), some are feature-specific (Phase 5))
ALL_TEMPLATE_FILES = [
    "templates/Database/students/index.html",
    "templates/Database/students/student_block.html",
    "templates/assets/add_asset.html",
    "templates/assets/all_assets.html",
    "templates/assets/edit_asset.html",
    "templates/assets/my_assets.html",
    "templates/assets/report_asset_general.html",
    "templates/assets/report_asset_specific.html",
    "templates/auth/change_password.html",
    "templates/auth/change_password_forced.html",
    "templates/auth/complete_registration.html",
    "templates/auth/confirm_identity.html",
    "templates/auth/login.html",
    "templates/auth/pre_register.html",
    "templates/behavior/add_edit_record.html",
    "templates/behavior/view_student_records.html",
    "templates/books/checkout_book.html",
    "templates/chat/contacts_list.html",
    "templates/chat/contacts_section.html",
    "templates/chat/universal_chat.html",
    "templates/dashboard_fallback.html",
    "templates/errors/403.html",
    "templates/errors/404.html",
    "templates/errors/500.html",
    "templates/files/view_file_modal_content.html",
    "templates/government/dashboard.html",
    "templates/hr_ceo/dashboard.html",
    "templates/hr_ceo/edit_category.html",
    "templates/hr_ceo/list_reports.html",
    "templates/hr_ceo/manage_categories.html",
    "templates/hr_ceo/manage_tc_leader.html",
    "templates/hr_ceo/pending_assets.html",
    "templates/hr_ceo/resolve_report.html",
    "templates/hr_ceo/student_leaders.html",
    "templates/index.html",
    "templates/layout/_flash_messages.html",
    "templates/layout/_footer.html",
    "templates/layout/_navbar.html",
    "templates/layout/_sidebar.html",
    "templates/layout/base.html",
    "templates/librarian/attendance_dashboard.html",
    "templates/librarian/dashboard.html",
    "templates/librarian/list_checkouts.html",
    "templates/librarian/student_profile.html",
    "templates/librarian/take_attendance.html",
    "templates/notifications/contacts_for_sending.html",
    "templates/notifications/send_form.html",
    "templates/notifications/view.html",
    "templates/parent/dashboard.html",
    "templates/partials/_asset_card.html",
    "templates/partials/_asset_report_item.html",
    "templates/partials/_book_checkout_item.html",
    "templates/partials/_channel_card_item.html",
    "templates/partials/_chat_message_item.html",
    "templates/partials/_comment_item.html",
    "templates/partials/_contact_list_item.html",
    "templates/partials/_dashboard_quick_links.html",
    "templates/partials/_dashboard_recent_activity.html",
    "templates/partials/_dashboard_stat_card.html",
    "templates/partials/_global_post_item.html",
    "templates/partials/_group_card_item.html",
    "templates/partials/_notification_item.html",
    "templates/partials/_request_history_log_item.html",
    "templates/partials/_request_list_item.html",
    "templates/partials/_social_content_form.html",
    "templates/partials/_task_history_item.html",
    "templates/partials/_task_list_item.html",
    "templates/partials/_tc_club_card_item.html",
    "templates/partials/_tc_feed_post_item.html",
    "templates/partials/_tc_proposal_item.html",
    "templates/partials/_user_task_assignment_item.html",
    "templates/partials/report_asset_general.html", # Note: these are also in templates/assets
    "templates/partials/report_asset_specific.html", # Note: these are also in templates/assets
    "templates/requests/detail.html",
    "templates/requests/hr_ceo_initiate.html",
    "templates/requests/inbox.html",
    "templates/requests/my_requests.html",
    "templates/requests/review.html",
    "templates/requests/school_exec_initiate.html",
    "templates/requests/submit.html",
    "templates/school_exec/dashboard.html",
    "templates/settings.html",
    "templates/social/channels/create_channel.html",
    "templates/social/channels/discover.html",
    "templates/social/channels/edit_channel.html",
    "templates/social/channels/list.html",
    "templates/social/channels/manage_subscribers.html",
    "templates/social/channels/view_channel.html",
    "templates/social/global/feed.html",
    "templates/social/groups/create_group.html",
    "templates/social/groups/edit_group.html",
    "templates/social/groups/list.html",
    "templates/social/groups/manage_members.html",
    "templates/social/groups/view_group.html",
    "templates/social/partials/_channel_card_item.html", # Note: specific social partial
    "templates/social/partials/_group_card_item.html",   # Note: specific social partial
    "templates/social/partials/_social_comment_item.html",
    "templates/social/partials/_social_content_form.html", # Note: specific social partial
    "templates/social/partials/_social_post_item.html",
    "templates/student/dashboard.html",
    "templates/student/library_view.html",
    "templates/system_admin/dashboard.html",
    "templates/talent_club/club_feed.html",
    "templates/talent_club/club_profile.html",
    "templates/talent_club/community_group.html",
    "templates/talent_club/config_current_leader.html",
    "templates/talent_club/config_my_clubs.html",
    "templates/talent_club/config_new_proposal.html",
    "templates/talent_club/configuration.html",
    "templates/talent_club/dashboard.html",
    "templates/talent_club/discover.html",
    "templates/talent_club/invite_response.html",
    "templates/talent_club/leader/ban_mute_member.html",
    "templates/talent_club/leader/club_management.html",
    "templates/talent_club/leader/member_management.html",
    "templates/talent_club/leader/review_proposal_detail.html",
    "templates/talent_club/leader/review_proposals.html",
    "templates/talent_club/leaderboard.html",
    "templates/talent_club/my_clubs.html",
    "templates/talent_club/my_proposals.html",
    "templates/talent_club/partials/_tc_club_card_item.html", # Note: specific TC partial
    "templates/talent_club/partials/_tc_feed_post_item.html", # Note: specific TC partial
    "templates/talent_club/partials/_tc_member_list_item.html",
    "templates/talent_club/partials/_tc_proposal_item.html",  # Note: specific TC partial
    "templates/talent_club_role_dashboard/dashboard.html",
    "templates/tasks/create.html",
    "templates/tasks/my_assigned_tasks.html",
    "templates/tasks/my_assigned_tasks_detail.html",
    "templates/tasks/my_tasks.html",
    "templates/tasks/user_task_detail.html",
    "templates/teacher/attendance.html",
    "templates/teacher/dashboard.html",
    "templates/teacher/lab_equipment.html",
    "templates/teacher/marks.html",
    "templates/teacher/student_profile_view.html"
]

# --- Helper Function to get all files for a phase ---
def get_files_for_phase(phase_def, all_template_files):
    """
    Collects all file paths relevant to a given phase definition.
    Handles explicitly listed files and recursively found files in directories.
    """
    phase_files = set() # Use a set to avoid duplicates

    # Add explicitly listed files
    for f_path in phase_def.get("files", []):
        if os.path.isfile(f_path):
            phase_files.add(f_path)
        elif os.path.isdir(f_path): # If a directory is listed in 'files', treat as 'dirs_recursive'
             for root, _, files_in_dir in os.walk(f_path):
                for file_name in files_in_dir:
                    phase_files.add(os.path.join(root, file_name))
        else:
            print(f"Warning: Explicit file/dir '{f_path}' in phase '{phase_def['name']}' not found.")

    # Add files from recursive directories
    for dir_path in phase_def.get("dirs_recursive", []):
        if os.path.isdir(dir_path):
            exclude_list = phase_def.get("exclude_dirs", [])
            for root, dirs, files_in_dir in os.walk(dir_path):
                # Filter out excluded directories
                dirs[:] = [d for d in dirs if os.path.join(root, d) not in exclude_list]
                for file_name in files_in_dir:
                    phase_files.add(os.path.join(root, file_name))
        else:
            print(f"Warning: Recursive directory '{dir_path}' in phase '{phase_def['name']}' not found.")

    # Special handling for Phase 5 (Core Feature Modules) using ALL_TEMPLATE_FILES
    # This phase aggregates specific feature-related templates.
    if phase_def["name"] == "Phase5_Core_Feature_Modules":
        feature_roots = [
            "templates/assets/", "templates/behavior/", "templates/books/",
            "templates/chat/", "templates/notifications/", "templates/requests/",
            "templates/social/", "templates/talent_club/", "templates/tasks/"
        ]
        # Exclude files already covered by other, more specific phases (like base UI or auth)
        # Or files that are role-specific dashboards rather than generic feature views
        excluded_from_phase5_if_in_other_phase = set()
        for p_def in PHASE_DEFINITIONS:
            if p_def["name"] not in ["Phase5_Core_Feature_Modules", "Phase6_Role_Based_System"]:
                 # Collect files from other phases to avoid double-counting in phase 5
                if "files" in p_def: excluded_from_phase5_if_in_other_phase.update(p_def["files"])
                if "dirs_recursive" in p_def:
                    for dr in p_def["dirs_recursive"]:
                        if os.path.isdir(dr):
                            for r, _, fs in os.walk(dr):
                                for f_ in fs: excluded_from_phase5_if_in_other_phase.add(os.path.join(r,f_))

        for f_path in all_template_files:
            if any(f_path.startswith(root) for root in feature_roots) and \
               f_path not in excluded_from_phase5_if_in_other_phase and \
               not f_path.startswith("templates/partials/") and \
               not "dashboard.html" in f_path.split('/')[-1] : # generic partials are phase 3, role dashboards are phase 6
                # Refine: some specific partials belong to features
                is_feature_specific_partial = (
                    (f_path.startswith("templates/social/partials/") or \
                     f_path.startswith("templates/talent_club/partials/"))
                )
                if not f_path.startswith("templates/partials/") or is_feature_specific_partial:
                     # Avoid adding generic dashboards (e.g. talent_club/dashboard.html) if they are role specific
                    if "dashboard.html" in f_path:
                        # Only include if it's a feature dashboard, not a role dashboard
                        # e.g. templates/talent_club/dashboard.html is arguably a feature dashboard
                        # but templates/hr_ceo/dashboard.html is a role dashboard
                        if f_path == "templates/talent_club/dashboard.html": # Example of a feature dashboard
                             phase_files.add(f_path)
                    else:
                        phase_files.add(f_path)


    # Files to list only (e.g. 'static/uploads')
    files_to_list_only = set()
    for dir_path in phase_def.get("list_only_dirs", []):
        if os.path.isdir(dir_path):
            files_to_list_only.add(f"{dir_path}/ (and its contents)") # Representing the directory
        else:
            print(f"Warning: list_only_dirs directory '{dir_path}' in phase '{phase_def['name']}' not found.")


    return sorted(list(phase_files)), sorted(list(files_to_list_only))


# --- Main Script Logic ---
def main():
    base_output_dir = "." # Output phase directories in the current directory

    # Ensure all file paths in definitions are OS-specific
    for phase_def in PHASE_DEFINITIONS:
        if "files" in phase_def:
            phase_def["files"] = [os.path.normpath(p) for p in phase_def["files"]]
        if "dirs_recursive" in phase_def:
            phase_def["dirs_recursive"] = [os.path.normpath(p) for p in phase_def["dirs_recursive"]]
        if "list_only_dirs" in phase_def:
            phase_def["list_only_dirs"] = [os.path.normpath(p) for p in phase_def["list_only_dirs"]]

    global ALL_TEMPLATE_FILES # Make sure to use the normalized paths
    ALL_TEMPLATE_FILES = [os.path.normpath(p) for p in ALL_TEMPLATE_FILES]


    for phase_def in PHASE_DEFINITIONS:
        phase_name = phase_def["name"]
        phase_description = phase_def["description"]
        phase_dir_path = os.path.join(base_output_dir, phase_name)

        print(f"Processing {phase_name}: {phase_description}")

        # Create phase directory
        os.makedirs(phase_dir_path, exist_ok=True)

        # Get all files for this phase
        # Note: Phase 5 (Core Feature Modules) and Phase 6 (Role-Based) might have overlapping
        # definitions in terms of `dirs_recursive`. We need to be careful with how `get_files_for_phase`
        # assigns files, or refine the definitions.
        # For now, let's explicitly assign files for more complex phases if `dirs_recursive` is too broad.

        # Refined file collection strategy:
        collected_files_for_content = set()
        collected_files_for_listing = set()

        # 1. Add specific files
        for f_path in phase_def.get("files", []):
            f_path_norm = os.path.normpath(f_path)
            if os.path.isfile(f_path_norm):
                collected_files_for_content.add(f_path_norm)
                collected_files_for_listing.add(f_path_norm)
            else:
                print(f"  Warning: File '{f_path_norm}' not found.")

        # 2. Add files from recursive directories
        for dir_p in phase_def.get("dirs_recursive", []):
            dir_path_norm = os.path.normpath(dir_p)
            if os.path.isdir(dir_path_norm):
                for root, _, files_in_dir in os.walk(dir_path_norm):
                    for file_name in files_in_dir:
                        full_file_path = os.path.normpath(os.path.join(root, file_name))
                        collected_files_for_content.add(full_file_path)
                        collected_files_for_listing.add(full_file_path)
            else:
                print(f"  Warning: Directory '{dir_path_norm}' for recursive search not found.")
        
        # 3. Add directory listings for 'list_only_dirs'
        for dir_p in phase_def.get("list_only_dirs", []):
            dir_path_norm = os.path.normpath(dir_p)
            if os.path.isdir(dir_path_norm):
                collected_files_for_listing.add(f"{dir_path_norm}{os.sep} (and its contents)")
            else:
                print(f"  Warning: Directory '{dir_path_norm}' for listing only not found.")


        # Sort for consistent output
        sorted_files_for_listing = sorted(list(collected_files_for_listing))
        sorted_files_for_content = sorted(list(collected_files_for_content))


        # Write PhaseX_filenames.txt
        filenames_output_path = os.path.join(phase_dir_path, f"{phase_name}_filenames.txt")
        print(f"  Creating: {filenames_output_path}")
        with open(filenames_output_path, "w", encoding="utf-8") as f_out:
            if not sorted_files_for_listing:
                f_out.write("# No files classified for this phase based on current rules.\n")
            for f_path in sorted_files_for_listing:
                f_out.write(f"{os.path.normpath(f_path)}\n") # Ensure normalized paths

        # Write PhaseX_content.txt
        content_output_path = os.path.join(phase_dir_path, f"{phase_name}_content.txt")
        print(f"  Creating: {content_output_path} (concatenating {len(sorted_files_for_content)} files)")
        with open(content_output_path, "w", encoding="utf-8") as f_out:
            if not sorted_files_for_content:
                f_out.write(f"# No file content to concatenate for {phase_name}.\n")
            for f_path in sorted_files_for_content:
                f_path_norm = os.path.normpath(f_path)
                if os.path.isfile(f_path_norm):
                    try:
                        with open(f_path_norm, "r", encoding="utf-8", errors="ignore") as f_in:
                            f_out.write(f"\n{'='*10} Content from: {f_path_norm} {'='*10}\n")
                            f_out.write(f_in.read())
                            f_out.write(f"\n{'='*10} End of content from: {f_path_norm} {'='*10}\n")
                    except Exception as e:
                        f_out.write(f"\n!!! Error reading {f_path_norm}: {e} !!!\n")
                        print(f"    Error reading {f_path_norm} for content: {e}")
                # else: # This case should ideally not happen if collected_files_for_content only has files
                #     f_out.write(f"\n!!! Skipped non-file path for content: {f_path_norm} !!!\n")


        print(f"Done with {phase_name}.")
        print("-------------------------------------")

    print("\nAll phases processed.")
    print("Each PhaseX_... directory now contains:")
    print("1. PhaseX_filenames.txt: A list of files belonging to this phase.")
    print("2. PhaseX_content.txt: A concatenation of the content of these files.")

if __name__ == "__main__":
    # --- Create dummy file structure for testing ---
    # You would run this in your actual project directory
    # For testing, we can simulate the structure.
    print("Setting up a dummy file structure for demonstration...")
    
    # All files from the initial problem description
    all_files_to_create = [
        "app.py",
        "static/app.txt", "static/css/style.css",
        "static/js/analytics.js", "static/js/app.js", "static/js/chat.js",
        "static/js/libs/filepond/filepond.js", "static/js/libs/filepond/filepond.css", # Example files in filepond
        "static/js/main.js", "static/js/notifications.js", "static/js/requests.js",
        "static/js/social.js", "static/js/socketHandlers.js", "static/js/talent_club.js",
        "static/js/tasks.js", "static/js/ui.js", "static/js/utils.js",
        "static/uploads/.gitkeep", # To create the uploads dir
    ]
    all_files_to_create.extend(ALL_TEMPLATE_FILES) # Add all template files

    for file_path_str in all_files_to_create:
        file_path = os.path.normpath(file_path_str)
        dir_name = os.path.dirname(file_path)
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(f"// Content of {file_path}\n// This is a dummy file for demonstration.\n")
    print("Dummy file structure created.")
    print("-------------------------------------")
    # --- End of dummy file structure creation ---

    main()

    # --- Cleanup dummy file structure (optional) ---
    # print("\nCleaning up dummy files and phase directories...")
    # for p_def in PHASE_DEFINITIONS:
    #     shutil.rmtree(p_def["name"], ignore_errors=True)
    # if os.path.exists("app.py"): os.remove("app.py")
    # if os.path.exists("static"): shutil.rmtree("static", ignore_errors=True)
    # if os.path.exists("templates"): shutil.rmtree("templates", ignore_errors=True)
    # print("Cleanup complete.")
    # --- End of cleanup ---

