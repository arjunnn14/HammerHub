import { supabaseClient } from './supabase.js';

import { useEffect, useState } from "react";
import supabase from "../lib/supabase";

const AuctionProcessor = () => {
  const [auctions, setAuctions] = useState([]);
  const [status, setStatus] = useState("waiting");

  // Fetch data on initial load
  useEffect(() => {
    const fetchAuctions = async () => {
      // Get auctions where status is 'active' and end_time has passed
      const { data: activeAuctions, error } = await supabase
        .from("auction")
        .select("*")
        .eq("status", "active")
        .lt("end_time", new Date().toISOString()); // Check if end_time is in the past

      if (error) {
        console.error("Error fetching auctions:", error);
        return;
      }

      setAuctions(activeAuctions);
      setStatus("Fetched auctions");
    };

    fetchAuctions();
  }, []);

  // Function to process the auctions
  const processAuctions = async () => {
    setStatus("Processing...");

    for (const auction of auctions) {
      const { data: winningBid, error: bidError } = await supabase
        .from("bid")
        .select("bidder_id")
        .eq("auction_id", auction.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (bidError) {
        console.error(`Error fetching bid for auction ${auction.id}:`, bidError);
        continue;
      }

      // Update the auction with the winning bidder and change status to 'completed'
      const { error: updateError } = await supabase
        .from("auction")
        .update({
          winner_id: winningBid.bidder_id,
          status: "completed",
        })
        .eq("id", auction.id);

      if (updateError) {
        console.error(`Error updating auction ${auction.id}:`, updateError);
      } else {
        console.log(`Auction ${auction.id} updated successfully!`);
      }
    }

    setStatus("Completed processing!");
  };

  return (
    <div>
      <h1>Auction Processor</h1>
      <p>Status: {status}</p>
      <button onClick={processAuctions}>Process Auctions</button>
      <div>
        <h2>Active Auctions</h2>
        <ul>
          {auctions.map((auction) => (
            <li key={auction.id}>
              Auction #{auction.id} - {auction.name} (End Time: {auction.end_time})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AuctionProcessor;

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(`❌ Login failed: ${error.message}`);
  } else {
    window.location.href = 'homepage.html';
  }

   const btn = document.getElementById("triggerBtn");
    const statusText = document.getElementById("statusText");

    btn.addEventListener("click", async () => {
      btn.disabled = true;
      statusText.textContent = "Processing...";

      try {
        const response = await fetch("https://<your-project-ref>.functions.supabase.co/process_ended_auctions", {
          method: "POST",
          headers: {
            "Authorization": "Bearer YOUR_ANON_KEY_HERE", // or service role key if protected
          },
        });

        const text = await response.text();

        if (response.ok) {
          statusText.textContent = "✅ Success: " + text;
        } else {
          statusText.textContent = "❌ Failed: " + text;
        }
      } catch (error) {
        statusText.textContent = "❌ Error calling function.";
        console.error(error);
      }

      btn.disabled = false;
    });
});

// Google login
document.getElementById('google-login').addEventListener('click', async () => {
  const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
  if (error) alert(`❌ Google sign-in failed: ${error.message}`);
});

 const btn = document.getElementById("triggerBtn");
    const statusText = document.getElementById("statusText");

    });
