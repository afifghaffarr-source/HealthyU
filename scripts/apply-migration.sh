#!/bin/bash
# Quick migration applier for user_feedback column
# Run this if automated attempts failed

echo "🔧 Applying user_feedback migration..."
echo ""
echo "Method 1: Supabase Dashboard (RECOMMENDED - 30 seconds)"
echo "-----------------------------------------------------------"
echo "1. Open: https://supabase.com/dashboard/project/ohkfcldkuzfcxnpqvdvc/editor"
echo "2. Click 'New Query'"
echo "3. Paste:"
echo ""
cat << 'SQL'
ALTER TABLE public.pattern_insights 
ADD COLUMN IF NOT EXISTS user_feedback JSONB DEFAULT NULL;

COMMENT ON COLUMN public.pattern_insights.user_feedback IS 
'User feedback: {"helpful": boolean, "submitted_at": string}';
SQL
echo ""
echo "4. Click RUN (or press Ctrl+Enter)"
echo "5. Verify: 'Success. No rows returned'"
echo ""
echo "Method 2: psql (if you have DB password)"
echo "-----------------------------------------------------------"
echo "PGPASSWORD='<your-db-password>' psql \\"
echo "  'postgresql://postgres.ohkfcldkuzfcxnpqvdvc@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres' \\"
echo "  -c \"ALTER TABLE public.pattern_insights ADD COLUMN IF NOT EXISTS user_feedback JSONB;\""
echo ""
echo "After applying, verify:"
echo "  cd ~/projects/HealthyU"
echo "  curl -s 'https://ohkfcldkuzfcxnpqvdvc.supabase.co/rest/v1/pattern_insights?select=user_feedback&limit=1' \\"
echo "    -H 'apikey: \$(cat ~/.config/healthyu/supabase-publishable)' \\"
echo "    -H 'Authorization: Bearer \$(cat ~/.config/healthyu/supabase-service-role-jwt)'"
echo ""
echo "Expected: [{\"user_feedback\":null}] or similar"
