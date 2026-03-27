import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { LocaleLink } from "@/components/LocaleLink";
import { useI18n } from "@/i18n";

const NotFound = () => {
  const location = useLocation();
  const { t } = useI18n();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">{t("notfound.title")}</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t("notfound.message")}</p>
        <LocaleLink to="/" className="text-primary underline hover:text-primary/90">
          {t("notfound.back")}
        </LocaleLink>
      </div>
    </div>
  );
};

export default NotFound;
