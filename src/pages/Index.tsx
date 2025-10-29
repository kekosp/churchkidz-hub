import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardList, BarChart3, Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-accent/10">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Church Kids Management System
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            A comprehensive solution for managing children's attendance and information in church services
          </p>
          <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8">
            Get Started
          </Button>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 mb-12">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto rounded-full bg-primary/10 p-4 w-fit mb-2">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Children Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Store and manage comprehensive information about each child including contact details and notes
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto rounded-full bg-secondary/10 p-4 w-fit mb-2">
                <ClipboardList className="h-8 w-8 text-secondary" />
              </div>
              <CardTitle>Attendance Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Easily record attendance for each service with notes and track presence history
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto rounded-full bg-primary/10 p-4 w-fit mb-2">
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Reports & Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Generate detailed reports and view statistics on attendance patterns and trends
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto rounded-full bg-secondary/10 p-4 w-fit mb-2">
                <Shield className="h-8 w-8 text-secondary" />
              </div>
              <CardTitle>Role-Based Access</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Secure access control with Admin, Servant, and Parent roles for appropriate permissions
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Features Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">For Administrators</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>✓ Full access to all system features</li>
                  <li>✓ Manage users and assign roles</li>
                  <li>✓ Assign servants to children</li>
                  <li>✓ Complete attendance records access</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">For Servants/Teachers</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>✓ Manage assigned children</li>
                  <li>✓ Record attendance for your group</li>
                  <li>✓ Add notes and comments</li>
                  <li>✓ View attendance reports</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">For Parents</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>✓ View your child's information</li>
                  <li>✓ Check attendance history</li>
                  <li>✓ Read notes from servants</li>
                  <li>✓ Stay informed about participation</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">System Benefits</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>✓ Secure cloud-based storage</li>
                  <li>✓ Easy-to-use interface</li>
                  <li>✓ Real-time data updates</li>
                  <li>✓ Comprehensive reporting</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
