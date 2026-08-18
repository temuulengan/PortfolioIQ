const AsyncStorage = require('@react-native-async-storage/async-storage');
const service = require('../services/notifications/notificationService');

const {
  setNotificationUser,
  createNotification,
  getAllNotifications,
  getUnreadCount,
  markAllAsRead,
  checkPriceAlerts,
  subscribe,
  NOTIFICATION_TYPES,
} = service;

beforeEach(() => {
  AsyncStorage.__reset();
  setNotificationUser(null);
});

describe('per-user scoping', () => {
  test('one account never sees another account_s notifications', async () => {
    setNotificationUser('user-a');
    await createNotification({ type: NOTIFICATION_TYPES.MILESTONE, title: 'A', message: 'a' });
    expect(await getAllNotifications()).toHaveLength(1);

    setNotificationUser('user-b');
    expect(await getAllNotifications()).toEqual([]);

    setNotificationUser('user-a');
    expect(await getAllNotifications()).toHaveLength(1);
  });

  test('signed out, nothing is readable or writable', async () => {
    setNotificationUser(null);
    expect(await createNotification({ type: NOTIFICATION_TYPES.MILESTONE, title: 'x', message: 'x' })).toBeNull();
    expect(await getAllNotifications()).toEqual([]);
  });
});

describe('subscriptions', () => {
  test('listeners fire when a notification is created elsewhere', async () => {
    setNotificationUser('user-a');
    const listener = jest.fn();
    const unsubscribe = subscribe(listener);

    await createNotification({ type: NOTIFICATION_TYPES.MILESTONE, title: 'A', message: 'a' });
    expect(listener).toHaveBeenCalled();

    listener.mockClear();
    unsubscribe();
    await createNotification({ type: NOTIFICATION_TYPES.MILESTONE, title: 'B', message: 'b' });
    expect(listener).not.toHaveBeenCalled();
  });

  test('unread count tracks reads', async () => {
    setNotificationUser('user-a');
    await createNotification({ type: NOTIFICATION_TYPES.MILESTONE, title: 'A', message: 'a' });
    await createNotification({ type: NOTIFICATION_TYPES.MILESTONE, title: 'B', message: 'b' });
    expect(await getUnreadCount()).toBe(2);

    await markAllAsRead();
    expect(await getUnreadCount()).toBe(0);
  });
});

describe('checkPriceAlerts', () => {
  const holdings = [{ symbol: 'AAPL', name: 'Apple', currentPrice: 110, purchasePrice: 50 }];

  test('alerts on a large move since the previous refresh', async () => {
    setNotificationUser('user-a');
    const alerts = await checkPriceAlerts(holdings, { AAPL: 100 });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].data.change).toBeCloseTo(10);
  });

  test('does not alert on a small move, even when far above cost basis', async () => {
    setNotificationUser('user-a');
    // +120% versus purchase price, but only +1% since the last refresh
    const alerts = await checkPriceAlerts(holdings, { AAPL: 108.91 });
    expect(alerts).toHaveLength(0);
  });

  test('does not re-alert for the same symbol within the dedup window', async () => {
    setNotificationUser('user-a');
    expect(await checkPriceAlerts(holdings, { AAPL: 100 })).toHaveLength(1);
    expect(await checkPriceAlerts(holdings, { AAPL: 100 })).toHaveLength(0);
  });

  test('skips holdings with no previous price to compare against', async () => {
    setNotificationUser('user-a');
    expect(await checkPriceAlerts(holdings, {})).toHaveLength(0);
  });
});
