"use client";

import React from "react";

export interface TextLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
  external?: boolean;
}

/**
 * Canonical styled inline hyperlink primitive.
 */
export function TextLink({
  children,
  external = false,
  className = "",
  ...props
}: TextLinkProps) {
  return (
    <a
      {...props}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300 ${className}`}
    >
      {children}
    </a>
  );
}
