import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const { error } = await supabase.from('components').update({
    asset: body.asset,
    brand: body.brand || null,
    vendor: body.vendor || null,
    qty_in_office: body.qty_in_office ?? 0,
  }).eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('stock_transactions').insert({
    component_id: id,
    type: 'adjustment',
    quantity: body.qty_in_office ?? 0,
    reason: 'Asset updated',
    notes: `Updated: ${body.asset}`,
    performed_by: 'System',
    action_type: 'UPDATE_INVENTORY',
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: comp } = await supabase.from('components').select('asset').eq('id', id).single();
  const { error } = await supabase.from('components').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('stock_transactions').insert({
    component_id: null,
    type: 'out',
    quantity: 0,
    reason: 'Asset deleted',
    notes: `Deleted: ${comp?.asset || id}`,
    performed_by: 'System',
    action_type: 'DELETE_INVENTORY',
  });
  return NextResponse.json({ success: true });
}
