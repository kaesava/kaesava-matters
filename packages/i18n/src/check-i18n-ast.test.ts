import { describe, it, expect } from "vitest";
import { scanHardcodedClientStrings } from "./check-i18n-ast.cjs";

describe("scanHardcodedClientStrings", () => {
  it("flags hardcoded toast method string literals", () => {
    const src = `
      toast.success("Saved successfully");
      toast.error('Failed to save');
      mobileToast.warning(\`Watch out\`);
    `;
    const issues = scanHardcodedClientStrings("sample.tsx", src);
    expect(issues).toHaveLength(3);
    expect(issues[0].line).toBe(2);
    expect(issues[1].line).toBe(3);
    expect(issues[2].line).toBe(4);
  });

  it("flags hardcoded showToast message and title literals", () => {
    const src = `
      showToast({ type: 'info', title: "Heads up", message: 'Budget updated' });
    `;
    const issues = scanHardcodedClientStrings("sample.tsx", src);
    expect(issues).toHaveLength(2);
  });

  it("flags banned native dialog calls", () => {
    const src = `
      window.alert("Hi");
      window.confirm("Are you sure?");
      Alert.alert("Error", "Something went wrong");
    `;
    const issues = scanHardcodedClientStrings("sample.tsx", src);
    expect(issues).toHaveLength(3);
  });

  it("allows localized t() toast calls and server-side TRPCError messages", () => {
    const src = `
      toast.success(t('toasts.saved'));
      showToast({ type: 'success', message: t('toasts.saved'), title: t('toasts.title') });
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required.' });
    `;
    const issues = scanHardcodedClientStrings("sample.ts", src);
    expect(issues).toHaveLength(0);
  });
});
