// supabase.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://jzcmbrqogyghyhvwzgps.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6Y21icnFvZ3lnaHlodnd6Z3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyMjA0MzUsImV4cCI6MjA1OTc5NjQzNX0.2Cc_QdoHU_Q72XFKmhRD0bvOnx4t2UswWy5lK_w8aj4";
export const supabaseClient = createClient(supabaseUrl, supabaseKey);

// ✅ Function to update all auction statuses
export async function updateAllAuctionStatuses() {
  try {
    const now = new Date().toISOString();

    const { data: auctions, error } = await supabaseClient
      .from('auction')
      .select('id, end_time, status')
      .lt('end_time', now)
      .neq('status', 'completed');

    if (error) {
      console.error('❌ Error fetching auctions:', error);
      return;
    }

    for (const auction of auctions) {
      const { data: topBid, error: bidError } = await supabaseClient
        .from('bid')
        .select('bidder_id')
        .eq('auction_id', auction.id)
        .order('bid_amount', { ascending: false })
        .limit(1)
        .single();

      if (bidError && bidError.code !== 'PGRST116') {  // Skip "No rows found"
        console.error(`❌ Error fetching bid for auction ${auction.id}:`, bidError);
        continue;
      }

      if (topBid) {
        // 🥇 There was a winning bid
        const { error: updateError } = await supabaseClient
          .from('auction')
          .update({
            status: 'completed',
            winner_id: topBid.bidder_id,
          })
          .eq('id', auction.id);

        if (updateError) {
          console.error(`❌ Error updating auction ${auction.id} with winner:`, updateError);
        } else {
          console.log(`✅ Auction ${auction.id} completed with winner ${topBid.bidder_id}`);
        }
      } else {
        // 🚫 No bids
        const { error: updateErrorNoBid } = await supabaseClient
          .from('auction')
          .update({ status: 'completed' })
          .eq('id', auction.id);

        if (updateErrorNoBid) {
          console.error(`❌ Error updating auction ${auction.id} (no bids):`, updateErrorNoBid);
        } else {
          console.log(`✅ Auction ${auction.id} completed (no bids)`);
        }
      }
    }

    console.log('🎯 All ended auctions updated.');
  } catch (err) {
    console.error('💥 Fatal error in updateAllAuctionStatuses:', err);
  }
}

// 💡 Call this in another file or attach to a button for manual trigger
// Example:
// import { updateAllAuctionStatuses } from './supabase.js';
// updateAllAuctionStatuses();
