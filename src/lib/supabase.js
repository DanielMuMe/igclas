import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sojjgzpvujhkxejemhcd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvampnenB2dWpoa3hlamVtaGNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjQyNTgsImV4cCI6MjA3OTUwMDI1OH0.IWw6cuuAC5t3ErY4BdnQuJBaXbEr5E835H-vMLhbv9M'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)