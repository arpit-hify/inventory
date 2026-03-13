import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .order('type')
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, type, city, address } = body;
  if (!name?.trim() || !type) return NextResponse.json({ error: 'name and type required' }, { status: 400 });
  const { data, error } = await supabase
    .from('locations')
    .insert({ name: name.trim(), type, city: city?.trim() || null, address: address?.trim() || null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
