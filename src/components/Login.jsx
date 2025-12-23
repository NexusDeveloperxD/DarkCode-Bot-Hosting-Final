
import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { motion } from 'framer-motion';
import { Bot, Mail, Lock, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';

const Login = () => {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (!error) {
          navigate('/');
        }
      } else {
        // Sign up with metadata
        const { data, error } = await signUp(email, password, {
          data: {
            full_name: fullName,
          }
        });
        
        if (!error) {
          // Check if session exists (auto-login) or if email confirmation is required
          if (data?.session) {
            toast({
              title: "Welcome!",
              description: "Account created and logged in successfully.",
            });
            navigate('/');
          } else {
            toast({
              title: "Account created successfully!",
              description: "Please check your email to verify your account before logging in.",
            });
            setIsLogin(true);
            // Reset form
            setEmail('');
            setPassword('');
            setFullName('');
          }
        }
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: error.message || "An unexpected error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[#1a1a2e]/60 backdrop-blur-xl border border-violet-500/20 p-8 rounded-2xl shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/50 mb-4">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-gray-400 text-sm mt-2 text-center">
            DarkCode Bot Hosting - Professional Solutions
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2"
            >
              <label className="text-sm font-medium text-gray-300 ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-black/20 border border-violet-500/20 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all"
                  placeholder="John Doe"
                  required={!isLogin}
                />
              </div>
            </motion.div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/20 border border-violet-500/20 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all"
                placeholder="name@example.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/20 border border-violet-500/20 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-medium py-2.5 rounded-lg shadow-lg shadow-violet-500/25 transition-all"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Sign Up')}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="text-sm text-gray-400">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setFullName('');
              setEmail('');
              setPassword('');
            }}
            className="text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
