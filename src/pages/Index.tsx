import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UtensilsCrossed, QrCode, Search, Settings } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="bg-primary text-primary-foreground px-4 py-12 text-center">
        <UtensilsCrossed className="h-12 w-12 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Restaurant Ordering</h1>
        <p className="text-primary-foreground/80">
          Scan, Order, Enjoy
        </p>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-4 -mt-6">
        {/* Scan QR Card */}
        <Card>
          <CardContent className="p-6 text-center">
            <QrCode className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <h2 className="font-semibold mb-2">Ready to Order?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Scan the QR code on your table to view the menu and place your order.
            </p>
            <p className="text-xs text-muted-foreground">
              Or enter your table number manually
            </p>
          </CardContent>
        </Card>

        {/* Track Order */}
        <Card>
          <CardContent className="p-4">
            <Link to="/track" className="flex items-center gap-4">
              <div className="p-2 bg-muted rounded-lg">
                <Search className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Track Your Order</h3>
                <p className="text-sm text-muted-foreground">
                  Check the status of your order
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Admin Access */}
        <Card>
          <CardContent className="p-4">
            <Link to="/admin/login" className="flex items-center gap-4">
              <div className="p-2 bg-muted rounded-lg">
                <Settings className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Staff Login</h3>
                <p className="text-sm text-muted-foreground">
                  Access the admin dashboard
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </main>

      <footer className="text-center p-4 text-sm text-muted-foreground mt-8">
        Powered by Restaurant Ordering System
      </footer>
    </div>
  );
};

export default Index;
