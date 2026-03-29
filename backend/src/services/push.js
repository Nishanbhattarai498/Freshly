const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';

const isExpoPushToken = (value) => typeof value === 'string' && /^ExponentPushToken\[[^\]]+\]$/.test(value);

export const sendPushNotification = async ({ to, title, body, data }) => {
  if (!isExpoPushToken(to)) {
    return { ok: false, skipped: true, reason: 'Invalid Expo push token' };
  }

  try {
    const response = await fetch(EXPO_PUSH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        to,
        sound: 'default',
        title,
        body,
        data,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        skipped: false,
        reason: payload?.errors?.[0]?.message || `Expo push API returned ${response.status}`,
      };
    }

    const ticket = Array.isArray(payload?.data) ? payload.data[0] : payload?.data;
    if (ticket?.status === 'error') {
      return {
        ok: false,
        skipped: false,
        reason: ticket?.message || 'Expo push ticket reported an error',
      };
    }

    return { ok: true, ticket };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      reason: error?.message || 'Failed to reach Expo push service',
    };
  }
};
