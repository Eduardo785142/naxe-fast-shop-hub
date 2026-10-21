import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Palette } from "lucide-react";

const gradients = [
  { id: "purple-blue", name: "Roxo → Azul", class: "bg-gradient-purple-blue" },
  { id: "pink-purple", name: "Rosa → Roxo", class: "bg-gradient-pink-purple" },
  { id: "blue-cyan", name: "Azul → Ciano", class: "bg-gradient-blue-cyan" },
];

const fonts = [
  { id: "Space Grotesk", name: "Space Grotesk" },
  { id: "Inter", name: "Inter" },
  { id: "Poppins", name: "Poppins" },
];

const layouts = [
  { id: 1, name: "Cards Grandes" },
  { id: 2, name: "Lista Compacta" },
  { id: 3, name: "Destaque Principal" },
];

export default function Customize() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customization, setCustomization] = useState({
    gradient_type: "purple-blue",
    title_font: "Space Grotesk",
    body_font: "Inter",
    layout_type: 1,
    banner_url: "",
  });
  const [profile, setProfile] = useState({ username: "" });

  useEffect(() => {
    loadCustomization();
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const loadCustomization = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("store_customization")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setCustomization({
          gradient_type: data.gradient_type,
          title_font: data.title_font,
          body_font: data.body_font,
          layout_type: data.layout_type,
          banner_url: data.banner_url || "",
        });
      }
    } catch (error) {
      console.error("Error loading customization:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("store_customization")
        .upsert({
          user_id: user.id,
          ...customization,
        });

      if (error) throw error;

      toast.success("Personalização salva com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar personalização");
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
      <div className="space-y-8 max-w-4xl">
        <div>
          <h1 className="font-space text-4xl font-bold">Personalização</h1>
          <p className="mt-2 font-inter text-muted-foreground">
            Personalize o visual da sua loja
          </p>
        </div>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-space flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Link da Loja
            </CardTitle>
            <CardDescription className="font-inter">
              Compartilhe este link na sua bio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-4 rounded-xl bg-background/50 border border-border">
              <code className="font-mono text-sm flex-1">
                {window.location.origin}/@{profile.username}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/@${profile.username}`);
                  toast.success("Link copiado!");
                }}
                className="font-inter"
              >
                Copiar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-space">Gradiente</CardTitle>
            <CardDescription className="font-inter">
              Escolha o gradiente da sua loja
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {gradients.map((gradient) => (
                <button
                  key={gradient.id}
                  onClick={() =>
                    setCustomization({ ...customization, gradient_type: gradient.id })
                  }
                  className={`p-6 rounded-xl transition-all duration-300 ${gradient.class} ${
                    customization.gradient_type === gradient.id
                      ? "ring-4 ring-primary scale-105 shadow-elegant"
                      : "opacity-70 hover:opacity-100"
                  }`}
                >
                  <span className="font-space text-white font-semibold">
                    {gradient.name}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-space">Fontes</CardTitle>
            <CardDescription className="font-inter">
              Personalize as fontes da sua loja
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="font-inter">Fonte dos Títulos</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {fonts.map((font) => (
                  <button
                    key={`title-${font.id}`}
                    onClick={() =>
                      setCustomization({ ...customization, title_font: font.id })
                    }
                    className={`p-4 rounded-xl border transition-all duration-300 ${
                      customization.title_font === font.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                    style={{ fontFamily: font.id }}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-inter">Fonte do Corpo</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {fonts.map((font) => (
                  <button
                    key={`body-${font.id}`}
                    onClick={() =>
                      setCustomization({ ...customization, body_font: font.id })
                    }
                    className={`p-4 rounded-xl border transition-all duration-300 ${
                      customization.body_font === font.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                    style={{ fontFamily: font.id }}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-space">Layout</CardTitle>
            <CardDescription className="font-inter">
              Escolha como seus produtos serão exibidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {layouts.map((layout) => (
                <button
                  key={layout.id}
                  onClick={() =>
                    setCustomization({ ...customization, layout_type: layout.id })
                  }
                  className={`p-6 rounded-xl border transition-all duration-300 ${
                    customization.layout_type === layout.id
                      ? "border-primary bg-primary/10 shadow-elegant"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="font-inter font-medium">{layout.name}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-purple-blue hover:opacity-90 shadow-elegant font-space text-lg h-14"
        >
          {saving ? "Salvando..." : "Salvar Personalização"}
        </Button>
      </div>
    </DashboardLayout>
  );
}
