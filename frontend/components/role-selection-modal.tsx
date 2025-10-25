"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, User } from "lucide-react";
import { useUser } from "@/lib/user-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export function RoleSelectionModal() {
  const { showRoleSelection, setUserRole } = useUser();

  if (!showRoleSelection) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="max-w-2xl w-full"
        >
          <Card className="border-2">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl">Welcome to ReputeFlow</CardTitle>
              <CardDescription className="text-lg mt-2">
                Choose your role to get started
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4 p-6">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => setUserRole('freelancer')}
                  className="w-full h-auto flex-col gap-4 p-8 bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                  size="lg"
                >
                  <Briefcase className="w-16 h-16" />
                  <div className="text-center">
                    <div className="text-2xl font-bold">Freelancer</div>
                    <div className="text-sm opacity-90 mt-2">
                      Find jobs, build reputation, and earn crypto
                    </div>
                  </div>
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => setUserRole('client')}
                  className="w-full h-auto flex-col gap-4 p-8 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  size="lg"
                >
                  <User className="w-16 h-16" />
                  <div className="text-center">
                    <div className="text-2xl font-bold">Client</div>
                    <div className="text-sm opacity-90 mt-2">
                      Post jobs, hire talent, and manage projects
                    </div>
                  </div>
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
