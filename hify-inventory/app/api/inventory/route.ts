import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('components')
    .select('*')
    .order('asset');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data, error } = await supabase.from('components').insert({
    asset: body.asset,
    brand: body.brand || null,
    vendor: body.vendor || null,
    total_qty_purchased: body.total_qty_purchased || 0,
    qty_returned_from_facilities: body.qty_returned_from_facilities || 0,
    old_stock: body.old_stock || 0,
    qty_in_new_purchases: body.qty_in_new_purchases || 0,
    qty_out: body.qty_out || 0,
    qty_returned_to_vendor: body.qty_returned_to_vendor || 0,
    qty_in_office: body.qty_in_office || 0,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Log it
  await supabase.from('stock_transactions').insert({
    component_id: data.id,
    type: 'in',
    quantity: body.qty_in_office || 0,
    reason: 'New inventory added',
    notes: `Added: ${body.asset}`,
    performed_by: body.performed_by || 'System',
    action_type: 'ADD_INVENTORY',
  });
  return NextResponse.json(data);
}
