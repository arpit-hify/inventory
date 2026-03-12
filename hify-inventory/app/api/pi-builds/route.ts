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

  const { error } = await supabase.from('pi_units').insert({
    id,
    serial_number: body.serial_number || `HiFy-${Date.now()}`,
    label: body.label,
    status: body.status || 'in_office',
    location: body.location || null,
    notes: body.notes || null,
    extra_components: body.extra_components || [],
    qr_code: body.qr_code || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const links = (body.components || [])
    .filter((c: any) => c.component_id)
    .map((c: any) => ({ pi_unit_id: id, component_id: c.component_id, quantity: 1, notes: c.role || null }));

  if (links.length > 0) {
    await supabase.from('pi_components').insert(links);
    // Count how many of each component_id are used, then deduct once per component
    const counts: Record<string, number> = {};
    for (const link of links) counts[link.component_id] = (counts[link.component_id] || 0) + 1;
    for (const [cid, count] of Object.entries(counts)) {
      const { data: comp } = await supabase.from('components').select('qty_in_office').eq('id', cid).single();
      if (comp) await supabase.from('components').update({ qty_in_office: comp.qty_in_office - count }).eq('id', cid);
    }
  }

  await supabase.from('stock_transactions').insert({
    type: 'out',
    quantity: links.length || 1,
    reason: 'Pi assembled',
    notes: `Assembled Pi: ${body.label}${body.location ? ` @ ${body.location}` : ''} (${links.length} components)`,
    performed_by: 'System',
    action_type: 'CREATE_PI_BUILD',
    pi_name: body.label,
  });

  return NextResponse.json({ id });
}
