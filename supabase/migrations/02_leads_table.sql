-- Create the leads table to store pre-auth contact information
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert into the leads table
CREATE POLICY "Enable insert for anonymous users" 
ON public.leads 
FOR INSERT 
TO public
WITH CHECK (true);

-- Allow authenticated admins (if needed) or service role to read leads
CREATE POLICY "Enable read for authenticated users" 
ON public.leads 
FOR SELECT 
TO authenticated 
USING (true);
