import React from 'react';
import { Github, Twitter, Globe, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';

const Footer = () => {
  const handleLinkClick = (link) => {
    toast({
      title: "🚧 Coming Soon",
      description: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  return (
    <footer className="ml-64 mt-16 border-t border-violet-500/20 bg-[#0a0a0f]/60 backdrop-blur-xl">
      <div className="px-8 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">
              © 2025 Dark Code Bot Hosting. All rights reserved.
            </span>
          </div>

          <div className="flex items-center gap-6">
            <motion.button
              onClick={() => handleLinkClick('privacy')}
              className="text-sm text-gray-400 hover:text-violet-400 transition-colors"
              whileHover={{ y: -2 }}
            >
              Privacy Policy
            </motion.button>
            <motion.button
              onClick={() => handleLinkClick('terms')}
              className="text-sm text-gray-400 hover:text-violet-400 transition-colors"
              whileHover={{ y: -2 }}
            >
              Terms of Service
            </motion.button>
            <motion.button
              onClick={() => handleLinkClick('docs')}
              className="text-sm text-gray-400 hover:text-violet-400 transition-colors"
              whileHover={{ y: -2 }}
            >
              Documentation
            </motion.button>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              onClick={() => handleLinkClick('github')}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.9 }}
            >
              <Github className="w-4 h-4 text-gray-400" />
            </motion.button>
            <motion.button
              onClick={() => handleLinkClick('twitter')}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.9 }}
            >
              <Twitter className="w-4 h-4 text-gray-400" />
            </motion.button>
            <motion.button
              onClick={() => handleLinkClick('website')}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.9 }}
            >
              <Globe className="w-4 h-4 text-gray-400" />
            </motion.button>
            <motion.button
              onClick={() => handleLinkClick('contact')}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.9 }}
            >
              <Mail className="w-4 h-4 text-gray-400" />
            </motion.button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;