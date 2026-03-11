import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types matching the DB schema
export interface Component {
  id: string;
  asset: string;
  brand: string | null;
  vendor: string | null;
  total_qty_purchased: number;
  qty_returned_from_facilities: number;
  old_stock: number;
  qty_in_new_purchases: number;
  qty_out: number;
  qty_returned_to_vendor: number;
  qty_in_office: number;
  created_at: string;
}

export interface PiUnit {
  id: string;
  serial_number: string;
  label: string;
  facility_id: string | null;
  status: string;
  notes: string | null;
  qr_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface PiComponent {
  id: string;
  pi_unit_id: string;
  component_id: string;
  quantity: number;
  notes: string | null;
  // joined
  component?: Component;
}

export interface StockTransaction {
  id: string;
  component_id: string | null;
  type: string;
  quantity: number;
  reason: string | null;
  notes: string | null;
  performed_by: string | null;
  pi_name: string | null;
  action_type: string | null;
  created_at: string;
  // joined
  component?: Component;
}
