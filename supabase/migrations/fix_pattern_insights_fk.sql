-- Fix: Add missing FK constraint for pattern_insights → users
-- Apply ONLY if weekly digest API shows FK error

-- Check if FK exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'pattern_insights_user_id_fkey'
    ) THEN
        -- Add FK
        ALTER TABLE public.pattern_insights
        ADD CONSTRAINT pattern_insights_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'FK constraint added successfully';
    ELSE
        RAISE NOTICE 'FK constraint already exists';
    END IF;
END $$;

-- Verify
SELECT 
    conname AS constraint_name,
    contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'public.pattern_insights'::regclass
AND contype = 'f';
