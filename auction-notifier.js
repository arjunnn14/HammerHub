import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://jzcmbrqogyghyhvwzgps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6Y21icnFvZ3lnaHlodnd6Z3BzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDIyMDQzNSwiZXhwIjoyMDU5Nzk2NDM1fQ.6KcPLwawrfO8E7GA-5E1Vori08fMhePo-VXRxWZHNOQ'); // Use service role key

async function notifyEndingSoon() {
  const now = new Date();
  const fiveMinsFromNow = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  const { data: auctions } = await supabase
    .from('auction')
    .select('id, end_time, product(name)')
    .lt('end_time', fiveMinsFromNow)
    .gt('end_time', now.toISOString());

  for (const auction of auctions) {
    const { data: watchers } = await supabase
      .from('watchlist')
      .select('user_id')
      .eq('auction_id', auction.id);

    const { data: bidders } = await supabase
      .from('bid')
      .select('bidder_id')
      .eq('auction_id', auction.id);

    const uniqueUserIds = [...new Set([
      ...watchers.map(w => w.user_id),
      ...bidders.map(b => b.bidder_id),
    ])];

    for (const userId of uniqueUserIds) {
      await supabase.from('notifications').insert([{
        user_id: userId,
        auction_id: auction.id,
        message: `⏰ Auction for "${auction.product.name}" is ending soon!`,
        read: false,
      }]);
    }
  }
}

async function notifyWinners() {
  const now = new Date().toISOString();

  const { data: endedAuctions } = await supabase
    .from('auction')
    .select('id, product(name), seller_id')
    .lt('end_time', now);

  for (const auction of endedAuctions) {
    const { data: alreadyNotified } = await supabase
      .from('notifications')
      .select('*')
      .eq('auction_id', auction.id)
      .like('message', '%won%');

    if (alreadyNotified.length > 0) continue;

    const { data: topBid } = await supabase
      .from('bid')
      .select('bidder_id, bid_amount')
      .eq('auction_id', auction.id)
      .order('bid_amount', { ascending: false })
      .limit(1)
      .single();

    if (!topBid) continue;

    // Notify winner + seller
    await supabase.from('notifications').insert([
      {
        user_id: topBid.bidder_id,
        auction_id: auction.id,
        message: `🎉 You won the auction for "${auction.product.name}"!`,
        read: false,
      },
      {
        user_id: auction.seller_id,
        auction_id: auction.id,
        message: `📦 Your auction for "${auction.product.name}" ended. Winner has been notified.`,
        read: false,
      },
    ]);
  }
}

async function run() {
  await notifyEndingSoon();
  await notifyWinners();
}

run().then(() => console.log('✅ Notifications sent')).catch(console.error);



