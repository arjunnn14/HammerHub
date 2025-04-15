// supabase.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://jzcmbrqogyghyhvwzgps.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6Y21icnFvZ3lnaHlodnd6Z3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyMjA0MzUsImV4cCI6MjA1OTc5NjQzNX0.2Cc_QdoHU_Q72XFKmhRD0bvOnx4t2UswWy5lK_w8aj4";
export const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Function to update status for all auctions
async function updateAllAuctionStatuses() {
  try {
    // Step 1: Get the current time
    const now = new Date().toISOString();  // ISO format string

    // Step 2: Fetch all auctions where the end_time is before the current time and the status is not 'completed'
    const { data: auctions, error } = await supabase
      .from('auction')
      .select('id, end_time, status')
      .lt('end_time', now) // Auctions that ended before the current time
      .neq('status', 'completed'); // Only those that are not already 'completed'

    if (error) {
      console.error('Error fetching auctions:', error);
      return;
    }

    // Step 3: Process each auction and update it
    for (const auction of auctions) {
      // Get the highest bid for this auction
      const { data: topBid, error: bidError } = await supabase
        .from('bid')
        .select('bidder_id')
        .eq('auction_id', auction.id)
        .order('bid_amount', { ascending: false })  // Highest bid first
        .limit(1)
        .single(); // Get only one (highest) bid

      if (bidError) {
        console.error('Error fetching bid for auction ' + auction.id, bidError);
        continue;
      }

      if (topBid) {
        // Step 4a: Update auction to 'completed' and set the winner
        const { error: updateError } = await supabase
          .from('auction')
          .update({
            status: 'completed',
            winner_id: topBid.bidder_id,  // Set winner_id to the bidder's id
          })
          .eq('id', auction.id);

        if (updateError) {
          console.error('Error updating auction status for auction ' + auction.id, updateError);
        } else {
          console.log(`Auction ${auction.id} updated as completed. Winner: ${topBid.bidder_id}`);
        }
      } else {
        // Step 4b: If no bids, mark auction as 'completed' without a winner
        const { error: updateErrorNoBid } = await supabase
          .from('auction')
          .update({
            status: 'completed',
          })
          .eq('id', auction.id);

        if (updateErrorNoBid) {
          console.error('Error updating auction status (no bids) for auction ' + auction.id, updateErrorNoBid);
        } else {
          console.log(`Auction ${auction.id} updated as completed (no bids).`);
        }
      }
    }

    console.log('All auctions checked and updated.');
  } catch (error) {
    console.error('Error in updating auctions:', error);
  }
}

// Call the function directly (for testing)
updateAllAuctionStatuses();
