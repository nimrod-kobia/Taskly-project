


import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const supabaseUrl = 'https://akbnbexdftqpawzkgmav.supabase.co'
// Replace with your *anon* public key from Supabase dashboard
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYm5iZXhkZnRxcGF3emtnbWF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MzY2NjAsImV4cCI6MjA3NDExMjY2MH0.k2iLeSSTuadAQS-6pc8gdqQ9E8jVYL5iDxRGdZkkieQ"

export const supabase = createClient(supabaseUrl, supabaseKey)

// Sign up new user
export async function signUp(email, password) {
  return await supabase.auth.signUp({ email, password })
}

// Sign in existing user
export async function signIn(email, password) {
  return await supabase.auth.signInWithPassword({ email, password })
}

// Get current user
export function getCurrentUser() {
  return supabase.auth.getUser()
}

// Sign out
export async function signOut() {
  return await supabase.auth.signOut()
}

