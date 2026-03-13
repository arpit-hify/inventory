import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('facility_assets')
    .select('*, location:locations(id,name,type,city)')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { asset_type, serial_number, status, location_id, arena_label, notes, purchased_at } = body;
  if (!asset_type?.trim() || !location_id) {
    return NextResponse.json({ error: 'asset_type and location_id required' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('facility_assets')
    .insert({
      asset_type: asset_type.trim(),
      serial_number: serial_number?.trim() || null,
      status: status || 'spare',
      location_id,
      arena_label: arena_label?.trim() || null,
      notes: notes?.trim() || null,
      purchased_at: purchased_at || null,
    })
    .select('*, location:locations(id,name,type,city)')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
