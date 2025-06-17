# import11.py (Corrected Version)

import csv
import string
import random
from datetime import datetime, timezone
from sqlalchemy.exc import IntegrityError

# --- Flask App and DB Setup ---
try:
    from app import app, db, User, Role, SecretCode
    from werkzeug.security import generate_password_hash
except ImportError as e:
    print(f"Error importing from app.py: {e}")
    print("Please ensure app.py is accessible and defines 'app', 'db', and models.")
    exit(1)

# Configuration
CSV_FILE_PATH = "static/csv/grade11_students.csv"  # Make sure this path is correct
DEFAULT_PASSWORD = "NexusStudent2024!"  # Change if needed

def generate_unique_code(session, existing_codes_set):
    """Generate a unique 5-character code that doesn't exist yet."""
    chars = string.ascii_uppercase + string.digits
    max_attempts = 1000
    for _ in range(max_attempts):
        code = ''.join(random.choices(chars, k=5))
        # Check against both the pre-fetched set and the database for safety
        if code not in existing_codes_set and not session.query(SecretCode).filter_by(code=code).first():
            existing_codes_set.add(code) # Add to the in-memory set immediately
            return code
    raise Exception(f"Could not generate a unique code after {max_attempts} attempts.")

def import_students_from_csv():
    """Import students from a CSV file into the database, skipping existing records."""
    with app.app_context():
        print(f"Starting student import from {CSV_FILE_PATH}...")

        # Verify student role exists
        student_role = db.session.query(Role).filter_by(name="student").first()
        if not student_role:
            print("Error: 'student' role not found. Please run 'flask create-initial' first.")
            return

        # Pre-fetch all existing secret codes for faster in-memory checks
        print("Fetching existing secret codes...")
        existing_codes = {s.code for s in db.session.query(SecretCode.code).all()}
        print(f"Found {len(existing_codes)} existing secret codes.")

        processed_count = 0
        created_users_count = 0
        created_codes_count = 0
        skipped_rows_count = 0
        
        try:
            with open(CSV_FILE_PATH, mode='r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row_num, row in enumerate(reader, 1):
                    student_name = row.get('STUDENT_NAME', '').strip()
                    unique_code_from_csv = row.get('UNIQUE_CODE', '').strip().upper()
                    grade = row.get('GRADE', '').strip() or None
                    section = row.get('SECTION', '').strip() or None

                    print(f"--- Processing Row {row_num}: {student_name} ---")

                    if not student_name:
                        print(f"  [SKIP] Row {row_num}: STUDENT_NAME is missing.")
                        skipped_rows_count += 1
                        continue

                    # Determine the code to use
                    target_code = unique_code_from_csv if unique_code_from_csv and unique_code_from_csv != "0" else None
                    if not target_code:
                        target_code = generate_unique_code(db.session, existing_codes)
                        print(f"  [INFO] Generated new code for {student_name}: {target_code}")
                    
                    # === THIS IS THE FIX: CHECK AND SKIP LOGIC ===
                    # Check if a SecretCode with this code already exists.
                    existing_secret_code = db.session.query(SecretCode).filter_by(code=target_code).first()
                    if existing_secret_code:
                        print(f"  [SKIP] Row {row_num}: Secret code '{target_code}' already exists in the database for user '{existing_secret_code.full_name}'. Skipping creation.")
                        skipped_rows_count += 1
                        continue # Move to the next row

                    # Also check if a User with this username already exists.
                    existing_user = db.session.query(User).filter_by(username=target_code).first()
                    if existing_user:
                        print(f"  [SKIP] Row {row_num}: User with username '{target_code}' already exists. Skipping creation.")
                        skipped_rows_count += 1
                        continue # Move to the next row

                    # If we reach here, the code is unique and we can proceed.
                    try:
                        name_parts = student_name.split(' ', 1)
                        first_name = name_parts[0]
                        last_name = name_parts[1] if len(name_parts) > 1 else None

                        new_user = User(
                            username=target_code,
                            password_hash=generate_password_hash(DEFAULT_PASSWORD),
                            full_name=student_name,
                            first_name=first_name,
                            last_name=last_name,
                            role_id=student_role.id,
                            is_active=True,
                            force_password_change=True,
                            grade=grade,
                            section=section,
                            created_at=datetime.now(timezone.utc),
                            is_leader=False,
                            is_tc_leader=False,
                            is_tc_member=False
                        )
                        db.session.add(new_user)
                        
                        new_sc = SecretCode(
                            code=target_code,
                            full_name=student_name,
                            role_id=student_role.id,
                            is_used=True, # Mark as used since we are creating the user
                            user=new_user # Link the user object
                        )
                        db.session.add(new_sc)
                        
                        # Commit this single record
                        db.session.commit()
                        
                        print(f"  [SUCCESS] Created new user and secret code for '{student_name}' with code '{target_code}'.")
                        created_users_count += 1
                        created_codes_count += 1
                        existing_codes.add(target_code) # Add to our in-memory set

                    except Exception as e:
                        # This will catch errors for a single row, rollback, and continue
                        db.session.rollback()
                        print(f"  [ERROR] Row {row_num}: Could not process record for '{student_name}'. Error: {e}")
                        skipped_rows_count += 1
                        continue

                    processed_count += 1

        except FileNotFoundError:
            print(f"Error: CSV file not found at {CSV_FILE_PATH}")
        except Exception as e:
            print(f"A critical error occurred: {str(e)}")
            import traceback
            traceback.print_exc()

        # Print final summary
        print("\n--- Import Summary ---")
        print(f"Total rows processed: {processed_count}")
        print(f"New users created: {created_users_count}")
        print(f"New secret codes created: {created_codes_count}")
        print(f"Rows skipped (due to missing name or existing code): {skipped_rows_count}")
        print("Import process finished.")

if __name__ == "__main__":
    if not app.config.get("SQLALCHEMY_DATABASE_URI"):
        print("Error: SQLALCHEMY_DATABASE_URI not configured")
    else:
        import_students_from_csv()
