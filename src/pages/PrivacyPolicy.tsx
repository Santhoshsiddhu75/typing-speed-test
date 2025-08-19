import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Eye, Cookie, Mail } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      <Navbar showBackButton={true} backUrl="/" />
      
      {/* Main Content */}
      <div className="flex-1">
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
              <Shield className="w-8 h-8 text-green-600" />
              Privacy Policy
            </h1>
            <p className="text-muted-foreground text-lg">
              How TapTest collects, uses, and protects your information
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Account Information</h3>
                <p className="text-muted-foreground">
                  When you create an account, we collect your username, encrypted password, and optionally your Google account information if you sign in with Google.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Typing Test Data</h3>
                <p className="text-muted-foreground">
                  We store your typing test results including words per minute (WPM), accuracy percentages, test duration, difficulty levels, and timestamps to track your progress over time.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Usage Information</h3>
                <p className="text-muted-foreground">
                  We collect information about how you interact with TapTest, including pages visited, features used, and general usage patterns to improve our service.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Feedback Data</h3>
                <p className="text-muted-foreground">
                  When you submit feedback through our feedback form, we collect your message, the page you were on, timestamp, and basic browser information to help us improve TapTest.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cookie className="w-5 h-5 text-orange-600" />
                Cookies and Local Storage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Essential Cookies</h3>
                <p className="text-muted-foreground">
                  We use cookies and local storage to keep you logged in, remember your theme preferences (dark/light mode), and maintain your session across visits.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Authentication Tokens</h3>
                <p className="text-muted-foreground">
                  Your login session is maintained using secure JWT tokens stored in your browser's local storage. These tokens automatically expire for your security.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Google AdSense</h3>
                <p className="text-muted-foreground">
                  We use Google AdSense to display advertisements. Google may use cookies to show you personalized ads based on your interests. You can learn more about Google's privacy practices at 
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                    https://policies.google.com/privacy
                  </a>.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                How We Use Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span><strong>Account Management:</strong> To create and manage your TapTest account and provide personalized typing practice.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span><strong>Progress Tracking:</strong> To save your typing test results and show your improvement over time with detailed analytics.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span><strong>Service Improvement:</strong> To analyze usage patterns and feedback to enhance TapTest's features and user experience.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span><strong>Communication:</strong> To respond to your feedback, support requests, and important service updates.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span><strong>Advertising:</strong> To display relevant advertisements through Google AdSense that help support the free service.</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                Information Sharing and Disclosure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">We Do Not Sell Your Data</h3>
                <p className="text-muted-foreground">
                  TapTest never sells, rents, or trades your personal information to third parties for their marketing purposes.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Third-Party Services</h3>
                <p className="text-muted-foreground">
                  We work with trusted third-party services:
                </p>
                <ul className="mt-2 space-y-1 text-muted-foreground ml-4">
                  <li>• <strong>Google OAuth:</strong> For secure account creation and login</li>
                  <li>• <strong>Google AdSense:</strong> For displaying advertisements</li>
                  <li>• <strong>EmailJS:</strong> For processing feedback submissions</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Legal Requirements</h3>
                <p className="text-muted-foreground">
                  We may disclose your information if required by law, court order, or to protect the rights, property, or safety of TapTest, our users, or others.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-600" />
                Your Rights and Choices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Account Access</h3>
                <p className="text-muted-foreground">
                  You can access, update, and manage your account information through your profile page at any time.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Data Deletion</h3>
                <p className="text-muted-foreground">
                  You can delete your test history from your profile page. If you want to delete your entire account, please contact us using the feedback form.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Data Export</h3>
                <p className="text-muted-foreground">
                  You can export your typing test data as a CSV file from your profile page to use with other applications.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Advertising Preferences</h3>
                <p className="text-muted-foreground">
                  You can control personalized ads through Google's Ad Settings at 
                  <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                    https://adssettings.google.com
                  </a>.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-gray-600" />
                Data Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational security measures to protect your personal information:
              </p>
              <ul className="space-y-2 text-muted-foreground ml-4">
                <li>• <strong>Encryption:</strong> Passwords are encrypted using industry-standard bcrypt hashing</li>
                <li>• <strong>Secure Transmission:</strong> All data is transmitted over HTTPS encryption</li>
                <li>• <strong>Access Controls:</strong> Limited access to personal data on a need-to-know basis</li>
                <li>• <strong>Regular Updates:</strong> Security measures are regularly reviewed and updated</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                While we strive to protect your information, no internet transmission is 100% secure. Please use strong passwords and keep your account information confidential.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                If you have any questions about this Privacy Policy or how we handle your data, please contact us:
              </p>
              <div className="space-y-2 text-muted-foreground">
                <p><strong>Email:</strong> taptest321@gmail.com</p>
                <p><strong>Feedback Form:</strong> Use the feedback button in the top navigation</p>
                <p><strong>Response Time:</strong> We typically respond within 24-48 hours</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2 text-yellow-700 dark:text-yellow-400">Policy Updates</h3>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. When we do, we will post the updated policy on this page and update the "Last updated" date above. 
                We encourage you to review this policy periodically to stay informed about how we protect your information.
              </p>
              <p className="text-muted-foreground mt-2">
                Continued use of TapTest after any changes indicates your acceptance of the updated Privacy Policy.
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
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;