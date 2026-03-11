import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const { data: units, error } = await supabase
    .from('pi_units')
    .select(`*, pi_components(*, component:components(*))`)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(units);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = uuidv4();
  // Create pi unit
  const { error } = await supabase.from('pi_units').insert({
    id,
    serial_number: body.serial_number || `HiFy-${Date.now()}`,
    label: body.label,
    status: body.status || 'in_office',
    notes: body.notes || null,
    qr_code: body.qr_code || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Link components
  if (body.components && body.components.length > 0) {
    const links = body.components
      .filter((c: any) => c.component_id)
      .map((c: any) => ({ pi_unit_id: id, component_id: c.component_id, quantity: 1, notes: c.role || null }));
    if (links.length > 0) await supabase.from('pi_components').insert(links);
  }

  await supabase.from('stock_transactions').insert({
    type: 'out',
    quantity: 1,
    reason: 'Pi build created',
    notes: `Created Pi: ${body.label}`,
    performed_by: body.performed_by || 'System',
    action_type: 'CREATE_PI_BUILD',
    pi_name: body.label,
  });
  return NextResponse.json({ id });
}
