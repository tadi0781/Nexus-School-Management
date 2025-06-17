# import_script.py
import csv
import os
import random
from datetime import datetime
from sqlalchemy import func  # For case-insensitive query

# Assuming app.py is in the same directory or a parent directory and configured for PYTHONPATH
from app import app, db, User, Role, SecretCode, TeacherProfile

# --- Configuration ---
CSV_FILE_PATH = 'static/csv/nexusteachers.csv'
DEFAULT_TEACHER_PASSWORD = 'password123'
DEFAULT_OTHER_ROLE_PASSWORD = 'password123'

# --- Expected CSV Header Structure ---
# Teacher Name,Secret Code,Grade,Section,Subject,"Salary (ETB/month)"

# Ethiopian names for random generation
ETHIOPIAN_MALE_FIRST_NAMES = ["Abebe", "Kebede", "Solomon", "Daniel", "Bereket", "Fitsum", "Dawit", "Henok", "Samuel", "Yared", "Mekonnen", "Tesfaye", "Getachew", "Berhanu", "Tadesse"]
ETHIOPIAN_FEMALE_FIRST_NAMES = ["Aster", "Birtukan", "Chaltu", "Eden", "Frehiwot", "Genet", "Helen", "Lemlem", "Mimi", "Sara", "Meseret", "Tigist", "Sofia", "Martha", "Selam"]
ETHIOPIAN_LAST_NAMES = ["Bekele", "Haile", "Gebre", "Lemma", "Wolde", "Tadesse", "Desta", "Abebe", "Mekonnen", "Assefa", "Girma", "Kassa", "Berhanu", "Negussie", "Abate"]

# --- Helper Functions ---
def generate_username(first_name, last_name, existing_usernames_set):
    base_username = f"{first_name.lower().split(' ')[0]}.{last_name.lower().replace(' ', '')}"
    username = base_username
    counter = 1
    while username in existing_usernames_set:
        username = f"{base_username}{counter}"
        counter += 1
    existing_usernames_set.add(username)
    return username

