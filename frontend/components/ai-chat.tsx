"use client";

import Image from "next/image";
import { useState } from "react";
import { useAccount } from "wagmi";
import {
  CopyIcon,
  RefreshCcwIcon,
  ShareIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  SendIcon,
  BotIcon,
  UserIcon,
} from "lucide-react";

import { Action, Actions } from "@/components/ui/actions";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ui/conversation";
import { Message, MessageContent } from "@/components/ui/message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/lib/user-context";

interface ChatMessage {
  id: string;
  from: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Function to format message content with clickable links
function formatMessageContent(content: string) {
  // URL regex pattern
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  
  // Split content by newlines to preserve formatting
  const lines = content.split('\n');
  
  return (
    <div className="space-y-2">
      {lines.map((line, lineIndex) => {
        // Check if line contains a URL
        const parts = line.split(urlPattern);
        
        return (
          <div key={lineIndex} className="whitespace-pre-wrap">
            {parts.map((part, partIndex) => {
              // Check if this part is a URL
              if (urlPattern.test(part)) {
                return (
                  <a
                    key={partIndex}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 underline break-all"
                  >
                    {part}
                  </a>
                );
              }
              return <span key={partIndex}>{part}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
}

export function AIChat() {
  const { address } = useAccount();
  const { userRole } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      from: "assistant",
      content: `Hello! I'm your AI assistant for ReputeFlow. I can help you with:\n\n• Finding the perfect ${userRole === 'freelancer' ? 'jobs' : 'freelancers'}\n• Managing your projects and payments\n• Understanding your reputation score\n• Navigating the platform\n\nHow can I assist you today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const actions = [
    {
      icon: RefreshCcwIcon,
      label: "Retry",
      onClick: () => console.log("Retry"),
    },
    {
      icon: ThumbsUpIcon,
      label: "Like",
      onClick: () => console.log("Like"),
    },
    {
      icon: ThumbsDownIcon,
      label: "Dislike",
      onClick: () => console.log("Dislike"),
    },
    {
      icon: CopyIcon,
      label: "Copy",
      onClick: (content: string) => navigator.clipboard.writeText(content),
    },
    {
      icon: ShareIcon,
      label: "Share",
      onClick: () => console.log("Share"),
    },
  ];

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      from: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    // Add a temporary loading message
    const loadingMessageId = (Date.now() + 1).toString();
    const loadingMessage: ChatMessage = {
      id: loadingMessageId,
      from: "assistant",
      content: "🔍 Processing your request...",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      // Call the API to communicate with the agent
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          userRole: userRole,
          walletAddress: address,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from agent');
      }

      const data = await response.json();
      
      // Replace loading message with actual response
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === loadingMessageId 
            ? { ...msg, content: data.response, timestamp: new Date() }
            : msg
        )
      );
      
      // Log agent info
      if (data.source === 'agentverse_hosted') {
        console.log('✅ Response from Agentverse-hosted agent!');
        console.log('🤖 Agent:', data.agentInfo?.name);
        console.log('📡 Endpoint:', data.endpoint);
        console.log('📊 Agent type:', data.agentInfo?.type);
        console.log('🟢 Status:', data.agentInfo?.status);
      } else if (data.source === 'agent_endpoint') {
        console.log('✅ Direct response from agent endpoint!');
        console.log('🤖 Agent address:', data.targetAgent);
        console.log('📡 Endpoint:', data.endpoint);
      } else if (data.source === 'intelligent_fallback') {
        console.log('✅ Intelligent response generated');
        console.log('🤖 Target agent:', data.targetAgent);
        if (data.note) {
          console.log('ℹ️ Note:', data.note);
        }
      } else if (data.source === 'agentverse_session') {
        console.log('✅ Response from Agentverse session:', data.sessionId);
        console.log('🤖 Agent address:', data.agentAddress);
        if (data.rawData) {
          console.log('📊 Raw response data:', data.rawData);
        }
      } else if (data.source === 'asi_one_agent' || data.source === 'asi_one') {
        console.log('✅ Response from ASI:One LLM via agent:', data.agentAddress);
        console.log('📊 Model used:', data.model);
        if (data.usage) {
          console.log('📈 Token usage:', data.usage);
        }
      } else if (data.source === 'agent') {
        console.log('✅ Response from agent:', data.agentAddress);
      } else {
        console.log('⚠️ Fallback response used:', data.reason || 'unknown');
        if (data.errorDetails) {
          console.error('Error details:', data.errorDetails);
        }
      }
      
    } catch (error) {
      console.error('Chat error:', error);
      
      // Show error message to user
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        from: "assistant",
        content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment. 🔄",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center p-4 pt-20">
      <Card className="flex h-full max-h-[800px] w-full max-w-4xl flex-col">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                <BotIcon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">ReputeFlow AI Assistant</h2>
                <p className="text-sm text-muted-foreground">
                  {userRole === 'freelancer' ? '🎯 Freelancer Agent' : '💼 Client Agent'} • Powered by ASI Alliance
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {userRole === 'freelancer' ? 'Freelancer Mode' : 'Client Mode'}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                </span>
                Online
              </Badge>
            </div>
          </div>
        </div>

        {/* Messages */}
        <Conversation className="flex-1">
          <ConversationContent className="space-y-4">
            {messages.map((message) => (
              <Message
                className={`flex gap-3 ${message.from === "assistant" ? "items-start" : "items-end flex-row-reverse"}`}
                from={message.from}
                key={message.id}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  {message.from === "assistant" ? (
                    <BotIcon className="h-4 w-4" />
                  ) : (
                    <UserIcon className="h-4 w-4" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <MessageContent className={message.from === "user" ? "bg-primary text-primary-foreground" : ""}>
                    {formatMessageContent(message.content)}
                  </MessageContent>
                  {message.from === "assistant" && (
                    <Actions className="mt-1">
                      {actions.map((action) => (
                        <Action
                          key={action.label}
                          label={action.label}
                          onClick={() => action.onClick(message.content)}
                        >
                          <action.icon className="size-4" />
                        </Action>
                      ))}
                    </Actions>
                  )}
                </div>
              </Message>
            ))}
            {isLoading && (
              <Message from="assistant" className="flex gap-3 items-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <BotIcon className="h-4 w-4 animate-pulse" />
                </div>
                <MessageContent>
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.3s]"></span>
                    <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.15s]"></span>
                    <span className="h-2 w-2 animate-bounce rounded-full bg-current"></span>
                  </div>
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ask about ${userRole === 'freelancer' ? 'finding jobs, building reputation' : 'hiring talent, managing projects'}...`}
              className="min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-[60px] w-[60px] shrink-0"
            >
              <SendIcon className="h-5 w-5" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Connected as: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected"}
          </p>
        </div>
      </Card>
    </div>
  );
}

