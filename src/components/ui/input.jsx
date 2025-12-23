
import React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      'flex h-10 w-full rounded-md border border-violet-500/20 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };
