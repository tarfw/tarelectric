require('dotenv').config();
console.log(`EXPO_PUBLIC_SUPABASE_URL: ${process.env.EXPO_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}`);
console.log(`EXPO_PUBLIC_SUPABASE_ANON_KEY: ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'}`);
