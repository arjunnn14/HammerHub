import { supabaseClient } from './supabase.js';

let currentUserId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await checkUserAuth();
  await loadNotifications();
});

async function checkUserAuth() {
  const { data: userData } = await supabaseClient.auth.getUser();
  currentUserId = userData?.user?.id;

  const guestButtons = document.getElementById('guest-buttons');
  const userButtons = document.getElementById('user-buttons');

  if (currentUserId) {
    guestButtons.classList.add('hidden');
    userButtons.classList.remove('hidden');
  } else {
    guestButtons.classList.remove('hidden');
    userButtons.classList.add('hidden');
  }
}

export async function loadNotifications() {
  const bell = document.getElementById('notification-bell');
  const badge = document.getElementById('notification-badge');
  const list = document.getElementById('notification-list');

  if (!bell || !badge || !list) return;

  const { data: userData } = await supabaseClient.auth.getUser();
  currentUserId = userData?.user?.id;
  if (!currentUserId) return;

  await fetchAndDisplayNotifications();

  supabaseClient
    .channel('notification-updates')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      },
      (payload) => {
        const notification = payload.new;
        displaySingleNotification(notification);
        updateBadgeCount(1);
      }
    )
    .subscribe();

  bell.addEventListener('click', async () => {
    list.classList.toggle('hidden');
    if (!list.classList.contains('hidden')) {
      const { error } = await supabaseClient
        .from('notifications')
        .update({ read: true })
        .eq('read', false)
        .eq('user_id', currentUserId);

      if (!error) badge.classList.add('hidden');
    }
  });

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
    notifications.forEach(displaySingleNotification);
  }
}

function displaySingleNotification(notification) {
  const list = document.getElementById('notification-list');
  if (!list) return;

  const li = document.createElement('li');
  li.textContent = notification.message;
  list.insertBefore(li, list.firstChild);
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

window.logout = async function () {
  await supabaseClient.auth.signOut();
  window.location.href = 'homepage.html';
};
