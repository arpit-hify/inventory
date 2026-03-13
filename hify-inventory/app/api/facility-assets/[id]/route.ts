import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { asset_type, serial_number, status, location_id, arena_label, notes, purchased_at } = body;
  const { data, error } = await supabase
    .from('facility_assets')
    .update({
      asset_type: asset_type?.trim(),
      serial_number: serial_number?.trim() || null,
      status,
      location_id,
      arena_label: arena_label?.trim() || null,
      notes: notes?.trim() || null,
      purchased_at: purchased_at || null,
    })
    .eq('id', id)
    .select('*, location:locations(id,name,type,city)')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabase.from('facility_assets').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
