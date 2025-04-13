import { supabaseClient } from './supabase.js';

let currentUserId = null;

export async function loadNotifications() {
  const bell = document.getElementById('notification-bell');
  const badge = document.getElementById('notification-badge');
  const list = document.getElementById('notification-list');

  if (!bell || !badge || !list) return;

  const { data: userData } = await supabaseClient.auth.getUser();
  currentUserId = userData?.user?.id;
  if (!currentUserId) return;

  // Load notifications initially
  await fetchAndDisplayNotifications();

  // Real-time listener for new notifications
  supabaseClient
    .channel('notification-updates')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentUserId}`
      },
      (payload) => {
        const notification = payload.new;
        displaySingleNotification(notification);
        updateBadgeCount(1);
      }
    )
    .subscribe();

  // Toggle dropdown on bell click
  bell.addEventListener('click', async () => {
    list.classList.toggle('hidden');

    if (!list.classList.contains('hidden')) {
      // Mark all as read when opened
      const { error: updateError } = await supabaseClient
        .from('notifications')
        .update({ read: true })
        .eq('user_id', currentUserId)
        .eq('read', false);

      if (!updateError) {
        badge.classList.add('hidden');
      }
    }
  });

  // Hide dropdown if clicked outside
  document.addEventListener('click', (e) => {
    if (!bell.contains(e.target) && !list.contains(e.target)) {
      list.classList.add('hidden');
    }
  });
}

async function fetchAndDisplayNotifications() {
  const list = document.getElementById('notification-list');
  const badge = document.getElementById('notification-badge');

  const { data: notifications, error } = await supabaseClient
    .from('notifications')
    .select('*')
    .eq('user_id', currentUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notifications:', error);
    return;
  }

  const unreadCount = notifications.filter(n => !n.read).length;
  updateBadgeCount(unreadCount);

  list.innerHTML = '';

  if (notifications.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No notifications yet.';
    list.appendChild(li);
  } else {
    notifications.forEach(notification => {
      displaySingleNotification(notification);
    });
  }
}

function displaySingleNotification(notification) {
  const list = document.getElementById('notification-list');
  if (!list) return;

  const li = document.createElement('li');
  li.textContent = notification.message;
  list.insertBefore(li, list.firstChild); // Newest on top
}

function updateBadgeCount(count) {
  const badge = document.getElementById('notification-badge');
  if (!badge) return;

  if (count > 0) {
    badge.textContent = count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}
