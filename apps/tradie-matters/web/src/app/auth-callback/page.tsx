import { WebAuthCallbackView } from "@kaesava/capability-auth/web";

export default function AuthCallbackPage() {
  return <WebAuthCallbackView defaultRedirect="/dashboard" />;
}
