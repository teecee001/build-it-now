import { useState, useRef } from "react";
import { resetOnboarding } from "@/components/OnboardingTutorial";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { useTransactionPin } from "@/hooks/useTransactionPin";
import { useTrustedDevices } from "@/hooks/useTrustedDevices";
import {
  User, Camera, Save, Loader2, LogOut, Shield, Bell,
  Eye, Moon, Crown, Mail, AtSign, CheckCircle2,
  KeyRound, Smartphone, Trash2, Monitor, Plus, FileText, Lock, Scale, Play
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

export default function Settings() {
  const { user, signOut } = useAuth();
  const { profile, isLoading, updateProfile, uploadAvatar } = useProfile();
  const { isSubscribed } = useSubscription();
  const { isPinSet, setupPin, removePin, PIN_THRESHOLD } = useTransactionPin();
  const { devices, currentDeviceId, isCurrentDeviceTrusted, trustCurrentDevice, removeDevice } = useTrustedDevices();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState<string | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [hideBalance, setHideBalance] = useState(false);

  // PIN setup
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  // Trusted device name
  const [deviceName, setDeviceName] = useState("");

  const displayName = fullName ?? profile?.full_name ?? "";
  const displayHandle = handle ?? profile?.handle ?? "";

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Record<string, string> = {};
      if (fullName !== null) updates.full_name = fullName;
      if (handle !== null) updates.handle = handle;
      if (Object.keys(updates).length === 0) { toast.info("No changes to save"); return; }
      await updateProfile.mutateAsync(updates);
      toast.success("Profile updated");
      setFullName(null);
      setHandle(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setIsUploading(true);
    try {
      await uploadAvatar(file);
      toast.success("Avatar updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload avatar");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSetupPin = () => {
    if (newPin.length < 4 || newPin.length > 6) { toast.error("PIN must be 4-6 digits"); return; }
    if (newPin !== confirmPin) { toast.error("PINs don't match"); return; }
    try {
      setupPin(newPin);
      toast.success("Transaction PIN set successfully");
      setShowPinSetup(false);
      setNewPin("");
      setConfirmPin("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleTrustDevice = () => {
    trustCurrentDevice(deviceName || undefined);
    toast.success("Device added to trusted list");
    setDeviceName("");
  };

  const hasChanges = fullName !== null || handle !== null;

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <User className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        </div>
        <p className="text-muted-foreground text-sm">Manage your profile, security, and preferences</p>
      </motion.div>

      {/* Avatar & Profile Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-border">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground">{displayName?.[0]?.toUpperCase() || "?"}</span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 rounded-full bg-background/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-foreground" /> : <Camera className="w-5 h-5 text-foreground" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarChange} className="hidden" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{displayName || "Your Name"}</h2>
                {isSubscribed && <Badge className="bg-warning/10 text-warning border-0 text-xs"><Crown className="w-3 h-3 mr-1" /> Pro</Badge>}
              </div>
              <p className="text-sm text-muted-foreground font-mono">{displayHandle || "@handle"}</p>
              <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Edit Profile */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
        <Card className="p-5 bg-card border-border space-y-4">
          <h3 className="text-sm font-semibold">Profile Details</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> Display Name</label>
              <Input value={displayName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" className="mt-1 bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1"><AtSign className="w-3 h-3" /> Handle</label>
              <Input value={displayHandle} onChange={(e) => setHandle(e.target.value)} placeholder="@yourhandle" className="mt-1 bg-secondary border-border font-mono" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> Email</label>
              <Input value={user?.email || ""} disabled className="mt-1 bg-secondary/50 border-border text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground mt-1">Email cannot be changed</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving || !hasChanges} className="w-full bg-foreground text-background hover:bg-foreground/90 gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" />{hasChanges ? "Save Changes" : "No Changes"}</>}
          </Button>
        </Card>
      </motion.div>

      {/* Transaction PIN */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <Card className="p-5 bg-card border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-warning" /> Transaction PIN
            </h3>
            <Badge variant={isPinSet ? "default" : "secondary"} className="text-xs">
              {isPinSet ? "Active" : "Not Set"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Require a 4-6 digit PIN for transactions over ${PIN_THRESHOLD}. Adds an extra layer of security to high-value transfers.
          </p>

          {isPinSet && !showPinSetup ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowPinSetup(true)} className="flex-1 gap-1">
                <KeyRound className="w-3.5 h-3.5" /> Change PIN
              </Button>
              <Button size="sm" variant="outline" onClick={() => { removePin(); toast.success("PIN removed"); }} className="border-destructive/20 text-destructive hover:bg-destructive/10">
                Remove
              </Button>
            </div>
          ) : (
            <>
              {!showPinSetup ? (
                <Button size="sm" onClick={() => setShowPinSetup(true)} className="w-full bg-foreground text-background hover:bg-foreground/90 gap-1">
                  <Plus className="w-4 h-4" /> Set Up PIN
                </Button>
              ) : (
                <div className="space-y-3">
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter new PIN (4-6 digits)"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                    className="bg-secondary border-border text-center font-mono tracking-[0.3em]"
                  />
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Confirm PIN"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                    className="bg-secondary border-border text-center font-mono tracking-[0.3em]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setShowPinSetup(false); setNewPin(""); setConfirmPin(""); }} className="flex-1">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSetupPin} disabled={newPin.length < 4 || confirmPin.length < 4} className="flex-1 bg-foreground text-background hover:bg-foreground/90">
                      Save PIN
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </motion.div>

      {/* Trusted Devices */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-5 bg-card border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-accent" /> Trusted Devices
            </h3>
            <Badge variant="secondary" className="text-xs">{devices.length} device{devices.length !== 1 ? "s" : ""}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Trusted devices skip Face ID verification when accessing card details.
          </p>

          {/* Current device */}
          {!isCurrentDeviceTrusted && (
            <div className="p-3 rounded-lg bg-warning/5 border border-warning/10 space-y-2">
              <p className="text-xs text-warning font-medium">This device is not trusted</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Device name (optional)"
                  value={deviceName}
                  onChange={e => setDeviceName(e.target.value)}
                  className="bg-secondary border-border text-sm flex-1"
                />
                <Button size="sm" onClick={handleTrustDevice} className="bg-foreground text-background hover:bg-foreground/90 gap-1 shrink-0">
                  <Plus className="w-3.5 h-3.5" /> Trust
                </Button>
              </div>
            </div>
          )}

          {/* Device list */}
          <div className="space-y-2">
            {devices.map(device => (
              <div key={device.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-3">
                  <Monitor className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{device.name}</p>
                      {device.id === currentDeviceId && (
                        <Badge className="bg-accent/10 text-accent border-0 text-[10px]">This device</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {device.browser} · {device.os} · Last used {formatDistanceToNow(new Date(device.lastUsed), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <button onClick={() => { removeDevice(device.id); toast.success("Device removed"); }} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            ))}
            {devices.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">No trusted devices yet</p>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Preferences */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <Card className="p-5 bg-card border-border space-y-4">
          <h3 className="text-sm font-semibold">Preferences</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">Transaction alerts & updates</p>
                </div>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-3">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Hide Balances</p>
                  <p className="text-xs text-muted-foreground">Mask amounts on dashboard</p>
                </div>
              </div>
              <Switch checked={hideBalance} onCheckedChange={setHideBalance} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-3">
                <Moon className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">Always on</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">Default</Badge>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Quick Links */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
        <Card className="p-5 bg-card border-border space-y-2">
          <h3 className="text-sm font-semibold mb-2">Account</h3>
          <button onClick={() => navigate("/verify")} className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-success" />
              <span className="text-sm font-medium">Identity Verification</span>
            </div>
            <Badge className="bg-success/10 text-success border-0 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" /> KYC</Badge>
          </button>
          <button onClick={() => navigate("/premium")} className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
            <div className="flex items-center gap-3">
              <Crown className="w-4 h-4 text-warning" />
              <span className="text-sm font-medium">Subscription</span>
            </div>
            <Badge className={`border-0 text-xs ${isSubscribed ? "bg-warning/10 text-warning" : "bg-secondary text-muted-foreground"}`}>
              {isSubscribed ? "Pro" : "Free"}
            </Badge>
          </button>
        </Card>
      </motion.div>

      {/* Legal & Compliance */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Legal & Compliance</h3>
          <div className="space-y-2">
            <button onClick={() => navigate("/terms")} className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Terms of Service</span>
              </div>
            </button>
            <button onClick={() => navigate("/privacy")} className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Privacy Policy</span>
              </div>
            </button>
            <button onClick={() => navigate("/compliance")} className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
              <div className="flex items-center gap-3">
                <Scale className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Compliance & Disclosures</span>
              </div>
            </button>
          </div>
        </Card>
      </motion.div>

      {/* Sign Out */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
        <Button variant="outline" onClick={signOut} className="w-full border-destructive/20 text-destructive hover:bg-destructive/10 gap-2">
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </motion.div>
    </div>
  );
}
