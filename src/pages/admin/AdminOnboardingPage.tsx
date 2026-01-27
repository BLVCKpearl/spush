import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Store, ArrowRight, Check, Table2, UtensilsCrossed, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ONBOARDING_STEPS = [
  { id: 1, label: "Tables", icon: Table2, path: "/admin/tables" },
  { id: 2, label: "Menu", icon: UtensilsCrossed, path: "/admin/menu" },
  { id: 3, label: "Bank Details", icon: Building2, path: "/admin/bank-details" },
];

export default function AdminOnboardingPage() {
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuth();
  const { tenantId, isImpersonating } = useTenant();
  const { data: onboardingStatus, refetch } = useOnboardingStatus();
  
  const [isLoading, setIsLoading] = useState(false);
  const [venueName, setVenueName] = useState("");
  const [venueSlug, setVenueSlug] = useState("");
  const [showNameForm, setShowNameForm] = useState(true);

  // Fetch current venue details
  useEffect(() => {
    async function fetchVenue() {
      if (!tenantId) return;
      const { data } = await supabase
        .from("venues")
        .select("name, venue_slug")
        .eq("id", tenantId)
        .maybeSingle();
      
      if (data) {
        // If venue name is already set to something other than default
        if (!data.name.endsWith("'s Venue")) {
          setVenueName(data.name);
          setVenueSlug(data.venue_slug);
          setShowNameForm(false);
        }
      }
    }
    fetchVenue();
  }, [tenantId]);

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

  const handleSaveName = async (e: React.FormEvent) => {
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
      const { error: venueError } = await supabase
        .from("venues")
        .update({
          name: venueName.trim(),
          venue_slug: venueSlug || generateSlug(venueName),
        })
        .eq("id", tenantId);

      if (venueError) throw venueError;

      toast({
        title: "Success",
        description: "Business name saved successfully.",
      });
      setShowNameForm(false);
    } catch (error) {
      console.error("Error saving venue name:", error);
      toast({
        title: "Error",
        description: "Failed to save. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          onboarding_step: 4,
        })
        .eq("user_id", user?.id);

      if (error) throw error;

      toast({
        title: "Welcome!",
        description: "Your venue setup is complete.",
      });

      navigate("/admin/orders");
    } catch (error) {
      console.error("Onboarding completion error:", error);
      toast({
        title: "Error",
        description: "Failed to complete setup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepClick = (path: string) => {
    navigate(path);
  };

  const currentStep = onboardingStatus?.step ?? 1;
  const isComplete = onboardingStatus?.completed ?? false;

  // If onboarding is complete, redirect to orders
  useEffect(() => {
    if (isComplete && !isImpersonating) {
      navigate("/admin/orders", { replace: true });
    }
  }, [isComplete, isImpersonating, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {showNameForm ? "Welcome to Spush!" : "Complete Your Setup"}
          </CardTitle>
          <CardDescription>
            {showNameForm 
              ? "Let's set up your venue. You can always change these settings later."
              : "Complete these steps to get your venue ready for customers."}
          </CardDescription>
          {isSuperAdmin && isImpersonating && (
            <p className="text-sm text-destructive mt-2">
              Impersonating tenant — completing onboarding on their behalf
            </p>
          )}
        </CardHeader>
        <CardContent>
          {showNameForm ? (
            <form onSubmit={handleSaveName} className="space-y-6">
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
                    Saving...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Stepper */}
              <div className="space-y-3">
                {ONBOARDING_STEPS.map((step) => {
                  const isCompleted = step.id < currentStep || isComplete;
                  const isCurrent = step.id === currentStep && !isComplete;
                  const StepIcon = step.icon;

                  return (
                    <button
                      key={step.id}
                      onClick={() => handleStepClick(step.path)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-lg border transition-colors text-left",
                        isCompleted && "bg-primary/5 border-primary/20",
                        isCurrent && "border-primary bg-primary/10",
                        !isCompleted && !isCurrent && "border-border hover:bg-muted/50"
                      )}
                    >
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center",
                          isCompleted && "bg-primary text-primary-foreground",
                          isCurrent && "bg-primary/20 text-primary",
                          !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                        )}
                      >
                        {isCompleted ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <StepIcon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={cn(
                          "font-medium",
                          isCompleted && "text-primary",
                          isCurrent && "text-foreground",
                          !isCompleted && !isCurrent && "text-muted-foreground"
                        )}>
                          {step.label}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isCompleted ? "Completed" : isCurrent ? "Set up now" : "Pending"}
                        </p>
                      </div>
                      <ArrowRight className={cn(
                        "h-5 w-5",
                        isCompleted && "text-primary",
                        isCurrent && "text-foreground",
                        !isCompleted && !isCurrent && "text-muted-foreground"
                      )} />
                    </button>
                  );
                })}
              </div>

              {/* Complete button - only show when all steps are done */}
              {onboardingStatus?.hasTables && onboardingStatus?.hasMenuItems && onboardingStatus?.hasBankDetails && (
                <Button onClick={handleCompleteOnboarding} className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}

              {/* Refresh status button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => refetch()}
              >
                Refresh Status
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
