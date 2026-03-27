import { Link, type LinkProps } from "react-router-dom";
import { useI18n } from "@/i18n";

interface LocaleLinkProps extends Omit<LinkProps, "to"> {
  to: string;
}

/**
 * Locale-aware Link component.
 * Automatically prepends /{locale}/ to internal paths.
 * Admin paths and external URLs are passed through unchanged.
 */
export function LocaleLink({ to, ...props }: LocaleLinkProps) {
  const { localePath } = useI18n();

  // External URLs – pass through
  if (to.startsWith("http") || to.startsWith("mailto:") || to.startsWith("tel:")) {
    return <Link to={to} {...props} />;
  }

  return <Link to={localePath(to)} {...props} />;
}
