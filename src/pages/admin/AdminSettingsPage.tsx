import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTenant } from '@/contexts/TenantContext';
import { useVenueSetting, useUpdateVenueSetting, useOrderExpiryMinutes } from '@/hooks/useVenueSettings';
import { Loader2, Settings, Globe, Clock, CreditCard, ToggleLeft } from 'lucide-react';

const CURRENCIES = [
  { value: 'NGN', label: 'Nigerian Naira (₦)' },
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'GBP', label: 'British Pound (£)' },
  { value: 'EUR', label: 'Euro (€)' },
];

const TIMEZONES = [
  { value: 'Africa/Lagos', label: 'Lagos (WAT)' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
];

// General Settings Schema
const generalSettingsSchema = z.object({
  currency: z.string().min(1, 'Currency is required'),
  timezone: z.string().min(1, 'Timezone is required'),
});

// Order Settings Schema
const orderSettingsSchema = z.object({
  orderExpiryMinutes: z.coerce.number().min(5, 'Minimum 5 minutes').max(60, 'Maximum 60 minutes'),
});

// Feature Flags Schema
const featureFlagsSchema = z.object({
  enableCashPayments: z.boolean(),
  enableBankTransfer: z.boolean(),
  requireCustomerName: z.boolean(),
  showEstimatedTime: z.boolean(),
});

type GeneralSettingsForm = z.infer<typeof generalSettingsSchema>;
type OrderSettingsForm = z.infer<typeof orderSettingsSchema>;
type FeatureFlagsForm = z.infer<typeof featureFlagsSchema>;

function GeneralSettingsTab({ venueId }: { venueId: string }) {
  const { data: currencySetting, isLoading: currencyLoading } = useVenueSetting(venueId, 'currency');
  const { data: timezoneSetting, isLoading: timezoneLoading } = useVenueSetting(venueId, 'timezone');
  const updateSetting = useUpdateVenueSetting();

  const form = useForm<GeneralSettingsForm>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      currency: 'NGN',
      timezone: 'Africa/Lagos',
    },
    values: {
      currency: currencySetting?.setting_value || 'NGN',
      timezone: timezoneSetting?.setting_value || 'Africa/Lagos',
    },
  });

  const onSubmit = async (data: GeneralSettingsForm) => {
    try {
      await Promise.all([
        updateSetting.mutateAsync({ venueId, settingKey: 'currency', settingValue: data.currency }),
        updateSetting.mutateAsync({ venueId, settingKey: 'timezone', settingValue: data.timezone }),
      ]);
      toast.success('General settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  if (currencyLoading || timezoneLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          General Settings
        </CardTitle>
        <CardDescription>Configure your business locale and currency preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Currency used for menu prices and orders</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Used for order timestamps and reports</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={updateSetting.isPending}>
              {updateSetting.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function OrderSettingsTab({ venueId }: { venueId: string }) {
  const { data: expiryMinutes, isLoading } = useOrderExpiryMinutes(venueId);
  const updateSetting = useUpdateVenueSetting();

  const form = useForm<OrderSettingsForm>({
    resolver: zodResolver(orderSettingsSchema),
    defaultValues: { orderExpiryMinutes: 15 },
    values: { orderExpiryMinutes: expiryMinutes || 15 },
  });

  const onSubmit = async (data: OrderSettingsForm) => {
    try {
      await updateSetting.mutateAsync({
        venueId,
        settingKey: 'order_expiry_minutes',
        settingValue: data.orderExpiryMinutes.toString(),
      });
      toast.success('Order settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Order Settings
        </CardTitle>
        <CardDescription>Configure order behavior and timeouts</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="orderExpiryMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Expiry Time (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" min={5} max={60} {...field} />
                  </FormControl>
                  <FormDescription>
                    Bank transfer orders will expire if payment is not confirmed within this time
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={updateSetting.isPending}>
              {updateSetting.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function FeatureFlagsTab({ venueId }: { venueId: string }) {
  const { data: cashSetting, isLoading: cashLoading } = useVenueSetting(venueId, 'enable_cash_payments');
  const { data: bankSetting, isLoading: bankLoading } = useVenueSetting(venueId, 'enable_bank_transfer');
  const { data: nameSetting, isLoading: nameLoading } = useVenueSetting(venueId, 'require_customer_name');
  const { data: timeSetting, isLoading: timeLoading } = useVenueSetting(venueId, 'show_estimated_time');
  const updateSetting = useUpdateVenueSetting();

  const form = useForm<FeatureFlagsForm>({
    resolver: zodResolver(featureFlagsSchema),
    defaultValues: {
      enableCashPayments: true,
      enableBankTransfer: true,
      requireCustomerName: false,
      showEstimatedTime: false,
    },
    values: {
      enableCashPayments: cashSetting?.setting_value !== 'false',
      enableBankTransfer: bankSetting?.setting_value !== 'false',
      requireCustomerName: nameSetting?.setting_value === 'true',
      showEstimatedTime: timeSetting?.setting_value === 'true',
    },
  });

  const onSubmit = async (data: FeatureFlagsForm) => {
    try {
      await Promise.all([
        updateSetting.mutateAsync({ venueId, settingKey: 'enable_cash_payments', settingValue: data.enableCashPayments.toString() }),
        updateSetting.mutateAsync({ venueId, settingKey: 'enable_bank_transfer', settingValue: data.enableBankTransfer.toString() }),
        updateSetting.mutateAsync({ venueId, settingKey: 'require_customer_name', settingValue: data.requireCustomerName.toString() }),
        updateSetting.mutateAsync({ venueId, settingKey: 'show_estimated_time', settingValue: data.showEstimatedTime.toString() }),
      ]);
      toast.success('Feature settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const isLoading = cashLoading || bankLoading || nameLoading || timeLoading;

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ToggleLeft className="h-5 w-5" />
          Feature Flags
        </CardTitle>
        <CardDescription>Enable or disable specific features for your venue</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="enableCashPayments"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Cash Payments</FormLabel>
                    <FormDescription>Allow customers to pay with cash on delivery</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="enableBankTransfer"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Bank Transfer</FormLabel>
                    <FormDescription>Allow customers to pay via bank transfer</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requireCustomerName"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Require Customer Name</FormLabel>
                    <FormDescription>Make customer name mandatory at checkout</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="showEstimatedTime"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Show Estimated Time</FormLabel>
                    <FormDescription>Display estimated preparation time to customers</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={updateSetting.isPending}>
              {updateSetting.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function AdminSettingsPage() {
  const { tenantId } = useTenant();

  if (!tenantId) {
    return (
      <AdminLayout title="Settings" requiredPermission="canManageBankDetails">
        <div className="flex justify-center p-8">
          <p className="text-muted-foreground">No venue selected</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Settings" requiredPermission="canManageBankDetails">
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">
            <Globe className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="orders">
            <Clock className="h-4 w-4 mr-2" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="features">
            <ToggleLeft className="h-4 w-4 mr-2" />
            Features
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralSettingsTab venueId={tenantId} />
        </TabsContent>

        <TabsContent value="orders">
          <OrderSettingsTab venueId={tenantId} />
        </TabsContent>

        <TabsContent value="features">
          <FeatureFlagsTab venueId={tenantId} />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
