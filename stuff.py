import os
import sys
import random
import string
from datetime import datetime, timezone

# --- Adjust these imports based on your project structure ---
try:
    from app import app, db, User, Role, SecretCode
except ImportError:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(current_dir, '..')) 
    if project_root not in sys.path:
        sys.path.insert(0, project_root)
    try:
        from app import app, db, User, Role, SecretCode
    except ImportError as e:
        print(f"Failed to import Flask app components. Please ensure this script is in your project's root OR")
        print(f"that the paths are correctly set up for your project structure.")
        print(f"Error: {e}")
        sys.exit(1)
# --- End of import adjustments ---

from werkzeug.security import generate_password_hash

# --- Sample Ethiopian Names ---
first_names_male = ["Abebe", "Haile", "Dawit", "Samuel", "Yonas", "Bereket", "Daniel", "Mulugeta", "Teshome", "Getachew"]
first_names_female = ["Frehiwot", "Sofia", "Hana", "Martha", "Selam", "Tigist", "Eden", "Aster", "Meseret", "Rahel"]
last_names = ["Kebede", "Tesfaye", "Lemma", "Girma", "Mekonnen", "Assefa", "Berhanu", "Woldemariam", "Tadesse", "Bekele"]

def generate_ethiopian_name(gender_choice=None):
    if gender_choice is None:
        gender_choice = random.choice(["male", "female"])

    if gender_choice == "male":
        first = random.choice(first_names_male)
    else:
        first = random.choice(first_names_female)
    last = random.choice(last_names)
    return f"{first} {last}", first, last

def generate_secret_code(length=6):
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for i in range(length))

def seed_users_and_codes():
    """Seeds one user for specified roles (excluding parent, student, teacher, talent_club), with secret codes."""
    print("Starting to seed specific user roles...")

    # Roles to seed (excluding student, teacher, talent_club, AND parent)
    roles_to_seed_info = {
        "system_admin": {"username_prefix": "sysadmin", "gender": "male"},
        "school_executive": {"username_prefix": "schoolexec", "gender": "female"},
        "government": {"username_prefix": "govofficer", "gender": "male"},
        "hr_ceo": {"username_prefix": "hrceo", "gender": "female"},
        "librarian": {"username_prefix": "librarian", "gender": "male"},
        # "parent": {"username_prefix": "parentuser", "gender": "female"} # EXCLUDED
    }

    all_users_created_info = []
    default_password = "password123"

    if not roles_to_seed_info:
        print("No roles specified for seeding. Exiting.")
        return

    for role_name, details in roles_to_seed_info.items():
        print(f"\nProcessing role: {role_name}")
        role_obj = db.session.scalar(db.select(Role).filter_by(name=role_name))
        if not role_obj:
            print(f"  ERROR: Role '{role_name}' not found in the database. Skipping.")
            continue

        counter = 1
        username = f"{details['username_prefix']}{counter}"
        # Check if user already exists to avoid duplicate usernames if script run multiple times
        while db.session.scalar(db.select(User).filter_by(username=username)):
            counter += 1
            username = f"{details['username_prefix']}{counter}"
        
        email = f"{username}@example.school"
        full_name, first_name, last_name = generate_ethiopian_name(details["gender"])

        print(f"  Attempting to create user: {username} ({full_name}) for role {role_name}")

        try:
            new_user = User(
                username=username,
                email=email,
                password_hash=generate_password_hash(default_password),
                full_name=full_name,
                first_name=first_name,
                last_name=last_name,
                role_id=role_obj.id,
                is_active=True,
                force_password_change=True,
                created_at=datetime.now(timezone.utc)
            )
            db.session.add(new_user)
            db.session.flush() 

            code_value = generate_secret_code()
            while db.session.scalar(db.select(SecretCode).filter_by(code=code_value)):
                code_value = generate_secret_code()

            new_secret_code = SecretCode(
                code=code_value,
                full_name=new_user.full_name,
                role_id=new_user.role_id,
                is_used=False,
                created_at=datetime.now(timezone.utc)
            )
            db.session.add(new_secret_code)
            
            all_users_created_info.append({
                "username": new_user.username,
                "role": role_obj.name,
                "full_name": new_user.full_name,
                "secret_code": code_value
            })
            print(f"    User and SecretCode prepared for {username}.")

        except Exception as e:
            db.session.rollback()
            print(f"  ERROR creating user {username} or related records: {e}. Skipping this user.")
            continue

    if all_users_created_info:
        try:
            db.session.commit()
            print("\nSuccessfully seeded the following users and their secret codes:")
            for info in all_users_created_info:
                print(f"  - User: {info['username']}, Role: {info['role']}, Full Name: {info['full_name']}, Secret Code: {info['secret_code']}")
            print(f"\nDefault password for all created users is: '{default_password}'")
            print("Users should change their password upon first login.")
        except Exception as e:
            db.session.rollback()
            print(f"FATAL ERROR committing users to database: {e}")
    else:
        print("No new users were created (either all existed or errors occurred for all specified roles).")

    print("\nSeed process finished.")

if __name__ == "__main__":
    if 'app' not in locals() or 'db' not in locals():
        print("Flask app or db context not loaded. Ensure imports at the top are correct for your project.")
        sys.exit(1)

    with app.app_context():
        seed_users_and_codes()
