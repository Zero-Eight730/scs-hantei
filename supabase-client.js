// public/supabase-client.js
const { createClient } = supabase;
// ▼▼▼ あなたのSupabaseプロジェクトのURLとキーに書き換えてください ▼▼▼
const SUPABASE_URL = 'postgresql://postgres.mdatvtapkbnjnuuppgbe:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kYXR2dGFwa2Juam51dXBwZ2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNzc4NTEsImV4cCI6MjA2ODg1Mzg1MX0.ee2pH3A76aPiXlohwljNtXnf5ITgiSoYOMpSvg0kcXw';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
