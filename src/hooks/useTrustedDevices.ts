import { useState, useCallback, useEffect } from "react";

const DEVICES_KEY = "x_money_trusted_devices";
const CURRENT_DEVICE_KEY = "x_money_device_id";

export interface TrustedDevice {
  id: string;
  name: string;
  browser: string;
  os: string;
  addedAt: string;
  lastUsed: string;
}

function generateDeviceId(): string {
  return crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  return "Unknown";
}

function detectOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  return "Unknown";
}

function getCurrentDeviceId(): string {
  let id = localStorage.getItem(CURRENT_DEVICE_KEY);
  if (!id) {
    id = generateDeviceId();
    localStorage.setItem(CURRENT_DEVICE_KEY, id);
  }
  return id;
}

function getStoredDevices(): TrustedDevice[] {
  try {
    return JSON.parse(localStorage.getItem(DEVICES_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveDevices(devices: TrustedDevice[]) {
  localStorage.setItem(DEVICES_KEY, JSON.stringify(devices));
}

export function useTrustedDevices() {
  const [devices, setDevices] = useState<TrustedDevice[]>(getStoredDevices);
  const currentDeviceId = getCurrentDeviceId();

  const isCurrentDeviceTrusted = devices.some(d => d.id === currentDeviceId);

  const trustCurrentDevice = useCallback((name?: string) => {
    const device: TrustedDevice = {
      id: currentDeviceId,
      name: name || `${detectBrowser()} on ${detectOS()}`,
      browser: detectBrowser(),
      os: detectOS(),
      addedAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    };
    const updated = [...devices.filter(d => d.id !== currentDeviceId), device];
    saveDevices(updated);
    setDevices(updated);
  }, [devices, currentDeviceId]);

  const removeDevice = useCallback((deviceId: string) => {
    const updated = devices.filter(d => d.id !== deviceId);
    saveDevices(updated);
    setDevices(updated);
  }, [devices]);

  const updateLastUsed = useCallback(() => {
    const updated = devices.map(d =>
      d.id === currentDeviceId ? { ...d, lastUsed: new Date().toISOString() } : d
    );
    saveDevices(updated);
    setDevices(updated);
  }, [devices, currentDeviceId]);

  // Update last used on mount if trusted
  useEffect(() => {
    if (isCurrentDeviceTrusted) updateLastUsed();
  }, []); // eslint-disable-line

  return {
    devices,
    currentDeviceId,
    isCurrentDeviceTrusted,
    trustCurrentDevice,
    removeDevice,
  };
}
