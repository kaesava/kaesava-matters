import { Stack } from 'expo-router';
import { DESIGN_TOKENS } from '@kaesava/ui/mobile';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: DESIGN_TOKENS.colors.background },
        animation: 'fade',
      }}
    />
  );
}
