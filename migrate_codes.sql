-- This script ensures every user in the "user" table has a corresponding,
-- linked record in the "secret_code" table. It creates new records only for
-- users who are missing one.

BEGIN;

-- Step 1: Identify all users who DO NOT currently have a linked secret code.
-- We use a CTE (Common Table Expression) to hold the list of users that need a new code.
WITH users_needing_codes AS (
    SELECT
        u.id,
        u.full_name,
        u.role_id,
        u.grade,
        u.section
    FROM "user" u
    LEFT JOIN secret_code sc ON u.id = sc.user_id
    WHERE sc.user_id IS NULL -- The key condition: find users with no link.
)
-- Step 2: Create a new secret_code record for each of these users.
-- We generate a new, unique 8-character code at the same time.
INSERT INTO secret_code (
    user_id,
    full_name,
    role_id,
    grade,
    section,
    is_used,
    code
)
SELECT
    unc.id,
    unc.full_name,
    unc.role_id,
    unc.grade,
    unc.section,
    true, -- Mark these new codes as 'used' since they are for existing users.
    -- Generate the guaranteed-unique 8-character code: 4 random letters + 4-digit user ID
    (
        SELECT array_to_string(array(
            SELECT substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ', (random() * 26)::int + 1, 1) FROM generate_series(1, 4)
        ), '') || LPAD(unc.id::text, 4, '0')
    )
FROM users_needing_codes unc;

-- Final verification step to show you a sample of the result.
-- This confirms that users are now linked to their new codes.
SELECT
    sc.id AS secret_code_id,
    sc.code,
    sc.user_id,
    u.username,
    u.full_name
FROM secret_code sc
JOIN "user" u ON sc.user_id = u.id
ORDER BY u.id DESC
LIMIT 20;

COMMIT;
