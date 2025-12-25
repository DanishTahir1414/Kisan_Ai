import React from "react";
import { Text, TextProps, StyleSheet } from "react-native";

interface CustomTextProps extends TextProps {
  variant?: "regular" | "medium";
}

interface HeadingProps extends TextProps {
  variant?: "regular" | "bold";
}

export const CustomText: React.FC<CustomTextProps> = ({
  variant = "regular",
  style,
  ...props
}) => {
  return (
    <Text
      style={[
        styles.textBase,
        variant === "regular" ? styles.robotoRegular : styles.robotoMedium,
        style,
      ]}
      {...props}
    />
  );
};

export const Heading: React.FC<HeadingProps> = ({
  variant = "bold",
  style,
  ...props
}) => {
  return (
    <Text
      style={[
        styles.headingBase,
        variant === "regular" ? styles.latoRegular : styles.latoBold,
        style,
      ]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  textBase: {
    fontSize: 16,
    color: "#374151",
  },
  robotoRegular: {
    fontFamily: "RobotoRegular",
  },
  robotoMedium: {
    fontFamily: "RobotoMedium",
  },
  headingBase: {
    fontSize: 18,
    color: "#1F2A44",
  },
  latoRegular: {
    fontFamily: "LatoRegular",
  },
  latoBold: {
    fontFamily: "LatoBold",
  },
});
