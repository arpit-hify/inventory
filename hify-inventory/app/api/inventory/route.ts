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
  if (!body.asset) return NextResponse.json({ error: 'Asset name required' }, { status: 400 });

  const initialQty = body.qty_in_office ?? 0;

  const { data, error } = await supabase.from('components').insert({
    asset: body.asset,
    brand: body.brand || null,
    vendor: body.vendor || null,
    qty_in_office: initialQty,
    // legacy fields — zero-filled
    total_qty_purchased: initialQty,
    qty_returned_from_facilities: 0,
    old_stock: 0,
    qty_in_new_purchases: initialQty,
    qty_out: 0,
    qty_returned_to_vendor: 0,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (initialQty > 0) {
    await supabase.from('stock_transactions').insert({
      component_id: data.id,
      type: 'in',
      quantity: initialQty,
      reason: 'Initial stock',
      notes: `Added: ${body.asset}`,
      performed_by: 'System',
      action_type: 'ADD_INVENTORY',
    });
  }

  return NextResponse.json(data);
}
