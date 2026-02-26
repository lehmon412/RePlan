'use client';

import { useState, useEffect, useCallback } from 'react';

export type NotificationPermission = 'granted' | 'denied' | 'default';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
}

export function useNotification() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission as NotificationPermission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return 'denied';

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);
      return result;
    } catch (error) {
      console.error('Notification permission error:', error);
      return 'denied';
    }
  }, [isSupported]);

  const sendNotification = useCallback(({ title, body, icon, tag, onClick }: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      console.warn('Notifications not available or not permitted');
      return null;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: icon || '/icon-192.png',
        tag,
        badge: '/icon-192.png',
        requireInteraction: true, // 사용자가 닫을 때까지 유지
      });

      if (onClick) {
        notification.onclick = () => {
          window.focus();
          onClick();
          notification.close();
        };
      }

      return notification;
    } catch (error) {
      console.error('Notification error:', error);
      return null;
    }
  }, [isSupported, permission]);

  return {
    permission,
    isSupported,
    requestPermission,
    sendNotification,
  };
}
