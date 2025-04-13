import { supabaseClient } from './supabase.js';

const urlParams = new URLSearchParams(window.location.search);
const categoryName = urlParams.get('name');

document.getElementById('category-title').textContent = `${categoryName} Products`;

async function fetchCategoryProducts() {
  try {
    // 1. Get category ID from name
    const { data: category, error: categoryError } = await supabaseClient
      .from('category')
      .select('id')
      .eq('name', categoryName)
      .single();

    if (categoryError || !category) {
      throw new Error('❌ Category not found');
    }

    const categoryId = category.id;

    // 2. Get all product IDs with this category_id
    const { data: products, error: productError } = await supabaseClient
      .from('product')
      .select('id, name, image_url')
      .eq('category_id', categoryId);

    if (productError) throw productError;
    if (!products.length) {
      document.getElementById('product-list').innerHTML = '<p>No products in this category.</p>';
      return;
    }

    const productIds = products.map(p => p.id);

    // 3. Get auctions where product_id is in these
    const { data: auctions, error: auctionError } = await supabaseClient
      .from('auction')
      .select(`
        id,
        current_price,
        product:product_id (
          id,
          name,
          image_url
        )
      `)
      .in('product_id', productIds);

    if (auctionError) throw auctionError;

    const listEl = document.getElementById('product-list');
    listEl.innerHTML = '';

    auctions.forEach(({ id, current_price, product }) => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <img src="${product.image_url}" alt="${product.name}" />
        <h3>${product.name}</h3>
        <p>Current Bid: ₹${current_price}</p>
        <button onclick="location.href='auction-details.html?id=${id}'">View Auction</button>
      `;
      listEl.appendChild(card);
    });

  } catch (err) {
    console.error('❌ Error fetching category products:', err.message || err);
    document.getElementById('product-list').innerHTML = '<p>Error loading products.</p>';
  }
}

fetchCategoryProducts();
