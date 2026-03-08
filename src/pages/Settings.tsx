import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";
import {
  User, Camera, Save, Loader2, LogOut, Shield, Bell,
  Eye, Moon, Crown, Mail, AtSign, CheckCircle2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const { user, signOut } = useAuth();
  const { profile, isLoading, updateProfile, uploadAvatar } = useProfile();
  const { isSubscribed } = useSubscription();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState<string | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Preferences (local state — could be persisted later)
  const [notifications, setNotifications] = useState(true);
  const [hideBalance, setHideBalance] = useState(false);

  const displayName = fullName ?? profile?.full_name ?? "";
  const displayHandle = handle ?? profile?.handle ?? "";

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Record<string, string> = {};
      if (fullName !== null) updates.full_name = fullName;
      if (handle !== null) updates.handle = handle;
      if (Object.keys(updates).length === 0) {
        toast.info("No changes to save");
        return;
      }
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
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
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

  const hasChanges = fullName !== null || handle !== null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <User className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        </div>
        <p className="text-muted-foreground text-sm">Manage your profile and preferences</p>
      </motion.div>

      {/* Avatar & Profile Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-border">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground">
                    {displayName?.[0]?.toUpperCase() || "?"}
                  </span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 rounded-full bg-background/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-foreground" />
                ) : (
                  <Camera className="w-5 h-5 text-foreground" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{displayName || "Your Name"}</h2>
                {isSubscribed && (
                  <Badge className="bg-warning/10 text-warning border-0 text-xs">
                    <Crown className="w-3 h-3 mr-1" /> Pro
                  </Badge>
                )}
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
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" /> Display Name
              </label>
              <Input
                value={displayName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="mt-1 bg-secondary border-border"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <AtSign className="w-3 h-3" /> Handle
              </label>
              <Input
                value={displayHandle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@yourhandle"
                className="mt-1 bg-secondary border-border font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </label>
              <Input
                value={user?.email || ""}
                disabled
                className="mt-1 bg-secondary/50 border-border text-muted-foreground"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Email cannot be changed</p>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="w-full bg-foreground text-background hover:bg-foreground/90 gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                {hasChanges ? "Save Changes" : "No Changes"}
              </>
            )}
          </Button>
        </Card>
      </motion.div>

      {/* Preferences */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
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
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <Card className="p-5 bg-card border-border space-y-2">
          <h3 className="text-sm font-semibold mb-2">Account</h3>
          <button
            onClick={() => navigate("/verify")}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-success" />
              <span className="text-sm font-medium">Identity Verification</span>
            </div>
            <Badge className="bg-success/10 text-success border-0 text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" /> KYC
            </Badge>
          </button>
          <button
            onClick={() => navigate("/premium")}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
          >
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

      {/* Sign Out */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Button
          variant="outline"
          onClick={signOut}
          className="w-full border-destructive/20 text-destructive hover:bg-destructive/10 gap-2"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </motion.div>
    </div>
  );
}
