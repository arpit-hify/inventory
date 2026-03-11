import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { error } = await supabase.from('pi_units').update({
    label: body.label,
    serial_number: body.serial_number,
    status: body.status || 'in_office',
    notes: body.notes || null,
    qr_code: body.qr_code || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Replace components
  await supabase.from('pi_components').delete().eq('pi_unit_id', id);
  if (body.components && body.components.length > 0) {
    const links = body.components
      .filter((c: any) => c.component_id)
      .map((c: any) => ({ pi_unit_id: id, component_id: c.component_id, quantity: 1, notes: c.role || null }));
    if (links.length > 0) await supabase.from('pi_components').insert(links);
  }

  await supabase.from('stock_transactions').insert({
    type: 'adjustment',
    quantity: 1,
    reason: 'Pi build updated',
    notes: `Updated Pi: ${body.label}`,
    performed_by: body.performed_by || 'System',
    action_type: 'UPDATE_PI_BUILD',
    pi_name: body.label,
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: pi } = await supabase.from('pi_units').select('label').eq('id', id).single();
  await supabase.from('pi_components').delete().eq('pi_unit_id', id);
  const { error } = await supabase.from('pi_units').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('stock_transactions').insert({
    type: 'out',
    quantity: 1,
    reason: 'Pi build deleted',
    notes: `Deleted Pi: ${pi?.label || id}`,
    performed_by: 'System',
    action_type: 'DELETE_PI_BUILD',
    pi_name: pi?.label || null,
  });
  return NextResponse.json({ success: true });
}
