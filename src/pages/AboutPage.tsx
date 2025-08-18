import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, Users, Zap, Brain, Trophy, Heart, Code, Mail } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Logo from '@/components/Logo';

const AboutPage: React.FC = () => {
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
            <div className="flex items-center justify-center mb-6">
              <Logo size="large" showTagline={true} clickable={false} />
            </div>
            <h1 className="text-4xl font-bold mb-4">About TapTest</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A modern, interactive typing speed test application designed to help you improve your typing skills 
              with beautiful 3D graphics and comprehensive progress tracking.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-6 h-6 text-green-600" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                TapTest was created to provide a modern, engaging, and comprehensive typing practice experience. 
                In today's digital world, typing speed and accuracy are essential skills that can significantly 
                impact productivity and professional success. We believe that learning to type faster should be 
                fun, interactive, and rewarding.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-6 h-6 text-yellow-600" />
                What Makes TapTest Special
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Code className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Interactive 3D Graphics</h3>
                    <p className="text-sm text-muted-foreground">
                      Beautiful 3D keyboard animations that respond to your interactions
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Progress Tracking</h3>
                    <p className="text-sm text-muted-foreground">
                      Comprehensive analytics to track your improvement over time
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Multiple Difficulty Levels</h3>
                    <p className="text-sm text-muted-foreground">
                      From simple words to complex technical vocabulary
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Real-time Feedback</h3>
                    <p className="text-sm text-muted-foreground">
                      Instant WPM, accuracy, and visual feedback as you type
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                Who Benefits from TapTest
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3 text-blue-600">Students & Professionals</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Improve productivity for school and work</li>
                    <li>• Build confidence in digital communication</li>
                    <li>• Prepare for typing-intensive careers</li>
                    <li>• Track progress with detailed analytics</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-3 text-green-600">Educational Institutions</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Assess student typing proficiency</li>
                    <li>• Provide engaging skill development tool</li>
                    <li>• Monitor student progress over time</li>
                    <li>• Support digital literacy programs</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-6 h-6 text-purple-600" />
                Technology & Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                TapTest is built with modern web technologies to provide a smooth, responsive, and accessible experience:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border border-border rounded-lg">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Code className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="font-semibold mb-2">Modern Frontend</h4>
                  <p className="text-sm text-muted-foreground">React, TypeScript, and Three.js for 3D graphics</p>
                </div>
                <div className="text-center p-4 border border-border rounded-lg">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="font-semibold mb-2">Secure Backend</h4>
                  <p className="text-sm text-muted-foreground">Node.js with JWT authentication and data encryption</p>
                </div>
                <div className="text-center p-4 border border-border rounded-lg">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <h4 className="font-semibold mb-2">User-Centered</h4>
                  <p className="text-sm text-muted-foreground">Accessible design with mobile optimization</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-6 h-6 text-red-600" />
                Our Commitment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Privacy & Security</h3>
                <p className="text-muted-foreground">
                  Your data privacy is our priority. We use industry-standard encryption and never sell your personal information. 
                  Read our <button onClick={() => navigate('/privacy')} className="text-blue-600 hover:underline">Privacy Policy</button> for details.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Accessibility</h3>
                <p className="text-muted-foreground">
                  TapTest is designed to be accessible to all users, including those using screen readers and assistive technologies. 
                  We follow WCAG guidelines to ensure inclusive design.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Continuous Improvement</h3>
                <p className="text-muted-foreground">
                  We regularly update TapTest based on user feedback and technological advances. Your suggestions help us 
                  make the platform better for everyone.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-600" />
                Key Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-4 border border-border rounded-lg">
                  <div className="text-2xl font-bold text-green-600 mb-1">3</div>
                  <div className="text-sm text-muted-foreground">Difficulty Levels</div>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 mb-1">5+</div>
                  <div className="text-sm text-muted-foreground">Test Durations</div>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 mb-1">100%</div>
                  <div className="text-sm text-muted-foreground">Free to Use</div>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600 mb-1">24/7</div>
                  <div className="text-sm text-muted-foreground">Available</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-6 h-6 text-blue-600" />
                Get in Touch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                We love hearing from our users! Whether you have feedback, suggestions, or just want to share your 
                typing achievements, don't hesitate to reach out.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // Trigger the feedback modal from navbar
                    const feedbackButton = document.querySelector('[aria-label="Send feedback"]') as HTMLButtonElement;
                    if (feedbackButton) {
                      feedbackButton.click();
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Send Feedback
                </Button>
                <div className="text-muted-foreground text-sm">
                  <p><strong>Email:</strong> gamerabhi950@gmail.com</p>
                  <p><strong>Response Time:</strong> Usually within 24-48 hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12 pt-8 border-t border-border">
          <h2 className="text-2xl font-bold mb-4">Ready to Improve Your Typing?</h2>
          <p className="text-muted-foreground mb-6">
            Start your typing journey today and see how much you can improve!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => navigate('/')} size="lg" className="px-8">
              Start Typing Test
            </Button>
            <Button onClick={() => navigate('/register')} variant="outline" size="lg" className="px-8">
              Create Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;