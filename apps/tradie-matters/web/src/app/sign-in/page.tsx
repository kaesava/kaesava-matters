import { WebSignInCard } from "@kaesava/capability-auth/web";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <WebSignInCard appName="Tradie Matters" />
    </main>
  );
}
