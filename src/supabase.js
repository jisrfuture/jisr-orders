import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dqgniabrxcqezynsbmls.supabase.co'
const supabaseKey = 'sb_publishable_5isFbiVVd-zgYZLQ2uzaYQ_uqB2Ph7Q'

export const supabase = createClient(supabaseUrl, supabaseKey)
