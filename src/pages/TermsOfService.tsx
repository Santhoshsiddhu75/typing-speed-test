import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Users, Shield, AlertTriangle, Gavel } from 'lucide-react';
import Navbar from '@/components/Navbar';

const TermsOfService: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Navbar showBackButton={true} backUrl="/" />
      
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to TapTest
          </Button>
          
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              Terms of Service
            </h1>
            <p className="text-muted-foreground text-lg">
              Terms and conditions for using TapTest
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3 text-blue-700 dark:text-blue-400">Agreement to Terms</h3>
              <p className="text-muted-foreground">
                By accessing and using TapTest, you accept and agree to be bound by the terms and provision of this agreement. 
                If you do not agree to abide by the above, please do not use this service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Acceptable Use
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 text-green-600">You May:</h3>
                <ul className="space-y-2 text-muted-foreground ml-4">
                  <li>• Use TapTest to practice and improve your typing skills</li>
                  <li>• Create an account to track your progress over time</li>
                  <li>• Export your typing test data for personal use</li>
                  <li>• Provide feedback to help us improve the service</li>
                  <li>• Share your achievements and progress with others</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2 text-red-600">You May Not:</h3>
                <ul className="space-y-2 text-muted-foreground ml-4">
                  <li>• Use automated scripts or bots to artificially inflate scores</li>
                  <li>• Attempt to hack, reverse engineer, or exploit the service</li>
                  <li>• Share your account credentials with other users</li>
                  <li>• Use the service for any illegal or unauthorized purpose</li>
                  <li>• Interfere with or disrupt the service or servers</li>
                  <li>• Copy, modify, or distribute our content without permission</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                User Accounts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Account Creation</h3>
                <p className="text-muted-foreground">
                  You may create an account using a username and password or by signing in with your Google account. 
                  You are responsible for maintaining the confidentiality of your account information.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Account Responsibility</h3>
                <p className="text-muted-foreground">
                  You are responsible for all activities that occur under your account. Please notify us immediately 
                  of any unauthorized use of your account or any other breach of security.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Account Termination</h3>
                <p className="text-muted-foreground">
                  We reserve the right to terminate or suspend accounts that violate these terms or engage in 
                  inappropriate behavior. You may also delete your account at any time through the feedback system.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600" />
                Intellectual Property Rights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Our Content</h3>
                <p className="text-muted-foreground">
                  The TapTest service, including its original content, features, and functionality, is owned by us and is 
                  protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Your Data</h3>
                <p className="text-muted-foreground">
                  You retain ownership of your typing test results and personal data. By using TapTest, you grant us 
                  a limited license to store and process your data to provide the service as described in our Privacy Policy.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Typing Test Content</h3>
                <p className="text-muted-foreground">
                  The text passages used in typing tests are either original content, public domain works, or used under 
                  appropriate licensing. If you believe any content infringes your rights, please contact us.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                Service Availability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Service Uptime</h3>
                <p className="text-muted-foreground">
                  While we strive to maintain high availability, we do not guarantee that TapTest will be available 
                  100% of the time. We may need to take the service offline for maintenance, updates, or other reasons.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Service Changes</h3>
                <p className="text-muted-foreground">
                  We reserve the right to modify, suspend, or discontinue any part of TapTest at any time. 
                  We will provide reasonable notice of significant changes when possible.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Data Backup</h3>
                <p className="text-muted-foreground">
                  While we implement backup procedures, you are encouraged to export your data regularly. 
                  We are not responsible for data loss due to technical failures or service interruptions.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-600" />
                Privacy and Data Protection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Your privacy is important to us. Our collection and use of personal information is governed by our 
                Privacy Policy, which is incorporated into these Terms of Service by reference.
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/privacy')}
                >
                  Read Privacy Policy
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Disclaimers and Limitation of Liability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Service "As Is"</h3>
                <p className="text-muted-foreground">
                  TapTest is provided on an "as is" and "as available" basis. We make no warranties, expressed or implied, 
                  regarding the service, including but not limited to warranties of merchantability, fitness for a 
                  particular purpose, or non-infringement.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Limitation of Liability</h3>
                <p className="text-muted-foreground">
                  In no event shall we be liable for any indirect, incidental, special, consequential, or punitive damages, 
                  including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting 
                  from your use of the service.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Maximum Liability</h3>
                <p className="text-muted-foreground">
                  Our total liability to you for all damages, losses, and causes of action shall not exceed the amount 
                  you have paid us in the last twelve months, or $100, whichever is greater.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Advertising and Third-Party Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Advertisements</h3>
                <p className="text-muted-foreground">
                  TapTest may display advertisements provided by Google AdSense and other advertising partners. 
                  We are not responsible for the content of these advertisements or the practices of advertisers.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Third-Party Links</h3>
                <p className="text-muted-foreground">
                  Our service may contain links to third-party websites or services. We are not responsible for 
                  the content, privacy policies, or practices of these third-party sites.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="w-5 h-5 text-purple-600" />
                Governing Law and Dispute Resolution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Governing Law</h3>
                <p className="text-muted-foreground">
                  These Terms of Service shall be governed by and construed in accordance with the laws of [Your Jurisdiction], 
                  without regard to its conflict of law provisions.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Dispute Resolution</h3>
                <p className="text-muted-foreground">
                  Any disputes arising out of or relating to these terms or the service shall be resolved through 
                  good faith negotiation. If negotiation fails, disputes may be resolved through binding arbitration.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                Contact Information and Updates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Contact Us</h3>
                <p className="text-muted-foreground mb-4">
                  If you have any questions about these Terms of Service, please contact us:
                </p>
                <div className="space-y-2 text-muted-foreground">
                  <p><strong>Email:</strong> gamerabhi950@gmail.com</p>
                  <p><strong>Feedback Form:</strong> Use the feedback button in the navigation</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Updates to Terms</h3>
                <p className="text-muted-foreground">
                  We may revise these Terms of Service from time to time. The most current version will always be 
                  available on this page. We will notify users of material changes when possible.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2 text-green-700 dark:text-green-400">Effective Date</h3>
              <p className="text-muted-foreground">
                These Terms of Service are effective as of {new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} and will remain in effect except with respect to any changes in its provisions in the future, 
                which will be in effect immediately after being posted on this page.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8 pt-8 border-t border-border">
          <Button onClick={() => navigate('/')} className="px-8">
            Return to TapTest
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;