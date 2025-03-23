"use client"

import { toast as sonnerToast } from "sonner"

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
  duration?: number
}

export function toast({
  title,
  description,
  variant = "default",
  duration = 3000,
  ...props
}: ToastProps) {
  return sonnerToast(title || description, {
    description: title ? description : undefined,
    className: variant === "destructive" ? "destructive" : "",
    duration,
    ...props,
  })
}

export const useToast = () => {
  return {
    toast,
    dismiss: sonnerToast.dismiss,
    error: (message: string) => 
      toast({ title: "Error", description: message, variant: "destructive" }),
    success: (message: string) => 
      toast({ title: "Success", description: message }),
  }
} 