# import_script.py
import csv
import os
import random
from datetime import datetime

from sqlalchemy import func # For case-insensitive query

# Assuming app.py is in the same directory or a parent directory and configured for PYTHONPATH
from app import app, db, User, Role, SecretCode, TeacherProfile, VALID_ROLE_NAMES

# --- Configuration ---
CSV_FILE_PATH = 'static/csv/nexusteachers.csv'
DEFAULT_TEACHER_PASSWORD = 'password123'
DEFAULT_OTHER_ROLE_PASSWORD = 'password123'

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
    
    teacher_role_canonical_name = "teacher" 
    if teacher_role_canonical_name not in VALID_ROLE_NAMES:
        print(f"CRITICAL ERROR: Canonical role name '{teacher_role_canonical_name}' not found in app.VALID_ROLE_NAMES.")
        return
    teacher_role_obj = get_or_create_role(teacher_role_canonical_name)
    
    processed_secret_codes_to_user_map = {} 
    existing_usernames_in_db = {u.username for u in User.query.with_entities(User.username).all()}
    
    try:
        with open(CSV_FILE_PATH, mode='r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row_num, row in enumerate(reader, 1):
                try:
                    csv_grade = row.get('Grade', '').strip()
                    csv_section = row.get('Section', '').strip()
                    csv_secret_code_raw = row.get('Secret Code', '').strip()
                    csv_teacher_name = row.get('Teacher Name', '').strip()
                    csv_subject = row.get('Subject', '').strip()
                    csv_salary_str = row.get('Salary (ETB/month)', '').strip()
                    # csv_role_name = row.get('Role', '').strip() # From CSV, confirms it's "Teacher"

                    if not all([csv_grade, csv_section, csv_secret_code_raw, csv_teacher_name, csv_subject]):
                        print(f"Skipping row {row_num}: Missing essential data. Row: {row}")
                        continue

                    # 1. Handle Secret Code (Uppercase, Fetch OR Create)
                    csv_secret_code_upper = csv_secret_code_raw.upper()
                    secret_code_obj = SecretCode.query.filter_by(code=csv_secret_code_upper).first()

                    if not secret_code_obj:
                        # Secret code does not exist, CREATE IT for this teacher
                        secret_code_obj = SecretCode(
                            code=csv_secret_code_upper,
                            full_name=csv_teacher_name,
                            role_id=teacher_role_obj.id,
                            is_used=False # Will be marked True after user creation
                        )
                        db.session.add(secret_code_obj)
                        # No commit yet, will commit with User and TeacherProfile
                        print(f"  Row {row_num}: Secret Code '{csv_secret_code_upper}' for '{csv_teacher_name}' not found. Will be created.")
                    else:
                        # Secret code exists, verify it's appropriate
                        if secret_code_obj.role_id != teacher_role_obj.id:
                            print(f"Skipping row {row_num} for '{csv_teacher_name}': Existing Secret Code '{csv_secret_code_upper}' is NOT for a Teacher (Role ID: {secret_code_obj.role_id}). Please check DB.")
                            continue
                        if secret_code_obj.full_name.strip().lower() != csv_teacher_name.lower():
                            print(f"Skipping row {row_num} for '{csv_teacher_name}': Existing Secret Code '{csv_secret_code_upper}' has a name mismatch. DB: '{secret_code_obj.full_name}', CSV: '{csv_teacher_name}'. Please resolve conflict in DB or CSV.")
                            continue
                        if secret_code_obj.is_used and csv_secret_code_upper not in processed_secret_codes_to_user_map:
                            # This means the code was used by a *different* teacher previously, not the one currently being processed in a multi-assignment CSV.
                            # If it's in processed_secret_codes_to_user_map, it means we are processing another assignment for the *same* teacher from this CSV run.
                            print(f"Warning row {row_num}: Secret Code '{csv_secret_code_upper}' for '{csv_teacher_name}' is marked as used but not yet processed in this run. This might indicate it was used by a different registration. Will attempt to link User if name matches.")
                            # The User creation logic below will try to find an existing user by name if the code is used.

                    # 2. Handle User (Create if not already processed for this secret code in this run)
                    user = None
                    if csv_secret_code_upper in processed_secret_codes_to_user_map:
                        user = processed_secret_codes_to_user_map[csv_secret_code_upper]
                    else:
                        # Try to find an existing user linked to this specific secret_code_id (more robust for reruns)
                        existing_user_linked_to_code = User.query.join(TeacherProfile).filter(
                            TeacherProfile.secret_code_id == secret_code_obj.id, # If secret_code_obj was just created, its id is None yet
                            User.role_id == teacher_role_obj.id
                        ).first()
                        
                        if secret_code_obj.id: # Only try this if secret_code_obj has an ID (i.e., it existed or was flushed)
                             existing_user_linked_to_code = User.query.join(TeacherProfile).filter(
                                TeacherProfile.secret_code_id == secret_code_obj.id,
                                User.role_id == teacher_role_obj.id
                            ).first()

                        if existing_user_linked_to_code:
                            user = existing_user_linked_to_code
                            print(f"  Reusing existing User ID {user.id} ('{user.username}') linked to secret code '{csv_secret_code_upper}'.")
                        else:
                            # If no user is directly linked via TeacherProfile to this secret code,
                            # try to find user by name/role for idempotency.
                            existing_user_by_name = User.query.filter(
                                func.lower(User.full_name) == func.lower(csv_teacher_name),
                                User.role_id == teacher_role_obj.id
                            ).first()

                            if existing_user_by_name and not secret_code_obj.is_used: # If user exists and code is fresh, link them
                                user = existing_user_by_name
                                print(f"  User '{csv_teacher_name}' found by name. Will link to new/unused Secret Code '{csv_secret_code_upper}'.")
                            elif existing_user_by_name and secret_code_obj.is_used: # User exists, code used, this is complex
                                # This implies an existing user might be associated with a code that was marked used,
                                # but we couldn't find a direct TeacherProfile link. Might be okay if it's the same person.
                                user = existing_user_by_name
                                print(f"  User '{csv_teacher_name}' found by name. Secret Code '{csv_secret_code_upper}' is also used. Assuming this is the correct user for this assignment.")
                            
                            if not user: # Still no user found/reused, create a new one
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
                                print(f"Created User: {username} (ID pending commit) for {csv_teacher_name}")
                        
                        processed_secret_codes_to_user_map[csv_secret_code_upper] = user
                        # We need to flush here if secret_code_obj was new and user was new, so TeacherProfile can link
                        if not secret_code_obj.id or not user.id :
                            db.session.flush() # Assign IDs to new secret_code_obj and user before TeacherProfile creation

                    # 3. Handle TeacherProfile (Create for each CSV row as it's an assignment)
                    existing_profile = TeacherProfile.query.filter_by(
                        user_id=user.id, secret_code_id=secret_code_obj.id,
                        grade=csv_grade, section=csv_section, subject=csv_subject
                    ).first()

                    if existing_profile:
                        print(f"  Skipping TeacherProfile: Assignment for {user.username} (G{csv_grade}-S{csv_section}, Sub: {csv_subject}) already exists.")
                        if not secret_code_obj.is_used: # Ensure code is marked used even if profile exists
                            secret_code_obj.is_used = True
                            print(f"  Marked Secret Code '{csv_secret_code_upper}' as used (found existing profile).")
                        db.session.commit() # Commit just the secret code update
                        continue

                    try:
                        salary = float(csv_salary_str) if csv_salary_str else None
                    except ValueError:
                        print(f"  Warning for '{csv_teacher_name}': Invalid salary '{csv_salary_str}'. Setting to None.")
                        salary = None
                    
                    teacher_profile = TeacherProfile(
                        user_id=user.id, secret_code_id=secret_code_obj.id,
                        subject=csv_subject, salary=salary, grade=csv_grade, section=csv_section
                    )
                    db.session.add(teacher_profile)
                    print(f"  Created TeacherProfile for {user.username}: G{csv_grade}-S{csv_section}, Sub: {csv_subject}")

                    # 4. Mark SecretCode as used
                    if not secret_code_obj.is_used:
                        secret_code_obj.is_used = True
                        print(f"  Marked Secret Code '{csv_secret_code_upper}' as used.")
                    
                    db.session.commit() # Commit User (if new), SecretCode (if new/updated), TeacherProfile

                except Exception as e:
                    db.session.rollback()
                    print(f"ERROR processing row {row_num} for '{row.get('Teacher Name', 'Unknown')}': {e}")
                    import traceback
                    traceback.print_exc()
    except FileNotFoundError:
        print(f"ERROR: CSV file not found at {CSV_FILE_PATH}")
    except Exception as e:
        db.session.rollback()
        print(f"An unexpected error occurred during teacher import: {e}")
        import traceback
        traceback.print_exc()
    print("--- Teacher Import Finished ---")

def import_other_roles():
    print("\n--- Starting Other Roles Import ---")
    roles_to_create_users_for = [
        r for r in VALID_ROLE_NAMES if r not in ["student", "teacher"]
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
        print("Ensuring all canonical roles from app.VALID_ROLE_NAMES exist...")
        for r_name in VALID_ROLE_NAMES:
            get_or_create_role(r_name)
        print("Base roles ensured/created with canonical names.")

        import_teachers()
        import_other_roles()
        print("\nData import process complete.")
