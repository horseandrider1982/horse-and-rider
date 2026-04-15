-- Fix mega menu URL for Geschenkgutschein
UPDATE cms_menu_items 
SET url = '/product/horse-rider-geschenkgutschein' 
WHERE id = '0e9e51b8-8c5d-42a1-a0ff-ae73d85071ad';

-- Add Geschenkgutschein to footer "information" menu
-- First get the menu_id for information menu
INSERT INTO cms_menu_items (label, menu_id, parent_id, sort_order, type, url, is_active)
SELECT 'Geschenkgutschein', id, NULL, 5, 'custom_link', '/product/horse-rider-geschenkgutschein', true
FROM cms_menus WHERE key = 'information';