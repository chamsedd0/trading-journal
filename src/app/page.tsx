import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight, BarChart2, BookOpen, CheckCircle2, ChevronRight, LineChart, LucideIcon, PieChart, ScrollText, Shield, Star, TrendingUp, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

function FeatureCard({ title, description, icon: Icon }: FeatureCardProps) {
  return (
    <div className="bg-card p-6 rounded-xl shadow-md hover:shadow-lg transition-all">
      <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-semibold mb-2 text-center">{title}</h3>
      <p className="text-muted-foreground text-center">{description}</p>
    </div>
  );
}

interface PricingTierProps {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

function PricingTier({ name, price, description, features, highlighted }: PricingTierProps) {
  return (
    <div className={cn(
      "relative bg-card rounded-xl p-6 shadow-md",
      highlighted && "border-2 border-primary"
    )}>
      {highlighted && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="default">
          Most Popular
        </Badge>
      )}
      <h3 className="text-xl font-semibold mb-2">{name}</h3>
      <div className="mb-4">
        <span className="text-3xl font-bold">{price}</span>
        {price !== "Free" && <span className="text-muted-foreground">/month</span>}
      </div>
      <p className="text-muted-foreground mb-6">{description}</p>
      <ul className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button className="w-full" variant={highlighted ? "default" : "outline"}>
        Get Started <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

export default function Home() {
  return (
    <div className="bg-background text-foreground">
      <header className="border-b border-border sticky top-0 bg-background/80 backdrop-blur-sm z-50">
        <div className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-primary text-2xl font-bold">TJ</span>
            <span className="font-medium">Trading Journal</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition">Features</a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition">How it Works</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition">Pricing</a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition">Testimonials</a>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>
      
      <main>
        {/* Hero Section */}
        <section className="pt-28 pb-32 px-6 relative overflow-hidden min-h-[90vh] flex items-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
          <div className="absolute inset-0 bg-grid-white/[0.02]" />
          <div className="container mx-auto max-w-7xl relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  <span className="text-sm font-medium">Live Demo Available</span>
                </div>
                <h1 className="text-5xl md:text-4xl xl:text-6xl font-bold leading-tight tracking-tight">
                  Master Your Trades with
                  <span className="text-primary block mt-2">Data-Driven Precision</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl">
                  Transform your trading journey with advanced analytics, real-time insights, and professional-grade tools used by top traders worldwide.
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <Button size="lg" className="h-12 px-6 text-sm" asChild>
                    <Link href="/auth/signup">
                      Start Trading Free <ChevronRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="h-12 px-6 text-sm">
                    View Live Demo
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-8 pt-8">
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-primary">10K+</span>
                      <span className="text-primary">↑</span>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">Active Traders</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-primary">1M+</span>
                      <span className="text-primary">↑</span>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">Trades Analyzed</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-primary">99.9%</span>
                      <span className="text-primary">↑</span>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">Platform Uptime</p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-primary/30 rounded-xl blur opacity-30"></div>
                <div className="relative rounded-xl bg-card p-1 shadow-2xl">
                  <div className="rounded-lg overflow-hidden border border-border/50 bg-black/20 backdrop-blur-sm">
                    <div className="bg-card/95 px-4 py-3 border-b border-border/50 flex items-center justify-between backdrop-blur-sm">
                      <div className="text-sm font-medium">Performance Analytics</div>
                    <div className="flex space-x-1">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                  </div>
                    <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/20 p-4 rounded-lg backdrop-blur-sm">
                          <div className="text-xs text-muted-foreground font-medium">Win Rate</div>
                          <div className="text-2xl font-bold text-primary mt-1">68.5%</div>
                          <div className="text-xs text-green-500 flex items-center gap-1 mt-1">
                            <TrendingUp className="w-3 h-3" /> +2.3%
                          </div>
                        </div>
                        <div className="bg-black/20 p-4 rounded-lg backdrop-blur-sm">
                          <div className="text-xs text-muted-foreground font-medium">Profit Factor</div>
                          <div className="text-2xl font-bold text-primary mt-1">2.8</div>
                          <div className="text-xs text-green-500 flex items-center gap-1 mt-1">
                            <TrendingUp className="w-3 h-3" /> +0.3
                          </div>
                        </div>
                      </div>
                      <div className="bg-black/20 h-48 rounded-lg backdrop-blur-sm p-4">
                        <div className="h-full flex items-end justify-around">
                          {[40, 65, 45, 80, 55, 70].map((height, i) => (
                            <div
                              key={i}
                              className={`w-8 rounded-t-lg transition-all duration-500 ${height > 50 ? 'bg-green-500' : 'bg-red-500'}`}
                              style={{ height: `${height}%` }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-black/20 p-4 rounded-lg backdrop-blur-sm">
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-sm font-medium">Total Balance</div>
                            <div className="text-2xl font-bold text-primary">$124,567.89</div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-muted-foreground">Main Account</span>
                              </div>
                              <span>$75,234.56</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <span className="text-muted-foreground">Prop Firm Account</span>
                              </div>
                              <span>$42,123.45</span>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">24h Change</span>
                              <span className="text-green-500">+$1,234.56 (0.99%)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-secondary/20">
          <div className="container mx-auto px-6 max-w-7xl">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge variant="secondary" className="mb-4">Features</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Tools for Serious Traders</h2>
              <p className="text-lg text-muted-foreground">
                Everything you need to analyze, improve, and master your trading strategy
              </p>
            </div>

            {/* Main Feature */}
            <div className="mb-16 bg-card rounded-2xl overflow-hidden shadow-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 items-center">
                <div className="p-8 md:p-12 space-y-6">
                  <Badge variant="default">Featured</Badge>
                  <h3 className="text-2xl md:text-3xl font-bold">Trade Analytics Dashboard</h3>
                  <p className="text-muted-foreground text-lg">
                    Get a comprehensive view of your trading performance with our advanced analytics dashboard.
                    Track your win rate, profit factor, average gains, and more in real-time.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span>Real-time performance metrics</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span>Advanced charting and visualization</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span>Custom reporting and insights</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-secondary/30 p-8 md:p-12 h-full">
                  <div className="bg-card rounded-lg p-4 shadow-md">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-secondary/40 p-4 rounded-lg">
                        <div className="text-sm font-medium mb-1">Win Rate</div>
                        <div className="text-2xl font-bold text-primary">68.5%</div>
                        <div className="text-xs text-green-500">↑ 2.3%</div>
                      </div>
                      <div className="bg-secondary/40 p-4 rounded-lg">
                        <div className="text-sm font-medium mb-1">Profit Factor</div>
                        <div className="text-2xl font-bold text-primary">2.8</div>
                        <div className="text-xs text-green-500">↑ 0.3</div>
                      </div>
                    </div>
                    <div className="h-32 bg-secondary/20 rounded-lg flex items-end justify-around p-2">
                      {[40, 65, 45, 80, 55, 70].map((height, i) => (
                        <div
                          key={i}
                          className={`w-1/6 rounded-t ${height > 50 ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-card p-8 rounded-xl shadow-md">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                  <ScrollText className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Smart Trade Journal</h3>
                <p className="text-muted-foreground mb-6">
                  Record every detail of your trades with our intelligent journaling system.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>Screenshot annotations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>Emotion and mindset tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>Trade replay and analysis</span>
                  </li>
                </ul>
              </div>

              <div className="bg-card p-8 rounded-xl shadow-md">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Risk Management</h3>
                <p className="text-muted-foreground mb-6">
                  Stay protected with advanced risk management tools and real-time alerts.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>Position size calculator</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>Daily loss limits</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>Risk exposure alerts</span>
                  </li>
                </ul>
              </div>

              <div className="bg-card p-8 rounded-xl shadow-md">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-4">AI-Powered Insights</h3>
                <p className="text-muted-foreground mb-6">
                  Let our AI analyze your trades and provide actionable insights.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>Pattern recognition</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>Performance predictions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>Market sentiment analysis</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Additional Features List */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">Multi-broker Support</span>
                  <p className="text-muted-foreground">Connect and sync with major trading platforms</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">Trade Statistics</span>
                  <p className="text-muted-foreground">Detailed metrics for every aspect of your trading</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">Market Analysis</span>
                  <p className="text-muted-foreground">Real-time news and market sentiment tracking</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">Trading Plan Builder</span>
                  <p className="text-muted-foreground">Create and track your trading strategies</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">Mobile App</span>
                  <p className="text-muted-foreground">Track your trades on the go with our mobile app</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">Data Export</span>
                  <p className="text-muted-foreground">Export your data in multiple formats</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* How It Works Section */}
        <section id="how-it-works" className="py-24">
          <div className="container mx-auto px-6 max-w-7xl">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge variant="secondary" className="mb-4">How It Works</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Start Improving Your Trading Today</h2>
              <p className="text-lg text-muted-foreground">
                Get started in minutes and begin your journey to better trading.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-4">Create Your Account</h3>
                <p className="text-muted-foreground">
                  Sign up for free and set up your trading accounts, whether they're real, demo, or prop firm accounts.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-4">Log Your Trades</h3>
                <p className="text-muted-foreground">
                  Record your trades manually or import them automatically from your supported brokers.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-4">Analyze & Improve</h3>
                <p className="text-muted-foreground">
                  Review your performance metrics, identify patterns, and make data-driven improvements.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 bg-secondary/20">
          <div className="container mx-auto px-6 max-w-7xl">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge variant="secondary" className="mb-4">Pricing</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
              <p className="text-lg text-muted-foreground">
                Choose the plan that best fits your trading needs. All plans include our core features.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <PricingTier
                name="Basic"
                price="Free"
                description="Perfect for getting started with trade journaling"
                features={[
                  "Unlimited trading accounts",
                  "Basic performance metrics",
                  "Manual trade logging",
                  "Trade history",
                  "Basic charts and analytics",
                  "Community support",
                  "Includes ads"
                ]}
              />
              <PricingTier
                name="Plus"
                price="$0.99"
                description="Ad-free experience with enhanced features"
                features={[
                  "Everything in Basic",
                  "Ad-free experience",
                  "Dark mode",
                  "Custom tags and categories",
                  "Advanced charts",
                  "Export data",
                  "Email support"
                ]}
                highlighted
              />
              <PricingTier
                name="Pro"
                price="$4.99"
                description="AI-powered trading insights and analysis"
                features={[
                  "Everything in Plus",
                  "AI trade analysis",
                  "Performance predictions",
                  "Trade replay system",
                  "Real-time news analysis",
                  "Smart alerts & notifications",
                  "Priority support"
                ]}
              />
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-24">
          <div className="container mx-auto px-6 max-w-7xl">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge variant="secondary" className="mb-4">Testimonials</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Trusted by Traders Worldwide</h2>
              <p className="text-lg text-muted-foreground">
                See what other traders are saying about our platform.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">John Smith</p>
                    <p className="text-sm text-muted-foreground">Forex Trader</p>
                  </div>
                </div>
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-muted-foreground">
                  "This journal has completely transformed how I track and analyze my trades. 
                  The insights I've gained have helped me become more consistent and profitable."
                </p>
              </Card>
              <Card className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Sarah Johnson</p>
                    <p className="text-sm text-muted-foreground">Crypto Trader</p>
                  </div>
                </div>
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-muted-foreground">
                  "The automated trade importing and advanced analytics have saved me hours of work. 
                  I can focus on trading while the platform handles the tracking."
                </p>
              </Card>
              <Card className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Mike Chen</p>
                    <p className="text-sm text-muted-foreground">Futures Trader</p>
                  </div>
                </div>
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-muted-foreground">
                  "The risk management features have been a game-changer. 
                  I'm now much more disciplined with my trading and my results show it."
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-primary/5">
          <div className="container mx-auto px-6 max-w-7xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Transform Your Trading?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of traders who are already using our platform to improve their trading performance.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/auth/signup">
                  Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline">Schedule a Demo</Button>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="bg-card border-t border-border py-12">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-primary text-2xl font-bold">TJ</span>
                <span className="font-medium">Trading Journal</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Your complete solution for trade tracking and analysis.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-muted-foreground hover:text-primary">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                  </svg>
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"></path>
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Features</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Pricing</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Changelog</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground">About</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Blog</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Careers</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Privacy</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Terms</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Security</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Trading Journal. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
