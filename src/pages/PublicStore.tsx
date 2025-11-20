import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingBag, Sparkles, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
}

interface Customization {
  gradient_type: string;
  title_font: string;
  body_font: string;
  layout_type: number;
}

export default function PublicStore() {
  const { username } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customization, setCustomization] = useState<Customization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStore();
  }, [username]);

  const loadStore = async () => {
    if (!username) return;

    try {
      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, bio")
        .eq("username", username.toLowerCase())
        .single();

      if (profileError) throw profileError;

      setProfile(profileData);

      // Load products
      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", profileData.id)
        .eq("active", true)
        .order("created_at", { ascending: false });

      setProducts(productsData || []);

      // Load customization
      const { data: customData } = await supabase
        .from("store_customization")
        .select("gradient_type, title_font, body_font, layout_type")
        .eq("user_id", profileData.id)
        .single();

      setCustomization(customData);
    } catch (error) {
      console.error("Error loading store:", error);
      toast.error("Loja não encontrada");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="p-8 text-center max-w-md">
          <h1 className="font-space text-2xl font-bold mb-2">Loja não encontrada</h1>
          <p className="font-inter text-muted-foreground">
            Esta loja não existe ou está indisponível.
          </p>
        </Card>
      </div>
    );
  }

  const gradientClass =
    customization?.gradient_type === "pink-purple"
      ? "bg-gradient-pink-purple"
      : customization?.gradient_type === "blue-cyan"
      ? "bg-gradient-blue-cyan"
      : "bg-gradient-purple-blue";

  return (
    <div className="min-h-screen bg-background">
      {/* Header gradient */}
      <div className={`h-48 ${gradientClass} relative`}>
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Profile section */}
      <div className="max-w-4xl mx-auto px-4 -mt-24 pb-8">
        <div className="flex flex-col items-center text-center mb-8">
          {profile.avatar_url ? (
            <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-background shadow-deep mb-4">
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className={`h-32 w-32 rounded-full ${gradientClass} flex items-center justify-center border-4 border-background shadow-deep mb-4`}>
              <Sparkles className="h-16 w-16 text-white" />
            </div>
          )}

          <h1
            className="text-4xl font-bold mb-2"
            style={{ fontFamily: customization?.title_font || "Space Grotesk" }}
          >
            {profile.full_name}
          </h1>

          <p
            className="text-muted-foreground mb-1"
            style={{ fontFamily: customization?.body_font || "Inter" }}
          >
            @{profile.username}
          </p>

          {profile.bio && (
            <p
              className="text-foreground mt-4 max-w-2xl"
              style={{ fontFamily: customization?.body_font || "Inter" }}
            >
              {profile.bio}
            </p>
          )}
        </div>

        {/* Products section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2
              className="text-2xl font-bold flex items-center gap-2"
              style={{ fontFamily: customization?.title_font || "Space Grotesk" }}
            >
              <ShoppingBag className="h-6 w-6" />
              Produtos
            </h2>
          </div>

          {products.length === 0 ? (
            <Card className="p-12 text-center border-border bg-card/50">
              <p
                className="text-muted-foreground"
                style={{ fontFamily: customization?.body_font || "Inter" }}
              >
                Nenhum produto disponível no momento.
              </p>
            </Card>
          ) : (
            <div
              className={
                customization?.layout_type === 2
                  ? "space-y-4"
                  : "grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              }
            >
              {products.map((product) => (
                <Link key={product.id} to={`/@${username}/${product.id}`}>
                  <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 overflow-hidden group cursor-pointer">
                    {product.images && product.images.length > 0 && (
                      <div
                        className={
                          customization?.layout_type === 2
                            ? "h-32 w-32 float-left mr-4"
                            : "aspect-square"
                        }
                      >
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}

                    <div className="p-4">
                      <h3
                        className="text-lg font-semibold mb-1"
                        style={{ fontFamily: customization?.title_font || "Space Grotesk" }}
                      >
                        {product.name}
                      </h3>
                      <p
                        className="text-2xl font-bold mb-2"
                        style={{ fontFamily: customization?.title_font || "Space Grotesk" }}
                      >
                        <span className={`bg-gradient-to-r ${gradientClass.replace('bg-', '')} bg-clip-text text-transparent`}>
                          R$ {Number(product.price).toFixed(2)}
                        </span>
                      </p>
                      {product.description && customization?.layout_type !== 2 && (
                        <p
                          className="text-sm text-muted-foreground line-clamp-2"
                          style={{ fontFamily: customization?.body_font || "Inter" }}
                        >
                          {product.description}
                        </p>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p
            className="text-sm text-muted-foreground"
            style={{ fontFamily: customization?.body_font || "Inter" }}
          >
            Powered by Naxe Fast Shop
          </p>
        </div>
      </div>
    </div>
  );
}
