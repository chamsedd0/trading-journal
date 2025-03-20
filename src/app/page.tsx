import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="border-b border-border">
        <div className="w-full max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-primary text-2xl font-bold">TJ</span>
            <span className="font-medium">Trading Journal</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>
      
      <main>
        <section className="py-20 px-8">
          <div className="container mx-auto max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                  Master Your Trading With Data-Driven Insights
                </h1>
                <p className="text-lg text-muted-foreground">
                  Track your trades, analyze your performance, and identify patterns to become a more consistent and profitable trader.
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <Button size="lg" asChild>
                    <Link href="/auth/signup">Get Started</Link>
                  </Button>
                  <Button variant="outline" size="lg">Learn More</Button>
                </div>
                <div className="pt-6 flex items-center gap-8">
                  <div>
                    <p className="text-3xl font-bold text-primary">100%</p>
                    <p className="text-sm text-muted-foreground">Secure Data</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-primary">50+</p>
                    <p className="text-sm text-muted-foreground">Analytics</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-primary">24/7</p>
                    <p className="text-sm text-muted-foreground">Support</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-card p-1 shadow-2xl">
                <div className="rounded-lg overflow-hidden border border-border bg-secondary/20">
                  <div className="bg-card px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="text-sm font-medium">Performance Dashboard</div>
                    <div className="flex space-x-1">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-secondary/40 p-4 rounded-lg">
                        <div className="text-xs text-muted-foreground">Win Rate</div>
                        <div className="text-2xl font-bold text-primary">64.2%</div>
                      </div>
                      <div className="bg-secondary/40 p-4 rounded-lg">
                        <div className="text-xs text-muted-foreground">Profit Factor</div>
                        <div className="text-2xl font-bold text-primary">2.3</div>
                      </div>
                      <div className="bg-secondary/40 p-4 rounded-lg">
                        <div className="text-xs text-muted-foreground">Avg Win</div>
                        <div className="text-2xl font-bold text-green-500">$145.28</div>
                      </div>
                      <div className="bg-secondary/40 p-4 rounded-lg">
                        <div className="text-xs text-muted-foreground">Avg Loss</div>
                        <div className="text-2xl font-bold text-red-500">$82.44</div>
                      </div>
                    </div>
                    <div className="bg-secondary/20 h-40 rounded-lg flex items-end p-2">
                      <div className="w-1/6 h-1/4 bg-red-500 mx-1 rounded-t-sm"></div>
                      <div className="w-1/6 h-2/3 bg-green-500 mx-1 rounded-t-sm"></div>
                      <div className="w-1/6 h-1/3 bg-green-500 mx-1 rounded-t-sm"></div>
                      <div className="w-1/6 h-1/2 bg-green-500 mx-1 rounded-t-sm"></div>
                      <div className="w-1/6 h-1/5 bg-red-500 mx-1 rounded-t-sm"></div>
                      <div className="w-1/6 h-3/4 bg-green-500 mx-1 rounded-t-sm"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <section className="py-20 bg-secondary/20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-12">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-card p-6 rounded-xl shadow-md">
                <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Detailed Analytics</h3>
                <p className="text-muted-foreground">Track your progress with in-depth metrics and visualizations to identify strengths and weaknesses.</p>
              </div>
              <div className="bg-card p-6 rounded-xl shadow-md">
                <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Import Trades</h3>
                <p className="text-muted-foreground">Easily import your trades from Excel and other platforms for seamless record keeping.</p>
              </div>
              <div className="bg-card p-6 rounded-xl shadow-md">
                <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Performance Tracking</h3>
                <p className="text-muted-foreground">Monitor your trading performance over time with comprehensive charts and metrics.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="bg-card border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <span className="text-primary text-xl font-bold">TJ</span>
                <span className="font-medium">Trading Journal</span>
              </div>
              <p className="text-sm text-muted-foreground">Track. Analyze. Improve.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              <a href="#" className="text-muted-foreground hover:text-foreground transition">Home</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition">Features</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition">Pricing</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition">Contact</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Trading Journal. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
