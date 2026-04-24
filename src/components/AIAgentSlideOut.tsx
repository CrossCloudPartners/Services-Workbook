import { useState, useRef, useEffect } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bot, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { GlobalSettings, SPWData } from '../types';

interface AIAgentSlideOutProps {
  isOpen: boolean;
  onClose: () => void;
  data: SPWData;
  updateData: (data: Partial<SPWData>) => void;
  isSidebarCollapsed: boolean;
  globalSettings: GlobalSettings;
}

export default function AIAgentSlideOut({ isOpen, onClose, data, updateData, isSidebarCollapsed, globalSettings }: AIAgentSlideOutProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'agent', content: string }[]>([
    { role: 'agent', content: 'Hello! I am your SPW Assistant. How can I help you with your project today?' }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const agentProfileImage = globalSettings.aiAgentSettings?.profileImageURL;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSendMessage = async () => {
    if (!input.trim() || isThinking) return;
    
    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsThinking(true);
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'; // Reset height
    }

    try {
      const response = await fetch('/api/chat', { // Assuming a backend endpoint is needed for secured API key
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage, data })
      });
      
      const result = await response.json();
      console.log("Client received result:", result);
      setMessages(prev => [...prev, { role: 'agent', content: result.reply }]);
      
      if (result.updates) {
        console.log("Applying updates:", result.updates);
        updateData({ ...data, ...result.updates });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { role: 'agent', content: 'Sorry, I encountered an error.' }]);
    } finally {
        setIsThinking(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            "fixed bottom-6 right-6 h-[300px] bg-white border border-gray-200 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden",
            isSidebarCollapsed ? "left-[96px]" : "left-[300px]"
          )}
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-2 font-bold text-gray-900">
              {agentProfileImage ? (
                <img src={agentProfileImage} className="w-6 h-6 rounded-full" alt="AI Agent" referrerPolicy="no-referrer" />
              ) : (
                <Bot className="w-5 h-5 text-blue-600" />
              )}
              SPW AI Assistant
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={cn("p-3 rounded-2xl text-sm max-w-[85%]", m.role === 'user' ? "bg-blue-600 text-white ml-auto" : "bg-gray-100 text-gray-900 mr-auto")}>
                {m.content}
              </div>
            ))}
            {isThinking && (
                <div className="flex gap-1 p-3 rounded-2xl text-sm bg-gray-100 text-gray-900 mr-auto w-fit">
                    <motion.div className="w-1.5 h-1.5 bg-gray-400 rounded-full" animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} />
                    <motion.div className="w-1.5 h-1.5 bg-gray-400 rounded-full" animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} />
                    <motion.div className="w-1.5 h-1.5 bg-gray-400 rounded-full" animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} />
                </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 border-t border-gray-100 flex gap-2 bg-white">
            <Textarea 
              ref={textareaRef}
              value={input} 
              onChange={handleInput} 
              placeholder="Ask me anything..." 
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                }
              }}
              className="rounded-2xl resize-none min-h-[44px] max-h-[150px] overflow-y-auto"
            />
            <Button onClick={handleSendMessage} className="rounded-full h-10 w-10 p-0 flex-shrink-0"><Send className="w-4 h-4" /></Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
