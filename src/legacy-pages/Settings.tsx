import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";

const profileSchema = z.object({
  full_name: z.string().min(2, { message: "Nome deve ter no mínimo 2 caracteres" }).max(100),
  username: z.string().min(3, { message: "Username deve ter no mínimo 3 caracteres" }).max(30),
  bio: z.string().max(500, { message: "Bio deve ter no máximo 500 caracteres" }).optional(),
  avatar_url: z.string().url({ message: "URL inválida" }).optional().or(z.literal("")),
});

export default function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setFullName(data.full_name || "");
        setUsername(data.username || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url || "");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);

    try {
      const profileData = {
        full_name: fullName.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim(),
        avatar_url: avatarUrl.trim(),
      };

      const validation = profileSchema.safeParse(profileData);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update(profileData)
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Configurações salvas com sucesso!");
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("Este username já está em uso");
      } else {
        toast.error(error.message || "Erro ao salvar configurações");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="font-space text-4xl font-bold">Configurações</h1>
          <p className="mt-2 font-inter text-muted-foreground">
            Gerencie as informações da sua conta
          </p>
        </div>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-space">Informações da Conta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="font-inter">Nome Completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  className="bg-background/50 border-border focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="font-inter">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="seuusername"
                  required
                  className="bg-background/50 border-border focus:border-primary transition-colors"
                />
                <p className="text-xs text-muted-foreground font-inter">
                  Sua loja: {window.location.origin}/@{username || "seuusername"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="font-inter">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Conte um pouco sobre você..."
                  rows={4}
                  className="bg-background/50 border-border focus:border-primary transition-colors resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatarUrl" className="font-inter">URL do Avatar</Label>
                <Input
                  id="avatarUrl"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://exemplo.com/avatar.jpg"
                  className="bg-background/50 border-border focus:border-primary transition-colors"
                />
                {avatarUrl && (
                  <div className="mt-4 flex items-center gap-4">
                    <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-border">
                      <img
                        src={avatarUrl}
                        alt="Avatar preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "";
                          toast.error("Erro ao carregar imagem");
                        }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground font-inter">
                      Preview do avatar
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="font-inter">Email</Label>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="bg-muted/50 text-muted-foreground cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground font-inter">
                  O email não pode ser alterado
                </p>
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="w-full bg-gradient-purple-blue hover:opacity-90 shadow-elegant font-space text-lg h-14"
              >
                {saving ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
