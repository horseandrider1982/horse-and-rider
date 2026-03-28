-- Delete the shopify_menu_placeholder from top_navigation
DELETE FROM cms_menu_items WHERE id = 'e1bc133a-3cee-450c-b524-1e3f80df268e';

-- Insert "Reiter" as a custom_link at sort_order 1
INSERT INTO cms_menu_items (menu_id, type, label, url, sort_order, is_active)
VALUES ('77c3910a-f9cc-4ffe-b78c-25052de9e722', 'custom_link', 'Reiter', '/collections/reiter', 1, true);