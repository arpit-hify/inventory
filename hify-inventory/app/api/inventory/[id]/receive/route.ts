import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { qty } = await req.json();

  if (!qty || qty <= 0) return NextResponse.json({ error: 'Quantity must be > 0' }, { status: 400 });

  const { data: comp } = await supabase.from('components').select('qty_in_office, asset').eq('id', id).single();
  if (!comp) return NextResponse.json({ error: 'Component not found' }, { status: 404 });

  const newQty = comp.qty_in_office + qty;
  const { error } = await supabase.from('components').update({ qty_in_office: newQty }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('stock_transactions').insert({
    component_id: id,
    type: 'in',
    quantity: qty,
    reason: 'Stock received',
    notes: `Received ${qty}× ${comp.asset}`,
    performed_by: 'System',
    action_type: 'ADD_INVENTORY',
  });

  return NextResponse.json({ success: true, qty_in_office: newQty });
}
