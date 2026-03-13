import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [locRes, compRes, assetRes] = await Promise.all([
    supabase.from('locations').select('*').eq('id', id).single(),
    supabase.from('components').select('*, category:categories(id,name)').eq('location_id', id).order('asset'),
    supabase.from('facility_assets').select('*').eq('location_id', id).order('asset_type'),
  ]);
  if (locRes.error) return NextResponse.json({ error: locRes.error.message }, { status: 404 });
  return NextResponse.json({
    ...locRes.data,
    components: compRes.data || [],
    facility_assets: assetRes.data || [],
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, type, city, address } = body;
  const { data, error } = await supabase
    .from('locations')
    .update({ name: name?.trim(), type, city: city?.trim() || null, address: address?.trim() || null })
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabase.from('locations').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
