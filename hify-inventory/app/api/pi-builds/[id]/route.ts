import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

async function adjustQty(componentId: string, delta: number) {
  const { data } = await supabase.from('components').select('qty_in_office').eq('id', componentId).single();
  if (!data) return;
  const next = Math.max(0, data.qty_in_office + delta);
  await supabase.from('components').update({ qty_in_office: next }).eq('id', componentId);
}

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

  // Snapshot old component IDs before replacing
  const { data: oldLinks } = await supabase.from('pi_components').select('component_id').eq('pi_unit_id', id);
  const oldIds: string[] = (oldLinks || []).map((c: any) => c.component_id);

  const newLinks = (body.components || [])
    .filter((c: any) => c.component_id)
    .map((c: any) => ({ pi_unit_id: id, component_id: c.component_id, quantity: 1, notes: c.role || null }));
  const newIds: string[] = newLinks.map((l: any) => l.component_id);

  // Replace junction rows
  await supabase.from('pi_components').delete().eq('pi_unit_id', id);
  if (newLinks.length > 0) await supabase.from('pi_components').insert(newLinks);

  // Return removed components to inventory (+1 each)
  const removed = oldIds.filter(oid => !newIds.includes(oid));
  for (const cid of removed) await adjustQty(cid, +1);

  // Deduct newly added components from inventory (-1 each)
  const added = newIds.filter(nid => !oldIds.includes(nid));
  for (const cid of added) await adjustQty(cid, -1);

  await supabase.from('stock_transactions').insert({
    type: 'adjustment',
    quantity: newLinks.length,
    reason: 'Pi updated',
    notes: `Updated Pi: ${body.label}`,
    performed_by: 'System',
    action_type: 'UPDATE_PI_BUILD',
    pi_name: body.label,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: pi } = await supabase.from('pi_units').select('label').eq('id', id).single();
  const { data: comps } = await supabase.from('pi_components').select('component_id').eq('pi_unit_id', id);

  await supabase.from('pi_components').delete().eq('pi_unit_id', id);
  const { error } = await supabase.from('pi_units').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return every component back to inventory
  for (const c of (comps || [])) await adjustQty((c as any).component_id, +1);

  await supabase.from('stock_transactions').insert({
    type: 'in',
    quantity: (comps || []).length,
    reason: 'Pi disassembled',
    notes: `Deleted Pi: ${pi?.label || id}`,
    performed_by: 'System',
    action_type: 'DELETE_PI_BUILD',
    pi_name: pi?.label || null,
  });

  return NextResponse.json({ success: true });
}