def split_full_name(full_name):
    parts = full_name.strip().split(' ', 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else "User"
    return first_name, last_name

def get_or_create_role(role_name_canonical):
    role = Role.query.filter(func.lower(Role.name) == func.lower(role_name_canonical)).first()
    if not role:
        role = Role(name=role_name_canonical)
        db.session.add(role)
        db.session.commit()
        print(f"Created role: {role_name_canonical}")
    return role

def import_teachers():
    print("\n--- Starting Teacher Import ---")

    teacher_role_obj = get_or_create_role("teacher")

    # Keep track of users created/found in this run to handle multi-assignments for one teacher
    processed_full_names_to_user_map = {}
    existing_usernames_in_db = {u.username for u in User.query.with_entities(User.username).all()}

    try:
        with open(CSV_FILE_PATH, mode='r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row_num, row in enumerate(reader, 1):
                try:
                    # --- 1. Read and validate data from CSV row ---
                    csv_grade = row.get('Grade', '').strip()
                    csv_section = row.get('Section', '').strip()
                    csv_secret_code_raw = row.get('Secret Code', '').strip()
                    csv_teacher_name = row.get('Teacher Name', '').strip()
                    csv_subject = row.get('Subject', '').strip()
                    csv_salary_str = row.get('Salary (ETB/month)', '').strip()

                    if not all([csv_grade, csv_section, csv_secret_code_raw, csv_teacher_name, csv_subject]):
                        print(f"Skipping row {row_num}: Missing essential data. Row: {row}")
                        continue

                    # --- 2. Find or Create the User for this teacher ---
                    user = None

                    # Check if we've already processed this teacher in this same CSV run
                    if csv_teacher_name.lower() in processed_full_names_to_user_map:
                        user = processed_full_names_to_user_map[csv_teacher_name.lower()]
                        print(f"  Row {row_num}: Reusing user '{user.username}' for another assignment for '{csv_teacher_name}'.")
                    else:
                        # Find existing user by full name and role (for idempotency on re-runs)
                        user = User.query.filter(
                            func.lower(User.full_name) == func.lower(csv_teacher_name),
                            User.role_id == teacher_role_obj.id
                        ).first()

                        if user:
                            print(f"  Row {row_num}: Found existing user '{user.username}' for teacher '{csv_teacher_name}'.")
                        else:
                            # User does not exist, so create a new one.
                            first_name, last_name = split_full_name(csv_teacher_name)
                            username = generate_username(first_name, last_name, existing_usernames_in_db)
                            email = f"{username}@kecheneschool.edu.et"

                            user = User(
                                username=username, email=email, full_name=csv_teacher_name,
                                first_name=first_name, last_name=last_name,
                                role_id=teacher_role_obj.id, is_active=True, force_password_change=True
                            )
                            user.set_password(DEFAULT_TEACHER_PASSWORD)
                            db.session.add(user)
                            db.session.flush() # Get the user.id
                            print(f"  Row {row_num}: Created new user '{username}' (ID: {user.id}) for teacher '{csv_teacher_name}'.")

                        # Store user in our map for this run
                        processed_full_names_to_user_map[csv_teacher_name.lower()] = user

                    # --- 3. Find or Create the Secret Code and link it to the User ---
                    csv_secret_code_upper = csv_secret_code_raw.upper()
                    secret_code_obj = SecretCode.query.filter_by(code=csv_secret_code_upper).first()

                    if not secret_code_obj:
                        secret_code_obj = SecretCode(
                            code=csv_secret_code_upper,
                            full_name=csv_teacher_name,
                            role_id=teacher_role_obj.id,
                        )
                        db.session.add(secret_code_obj)
                        db.session.flush() # Get the secret_code.id
                        print(f"  Row {row_num}: Creating new Secret Code '{csv_secret_code_upper}' for user '{user.username}'.")

                    # Link user to the secret code if not already linked
                    if not secret_code_obj.user_id:
                        secret_code_obj.user_id = user.id
                        secret_code_obj.is_used = True # Mark used upon linking
                        print(f"  Row {row_num}: Linking Secret Code '{csv_secret_code_upper}' to user '{user.username}' and marking as used.")
                    elif secret_code_obj.user_id != user.id:
                        print(f"Skipping row {row_num}: Secret Code '{csv_secret_code_upper}' is already linked to a different user (ID: {secret_code_obj.user_id}). Please resolve conflict.")
                        continue # Major conflict, skip this row.

                    # --- 4. Create the TeacherProfile assignment ---
                    # Check if this specific assignment already exists for this user
                    existing_profile = TeacherProfile.query.filter_by(
                        user_id=user.id,
                        grade=csv_grade,
                        section=csv_section,
                        subject=csv_subject
                    ).first()

                    if existing_profile:
                        print(f"  Skipping row {row_num}: TeacherProfile assignment for {user.username} (G{csv_grade}-S{csv_section}, Sub: {csv_subject}) already exists.")
                        continue

                    try:
                        salary = float(csv_salary_str) if csv_salary_str else None
                    except ValueError:
                        print(f"  Warning for '{csv_teacher_name}': Invalid salary '{csv_salary_str}'. Setting to None.")
                        salary = None

                    teacher_profile = TeacherProfile(
                        user_id=user.id, # Link to the user
                        subject=csv_subject,
                        salary=salary,
                        grade=csv_grade,
                        section=csv_section
                    )
                    db.session.add(teacher_profile)
                    print(f"  Created TeacherProfile for '{user.username}': G{csv_grade}-S{csv_section}, Sub: {csv_subject}")

                    # --- 5. Commit all changes for this row ---
                    db.session.commit()

                except Exception as e:
                    db.session.rollback()
                    print(f"ERROR processing row {row_num} for '{row.get('Teacher Name', 'Unknown')}': {e}")

    except FileNotFoundError:
        print(f"ERROR: CSV file not found at {CSV_FILE_PATH}")
    except Exception as e:
        db.session.rollback()
        print(f"An unexpected error occurred during teacher import: {e}")

    print("--- Teacher Import Finished ---")


def import_other_roles():
    print("\n--- Starting Other Roles Import ---")
    valid_role_names = [role[0] for role in app.config.get("VALID_ROLES", [])]
    roles_to_create_users_for = [
        r for r in valid_role_names if r not in ["student", "teacher"]
    ]
    existing_usernames_in_db = {u.username for u in User.query.with_entities(User.username).all()}

    for role_name_canonical in roles_to_create_users_for:
        role_obj = get_or_create_role(role_name_canonical)
        convention_username = f"{role_name_canonical}_user1"
        if User.query.filter(func.lower(User.username) == func.lower(convention_username)).first():
            print(f"User for role '{role_obj.name}' (convention: {convention_username}) likely already exists. Skipping.")
            continue

        if role_name_canonical == "parent":
            first_name = random.choice(ETHIOPIAN_FEMALE_FIRST_NAMES + ETHIOPIAN_MALE_FIRST_NAMES)
        elif random.choice([True, False]):
            first_name = random.choice(ETHIOPIAN_MALE_FIRST_NAMES)
        else:
            first_name = random.choice(ETHIOPIAN_FEMALE_FIRST_NAMES)

        last_name = random.choice(ETHIOPIAN_LAST_NAMES)
        full_name = f"{first_name} {last_name}"
        username = generate_username(first_name, last_name, existing_usernames_in_db)
        email = f"{username}@kecheneschool.edu.et"

        user = User(
            username=username, email=email, full_name=full_name,
            first_name=first_name, last_name=last_name,
            role_id=role_obj.id, is_active=True, force_password_change=True
        )
        user.set_password(DEFAULT_OTHER_ROLE_PASSWORD)

        try:
            db.session.add(user)
            db.session.commit()
            print(f"Created User for Role '{role_obj.name}': {username} (Name: {full_name})")
        except Exception as e:
            db.session.rollback()
            print(f"ERROR creating user for role '{role_obj.name}': {e}")

    print("--- Other Roles Import Finished ---")


if __name__ == '__main__':
    with app.app_context():
        valid_role_names = [role[0] for role in app.config.get("VALID_ROLES", [])]
        print("Ensuring all canonical roles from app.VALID_ROLES exist...")
        for r_name in valid_role_names:
            get_or_create_role(r_name)
        print("Base roles ensured/created with canonical names.")

        import_teachers()
        import_other_roles()
        print("\nData import process complete.")
