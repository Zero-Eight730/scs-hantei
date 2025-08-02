// public/supabase-client.js
const SITE_BASE_URL = 'https://zero-eight730.github.io/scs-hantei';
// ▼▼▼ あなたのSupabaseプロジェクトのURLとキーに書き換えてください ▼▼▼
const SUPABASE_URL = 'https://mdatvtapkbnjnuuppgbe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kYXR2dGFwa2Juam51dXBwZ2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNzc4NTEsImV4cCI6MjA2ODg1Mzg1MX0.ee2pH3A76aPiXlohwljNtXnf5ITgiSoYOMpSvg0kcXw';
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
