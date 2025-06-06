# standalone_seed_parents.py
import os
import sys
import random
import string
from datetime import datetime, timezone

# Configure the script to find the app.py and its models
# This assumes standalone_seed_parents.py is in the same directory as app.py
# or that app.py is in the Python path.
# If your app structure is different (e.g., app is in a sub-package), adjust this.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(SCRIPT_DIR) # Add script's directory to path

# Attempt to import necessary components from your Flask app
try:
    from app import app, db, User, Role, Parent, ParentStudent, SecretCode
except ImportError as e:
    print(f"Error importing from app.py: {e}", file=sys.stderr)
    print("Make sure this script is in the same directory as app.py, or app.py is in PYTHONPATH.", file=sys.stderr)
    sys.exit(1)

# Helper function for Random Code
def generate_random_code(length=6):
    characters = string.ascii_letters + string.digits # Alphanumeric
    return ''.join(random.choice(characters) for _ in range(length))

def seed_parents_from_student_lastnames():
    """
    Standalone script to:
    1. Identify unique student last names.
    2. For each unique last name, create a "Parent" User (if one with a derived username doesn't exist).
       The student's last name becomes the parent's first name.
    3. Create a SecretCode for the new parent.
    4. Link all students (active or inactive) sharing that last name to this parent with relationship "Father" and "verified" status.
    """
    with app.app_context(): # Essential for Flask-SQLAlchemy operations
        print("--- Starting Parent Seeding Script ---")

        parent_role = db.session.scalar(db.select(Role).filter_by(name="parent"))
        student_role = db.session.scalar(db.select(Role).filter_by(name="student"))

        if not parent_role:
            print("Error: 'parent' role not found. Please run 'flask create-initial' or ensure it exists.", file=sys.stderr)
            return
        if not student_role:
            print("Error: 'student' role not found. Please run 'flask create-initial' or ensure it exists.", file=sys.stderr)
            return

        # Get unique student last names (from ALL students, active or not)
        unique_student_last_names_query = (
            db.select(db.distinct(User.last_name))
            .where(
                User.role_id == student_role.id,
                User.last_name.isnot(None),
                User.last_name != ''
            )
        )
        unique_student_last_names = db.session.scalars(unique_student_last_names_query).all()

        if not unique_student_last_names:
            print("No student last names found to process. Exiting.")
            return

        print(f"Found {len(unique_student_last_names)} unique student last names to process for parent creation.")

        created_parents_count = 0
        created_links_count = 0
        processed_parent_usernames_in_run = set()

        for student_ln_seed in unique_student_last_names:
            parent_first_name = student_ln_seed
            sanitized_ln_for_username = parent_first_name.lower().replace(' ', '_').replace('-', '_') # Further sanitize
            parent_username = f"{sanitized_ln_for_username}_father"

            # Prevent processing if this derived username was already handled in this script run
            if parent_username in processed_parent_usernames_in_run:
                print(f"Skipping parent username '{parent_username}' as it was already processed in this run (derived from a different last_name that normalized to the same username).")
                continue
            processed_parent_usernames_in_run.add(parent_username)


            parent_full_name = f"{parent_first_name} (Father)"
            # Ensure email uniqueness by adding a small random suffix if needed, or check existence
            base_parent_email = f"{parent_username}@schoolparent.com"
            parent_email = base_parent_email
            email_suffix = 1
            while db.session.scalar(db.select(User).filter_by(email=parent_email)):
                parent_email = f"{parent_username}{email_suffix}@schoolparent.com"
                email_suffix +=1
                if email_suffix > 10: # Safety break
                    print(f"Could not generate unique email for {parent_username} after 10 tries. Skipping.")
                    continue


            parent_user_for_linking = None
            parent_profile_for_linking = None

            existing_parent_user = db.session.scalar(db.select(User).filter_by(username=parent_username))

            if existing_parent_user:
                print(f"Parent user '{parent_username}' (ID: {existing_parent_user.id}) already exists.")
                parent_user_for_linking = existing_parent_user
                parent_profile_for_linking = db.session.scalar(
                    db.select(Parent).filter_by(user_id=existing_parent_user.id)
                )
                if not parent_profile_for_linking:
                    print(f"  WARNING: Existing parent user '{parent_username}' lacks a Parent profile. Creating one now.")
                    parent_profile = Parent(user_id=existing_parent_user.id)
                    db.session.add(parent_profile)
                    try:
                        db.session.flush() # Get ID
                        parent_profile_for_linking = parent_profile
                        print(f"  Created missing Parent profile (ID: {parent_profile.id}) for existing user {parent_username}.")
                    except Exception as e_flush_parent:
                        db.session.rollback()
                        print(f"  ERROR: Could not create missing Parent profile for {parent_username}: {e_flush_parent}. Skipping this parent.")
                        continue
                else:
                     print(f"  Will link students to existing Parent Profile ID: {parent_profile_for_linking.id}")

            else: # Parent user does not exist, so create them
                print(f"Creating Parent User: {parent_full_name} (Username: {parent_username}, Email: {parent_email})")
                new_parent_user = User(
                    username=parent_username,
                    email=parent_email,
                    full_name=parent_full_name,
                    first_name=parent_first_name,
                    last_name="(Father)", # Or derive if needed
                    role_id=parent_role.id,
                    is_active=True,
                    force_password_change=False, # Password 'password123'
                    created_at=datetime.now(timezone.utc)
                )
                new_parent_user.set_password("password123")
                db.session.add(new_parent_user)
                try:
                    db.session.flush() # Get ID for the new_parent_user
                    parent_user_for_linking = new_parent_user

                    parent_profile = Parent(user_id=new_parent_user.id)
                    db.session.add(parent_profile)
                    db.session.flush() # Get ID for parent_profile
                    parent_profile_for_linking = parent_profile
                    print(f"  Created Parent Profile ID: {parent_profile.id}")

                    # Generate unique 6-char random code for SecretCode
                    random_parent_code = generate_random_code(6)
                    while db.session.scalar(db.select(SecretCode).filter_by(code=random_parent_code)):
                        random_parent_code = generate_random_code(6)

                    parent_secret_code = SecretCode(
                        code=random_parent_code,
                        full_name=parent_full_name,
                        role_id=parent_role.id,
                        is_used=False, # This parent won't "use" it for registration
                        created_at=datetime.now(timezone.utc)
                    )
                    db.session.add(parent_secret_code)
                    print(f"  Created SecretCode: {random_parent_code} for parent {parent_full_name}")
                    created_parents_count += 1
                except Exception as e_create:
                    db.session.rollback() # Rollback parent user, profile, secret code creation
                    print(f"  ERROR creating parent user/profile/secret code for {parent_username}: {e_create}. Skipping.")
                    continue # Skip to next last name seed

            # Link students to this parent (newly created or existing)
            if not parent_profile_for_linking: # Should not happen if logic above is correct
                print(f"  ERROR: No parent profile available for linking for '{parent_first_name}'. Skipping student links.")
                continue

            students_to_link_query = (
                db.select(User)
                .where(
                    User.role_id == student_role.id,
                    User.last_name == student_ln_seed
                )
            )
            students_to_link = db.session.scalars(students_to_link_query).all()

            if not students_to_link:
                print(f"  No students found with last name '{student_ln_seed}' to link for parent '{parent_username}'.")
                # This is possible if all students with this last name were inactive and you decided not to link inactive students earlier,
                # or if the student records were changed between fetching unique last names and now.
                # For this script, we decided to link ALL students with the last name.
            else:
                print(f"  Found {len(students_to_link)} student(s) with last name '{student_ln_seed}' to link.")

            for student_obj in students_to_link:
                existing_link = db.session.scalar(
                    db.select(ParentStudent).filter_by(parent_id=parent_profile_for_linking.id, student_id=student_obj.id)
                )
                if existing_link:
                    print(f"    - Link already exists for Parent '{parent_user_for_linking.full_name}' and Student '{student_obj.full_name}'. Skipping.")
                    continue

                new_link = ParentStudent(
                    parent_id=parent_profile_for_linking.id,
                    student_id=student_obj.id,
                    relationship="Father",
                    verification_status="verified",
                    verified_at=datetime.now(timezone.utc)
                )
                db.session.add(new_link)
                created_links_count += 1
                print(f"    - Linked Student: {student_obj.full_name} (ID: {student_obj.id}) to Parent Profile ID: {parent_profile_for_linking.id}")
            
            # Commit after each parent and their associated students are processed,
            # or commit once at the very end. Committing per parent makes it more resilient to single failures.
            try:
                db.session.commit()
                print(f"  Committed changes for parent derived from last name '{student_ln_seed}'.")
            except Exception as e_commit_parent_block:
                db.session.rollback()
                print(f"  ERROR committing changes for parent '{parent_username}': {e_commit_parent_block}. This block of changes was rolled back.")


        # Final summary message after the loop
        print(f"\n--- Parent Seeding Summary ---")
        print(f"Successfully created {created_parents_count} new parent users (and profiles/secret codes).")
        print(f"Successfully created {created_links_count} new parent-student links.")
        if created_parents_count == 0 and created_links_count == 0:
            print("No new parents or links were created (they may have already existed based on derived usernames).")

if __name__ == "__main__":
    # This check ensures the script is run directly, not imported.
    # We need to ensure the Flask app context is available.
    
    # Check if a command-line argument is provided (e.g., a confirmation)
    # This is a simple way to prevent accidental execution without explicit intent.
    if len(sys.argv) > 1 and sys.argv[1] == '--confirm-seed':
        print("Confirmation received. Proceeding with parent seeding.")
        seed_parents_from_student_lastnames()
        print("--- Script Finished ---")
    else:
        print("\nWARNING: This script will modify your database by creating parent users and links.")
        print("It uses student last names to generate parent first names and links them.")
        print("This is intended for seeding data for DEVELOPMENT/DEMONSTRATION purposes ONLY.")
        print("Backup your database before running if it contains important data.")
        print("\nTo run this script, execute: python standalone_seed_parents.py --confirm-seed\n")
