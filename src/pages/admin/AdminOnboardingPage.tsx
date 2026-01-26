import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Store, ArrowRight } from "lucide-react";

export default function AdminOnboardingPage() {
  const navigate = useNavigate();
  const { user, tenantId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [venueName, setVenueName] = useState("");
  const [venueSlug, setVenueSlug] = useState("");

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 50);
  };

  const handleNameChange = (name: string) => {
    setVenueName(name);
    setVenueSlug(generateSlug(name));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!venueName.trim()) {
      toast({
        title: "Error",
        description: "Please enter your business name",
        variant: "destructive",
      });
      return;
    }

    if (!tenantId) {
      toast({
        title: "Error",
        description: "No tenant found. Please try signing up again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Update venue name and slug
      const { error: venueError } = await supabase
        .from("venues")
        .update({
          name: venueName.trim(),
          venue_slug: venueSlug || generateSlug(venueName),
        })
        .eq("id", tenantId);

      if (venueError) throw venueError;

      // Mark onboarding as completed
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("user_id", user?.id);

      if (profileError) throw profileError;

      toast({
        title: "Welcome!",
        description: "Your venue has been set up successfully.",
      });

      navigate("/admin/orders");
    } catch (error) {
      console.error("Onboarding error:", error);
      toast({
        title: "Error",
        description: "Failed to complete setup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Spush!</CardTitle>
          <CardDescription>
            Let's set up your venue. You can always change these settings later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="venueName">Business Name</Label>
              <Input
                id="venueName"
                placeholder="e.g., Joe's Coffee Shop"
                value={venueName}
                onChange={(e) => handleNameChange(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="venueSlug">Your Menu URL</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  spush.lovable.app/v/
                </span>
                <Input
                  id="venueSlug"
                  placeholder="joes-coffee"
                  value={venueSlug}
                  onChange={(e) => setVenueSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This is the URL your customers will use to view your menu
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Continue to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
