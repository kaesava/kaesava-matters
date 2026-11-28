import React from "react";
import { Stack } from "expo-router";
import { DESIGN_TOKENS } from "@kaesava/ui/mobile";

export default function SetupLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: DESIGN_TOKENS.colors.background },
        animation: "slide_from_right",
        gestureEnabled: false,
      }}
    />
  );
}
