INSERT INTO site_settings (key, value)
VALUES ('shopify_menus', '[{"handle":"kategoriemenu","title":"kategoriemenu"},{"handle":"main-menu","title":"Hauptmenü"},{"handle":"hauptmenu-kundenkonto","title":"Hauptmenü Kundenkonto"},{"handle":"footer","title":"Fußzeilenmenü"}]')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();