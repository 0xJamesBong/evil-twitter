import React from "react";
import { View as RNView, ViewProps as RNViewProps } from "react-native";

export interface ViewProps extends RNViewProps {
  backgroundColor?: "primary" | "secondary" | "tertiary" | "transparent";
  padding?: "none" | "xs" | "sm" | "md" | "lg" | "xl";
  margin?: "none" | "xs" | "sm" | "md" | "lg" | "xl";
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "full";
  border?: boolean;
  borderColor?: "light" | "default" | "dark";
  shadow?: "none" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

/**
 * Base View component with standardized styling options
 */
const View: React.FC<ViewProps> = ({
  backgroundColor = "transparent",
  padding = "none",
  margin = "none",
  rounded = "none",
  border = false,
  borderColor = "default",
  shadow = "none",
  className = "",
  style,
  children,
  ...props
}) => {
  // Background color classes
  const backgroundClasses = {
    primary: "bg-black",
    secondary: "bg-gray-900",
    tertiary: "bg-gray-800",
    transparent: "bg-transparent",
  };

  // Padding classes
  const paddingClasses = {
    none: "",
    xs: "p-1",
    sm: "p-2",
    md: "p-4",
    lg: "p-6",
    xl: "p-8",
  };

  // Margin classes
  const marginClasses = {
    none: "",
    xs: "m-1",
    sm: "m-2",
    md: "m-4",
    lg: "m-6",
    xl: "m-8",
  };

  // Border radius classes
  const roundedClasses = {
    none: "",
    sm: "rounded-sm",
    md: "rounded",
    lg: "rounded-lg",
    xl: "rounded-xl",
    full: "rounded-full",
  };

  // Border classes
  const borderClasses = border ? "border" : "";

  // Border color classes
  const borderColorClasses = {
    light: "border-gray-700",
    default: "border-gray-800",
    dark: "border-gray-900",
  };

  // Shadow classes
  const shadowClasses = {
    none: "",
    sm: "shadow-sm",
    md: "shadow",
    lg: "shadow-lg",
    xl: "shadow-xl",
  };

  // Combine all classes
  const combinedClasses = [
    backgroundClasses[backgroundColor],
    paddingClasses[padding],
    marginClasses[margin],
    roundedClasses[rounded],
    borderClasses,
    border ? borderColorClasses[borderColor] : "",
    shadowClasses[shadow],
    className,
  ].join(" ");

  return (
    <RNView className={combinedClasses} style={style} {...props}>
      {children}
    </RNView>
  );
};

export default View;
