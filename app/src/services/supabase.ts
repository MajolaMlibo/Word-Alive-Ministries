import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://sb_publishable_ZY3xYN9IoLSdtI50mSLOGg_Z53mLJsg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmeWRtaHBrZ3FpaG5lZm5xcnRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2OTg4NDAsImV4cCI6MjEwNDI3NDg0MH0.emS6aINM30p_0UK4CK9aK9pA7H_OoDEtfw4PiqsYlzU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});