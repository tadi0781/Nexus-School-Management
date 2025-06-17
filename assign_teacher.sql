-- This script safely re-assigns a specific teacher to a class.
-- It is designed to be run with `psql -f assign_teacher.sql`.

BEGIN;

-- Step 1: Un-assign the teacher currently assigned to 'Grade 9 Maths'.
-- A DO block is used to handle the case where no teacher is currently assigned.
DO $$
DECLARE
    current_teacher_id INTEGER;
BEGIN
    -- Find the user_id of the current Grade 9 Maths teacher.
    SELECT user_id INTO current_teacher_id FROM teacher_profile
    WHERE grade = '9' AND subject = 'Maths' LIMIT 1;
    
    -- If a teacher was found, wipe their profiles and unset their grade.
    IF current_teacher_id IS NOT NULL THEN
        DELETE FROM teacher_profile WHERE user_id = current_teacher_id;
        UPDATE "user" SET grade = NULL WHERE id = current_teacher_id;
    END IF;
END $$;

-- Step 2: Assign your target teacher (ID: 2) to the role.
-- First, update their primary grade on the main user table for reference.
UPDATE "user" SET grade = '9' WHERE id = 2;

-- Second, create the 12 new profile records for each section of Grade 9 Maths.
INSERT INTO teacher_profile (user_id, subject, grade, section)
SELECT 2, 'Maths', '9', i
FROM generate_series(1, 12) i;

-- Final verification step to show the result.
SELECT * FROM teacher_profile WHERE user_id = 2;

COMMIT;
