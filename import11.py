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
CSV_FILE_PATH = "static/csv/grade11_students.csv"
DEFAULT_PASSWORD = "NexusStudent2024!"  # Change if needed
BATCH_SIZE = 100  # Reduced batch size for earlier error detection

def generate_unique_code(existing_codes, session):
    """Generate a unique 5-character code, checking the database."""
    chars = string.ascii_uppercase + string.digits
    max_attempts = 1000
    for _ in range(max_attempts):
        code = ''.join(random.choices(chars, k=5))
        # Check both in-memory set and database to avoid race conditions
        if code not in existing_codes and not session.query(User).filter_by(username=code).first():
            return code
    raise Exception(f"Could not generate a unique code after {max_attempts} attempts.")

def import_students_from_csv():
    """Import students from a CSV file into the database."""
    with app.app_context():
        print(f"Starting student import from {CSV_FILE_PATH}...")

        # Verify student role exists
        student_role = db.session.query(Role).filter_by(name="student").first()
        if not student_role:
            print("Error: 'student' role not found. Please create it first.")
            return

        # Pre-fetch existing usernames and secret codes
        print("Fetching existing usernames and secret codes...")
        existing_usernames = {u.username for u in db.session.query(User.username).all()}
        secret_codes = {s.code: s for s in db.session.query(SecretCode).all()}
        existing_secret_codes = set(secret_codes.keys())
        all_existing_codes = existing_usernames | existing_secret_codes

        processed_count = 0
        created_users_count = 0
        created_codes_count = 0
        updated_codes_count = 0
        skipped_rows_count = 0
        objects_to_commit = []

        try:
            with open(CSV_FILE_PATH, mode='r', encoding='utf-8', newline='', buffering=8192) as csvfile:
                reader = csv.DictReader(csvfile)
                for row_num, row in enumerate(reader, 1):
                    # Extract and clean CSV data
                    student_name = row.get('STUDENT_NAME', '').strip()
                    unique_code = row.get('UNIQUE_CODE', '').strip().upper()
                    grade = row.get('GRADE', '').strip() or None
                    section = row.get('SECTION', '').strip() or None

                    if not student_name:
                        print(f"Row {row_num}: Skipping - STUDENT_NAME is missing.")
                        skipped_rows_count += 1
                        continue

                    # Normalize student name (remove extra spaces)
                    student_name = ' '.join(student_name.split())
                    print(f"Processing row {row_num}: Student Name = {student_name}")

                    # Determine target code
                    target_code = unique_code if unique_code and unique_code != "0" else None
                    if not target_code:
                        target_code = generate_unique_code(all_existing_codes, db.session)
                        all_existing_codes.add(target_code)
                        print(f"Row {row_num}: Generated new code: {target_code}")
                    elif target_code in existing_usernames:
                        print(f"Row {row_num}: Username {target_code} already exists in database, generating new code.")
                        target_code = generate_unique_code(all_existing_codes, db.session)
                        all_existing_codes.add(target_code)
                        print(f"Row {row_num}: Generated new code: {target_code}")

                    # Check if user exists
                    user_exists = db.session.query(User).filter_by(username=target_code).first() is not None
                    secret_code = secret_codes.get(target_code)

                    if user_exists:
                        print(f"Row {row_num}: User {target_code} already exists, checking secret code.")
                        if secret_code:
                            needs_update = False
                            if not secret_code.is_used:
                                secret_code.is_used = True
                                needs_update = True
                            if secret_code.full_name != student_name:
                                secret_code.full_name = student_name
                                needs_update = True
                            if secret_code.role_id != student_role.id:
                                secret_code.role_id = student_role.id
                                needs_update = True
                            if needs_update:
                                objects_to_commit.append(secret_code)
                                updated_codes_count += 1
                                print(f"Row {row_num}: Updated secret code for {student_name}.")
                        else:
                            new_sc = SecretCode(
                                code=target_code,
                                full_name=student_name,
                                role_id=student_role.id,
                                is_used=True
                            )
                            objects_to_commit.append(new_sc)
                            secret_codes[target_code] = new_sc
                            existing_secret_codes.add(target_code)
                            created_codes_count += 1
                            print(f"Row {row_num}: Created new secret code for {student_name}.")
                    else:
                        # Split name into first and last name
                        name_parts = student_name.split(' ', 1)
                        first_name = name_parts[0]
                        last_name = name_parts[1] if len(name_parts) > 1 else None

                        # Create new user
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
                        objects_to_commit.append(new_user)
                        existing_usernames.add(target_code)
                        created_users_count += 1
                        print(f"Row {row_num}: Created new user for {student_name}.")

                        # Handle secret code for new user
                        if secret_code:
                            secret_code.is_used = True
                            secret_code.full_name = student_name
                            secret_code.role_id = student_role.id
                            objects_to_commit.append(secret_code)
                            updated_codes_count += 1
                            print(f"Row {row_num}: Updated existing secret code for {student_name}.")
                        else:
                            new_sc = SecretCode(
                                code=target_code,
                                full_name=student_name,
                                role_id=student_role.id,
                                is_used=True
                            )
                            objects_to_commit.append(new_sc)
                            secret_codes[target_code] = new_sc
                            existing_secret_codes.add(target_code)
                            created_codes_count += 1
                            print(f"Row {row_num}: Created new secret code for {student_name}.")

                    processed_count += 1

                    # Batch commit
                    if processed_count % BATCH_SIZE == 0:
                        try:
                            db.session.bulk_save_objects(objects_to_commit)
                            db.session.commit()
                            print(f"Committed batch of {len(objects_to_commit)} rows at row {row_num}.")
                            objects_to_commit = []
                        except IntegrityError as e:
                            db.session.rollback()
                            print(f"Error committing batch at row {row_num}: {e}")
                            print(f"Problematic row data: {row}")
                            return

                # Final commit
                if objects_to_commit:
                    try:
                        db.session.bulk_save_objects(objects_to_commit)
                        db.session.commit()
                        print(f"Committed final batch of {len(objects_to_commit)} rows.")
                    except IntegrityError as e:
                        db.session.rollback()
                        print(f"Error committing final batch at row {row_num}: {e}")
                        print(f"Problematic row data: {row}")
                        return

                # Print summary
                print("\n--- Import Summary ---")
                print(f"Total rows processed: {processed_count}")
                print(f"New users created: {created_users_count}")
                print(f"New secret codes created: {created_codes_count}")
                print(f"Existing secret codes updated: {updated_codes_count}")
                print(f"Rows skipped (missing name): {skipped_rows_count}")
                print("Import completed successfully.")

        except FileNotFoundError:
            print(f"Error: CSV file not found at {CSV_FILE_PATH}")
        except Exception as e:
            db.session.rollback()
            print(f"Error during import at row {row_num}: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    if not app.config.get("SQLALCHEMY_DATABASE_URI"):
        print("Error: SQLALCHEMY_DATABASE_URI not configured")
    else:
        import_students_from_csv()
