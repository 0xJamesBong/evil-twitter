import React from "react";
import { Text as RNText, TextProps as RNTextProps } from "react-native";

export interface TextProps extends RNTextProps {
  variant?: "heading1" | "heading2" | "heading3" | "body" | "caption" | "label";
  color?:
    | "primary"
    | "secondary"
    | "tertiary"
    | "error"
    | "success"
    | "warning";
  weight?: "normal" | "medium" | "semibold" | "bold";
  align?: "left" | "center" | "right";
  className?: string;
}

/**
 * Base Text component with standardized styling options
 */
const Text: React.FC<TextProps> = ({
  variant = "body",
  color = "primary",
  weight = "normal",
  align = "left",
  className = "",
  style,
  children,
  ...props
}) => {
  // Base classes that will be applied to all text
  let baseClasses = "";

  // Variant specific classes
  const variantClasses = {
    heading1: "text-3xl",
    heading2: "text-2xl",
    heading3: "text-xl",
    body: "text-base",
    caption: "text-sm",
    label: "text-xs",
  };

  // Color classes
  const colorClasses = {
    primary: "text-white",
    secondary: "text-gray-300",
    tertiary: "text-gray-400",
    error: "text-red-500",
    success: "text-green-500",
    warning: "text-yellow-500",
  };

  // Weight classes
  const weightClasses = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  };

  // Alignment classes
  const alignClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  // Combine all classes
  const combinedClasses = [
    baseClasses,
    variantClasses[variant],
    colorClasses[color],
    weightClasses[weight],
    alignClasses[align],
    className,
  ].join(" ");

  return (
    <RNText className={combinedClasses} style={style} {...props}>
      {children}
    </RNText>
  );
};

export default Text;
