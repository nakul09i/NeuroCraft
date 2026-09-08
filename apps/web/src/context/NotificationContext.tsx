import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface SecurityNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  tabTarget?: string;
  type: "info" | "success" | "warning" | "error";
}

interface NotificationContextType {
  notifications: SecurityNotification[];
  unreadCount: number;
  addNotification: (
    title: string,
    message: string,
    tabTarget?: string,
    type?: "info" | "success" | "warning" | "error"
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = "neurocraft_notifications_v1";

const DEFAULT_NOTIFICATIONS: SecurityNotification[] = [
  {
    id: "notif-1",
    title: "Static Quarantine Engine Ready",
    message: "In-memory file quarantine and PE/ELF/Mach-O deterministic parsers initialized.",
    time: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    read: false,
    tabTarget: "scanner",
    type: "success",
  },
  {
    id: "notif-2",
    title: "Quantum Simulation Channel Active",
    message: "Bell-state |Φ⁺⟩ baseline density matrix loaded with 0.15 TVD bound.",
    time: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    read: false,
    tabTarget: "quantum",
    type: "info",
  },
  {
    id: "notif-3",
    title: "OSINT Threat Surface Updated",
    message: "Passive DNS, TLS, and SPF/DMARC public endpoints verified.",
    time: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    read: true,
    tabTarget: "recon",
    type: "info",
  },
];

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<SecurityNotification[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    return DEFAULT_NOTIFICATIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch {
      // storage unavailable
    }
  }, [notifications]);

  const addNotification = useCallback(
    (
      title: string,
      message: string,
      tabTarget?: string,
      type: "info" | "success" | "warning" | "error" = "info"
    ) => {
      const newNotif: SecurityNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title,
        message,
        time: new Date().toISOString(),
        read: false,
        tabTarget,
        type,
      };
      setNotifications((prev) => [newNotif, ...prev.slice(0, 24)]);
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
